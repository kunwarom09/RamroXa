import { SalesReturn, Order, Inventory, StockMove, Variant } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

export async function listSalesReturns(query = {}) {
  const filter = {};
  if (query.status) {
    filter.status = query.status;
  }
  if (query.q || query.search) {
    const term = query.q || query.search;
    filter.$or = [
      { no: { $regex: term, $options: 'i' } },
      { invoice: { $regex: term, $options: 'i' } },
      { orderNo: { $regex: term, $options: 'i' } },
      { customer: { $regex: term, $options: 'i' } }
    ];
  }

  const returns = await SalesReturn.find(filter).sort({ createdAt: -1 }).lean();
  return { returns, count: returns.length };
}

export async function createSalesReturn(data = {}, user = null) {
  if (!data.customer && !data.saleId && !data.invoice) {
    throw ApiError.badRequest('Customer name or order invoice is required.');
  }

  const count = await SalesReturn.countDocuments();
  const nextNo = `RET-${1000 + count + 1}`;
  const retId = 'ret_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const refundAmount = Number(data.refundAmount) || 0;
  const vatRate = 13;
  const refundNet = data.refundNet !== undefined ? Number(data.refundNet) : Math.round(refundAmount / (1 + vatRate / 100));
  const refundVat = data.refundVat !== undefined ? Number(data.refundVat) : (refundAmount - refundNet);

  const items = Array.isArray(data.items) ? data.items : [];
  const warehouseId = data.warehouseId || 'w1';

  const newReturn = await SalesReturn.create({
    id: retId,
    no: data.no || nextNo,
    saleId: data.saleId || '',
    orderNo: data.orderNo || data.invoice || '',
    invoice: data.invoice || '',
    customer: data.customer || 'Customer',
    customerPhone: data.customerPhone || '',
    date: data.date || new Date().toISOString().slice(0, 10),
    type: data.type || 'full',
    reason: data.reason || 'Customer return',
    restock: data.restock || 'available',
    warehouseId,
    items,
    refundNet,
    refundVat,
    refundAmount,
    status: data.status || 'pending',
    notes: data.notes || '',
    attachments: Array.isArray(data.attachments) ? data.attachments : []
  });

  // Restock inventory into warehouse if requested
  if (data.restock === 'available' && items.length > 0) {
    for (const item of items) {
      const returnQty = Number(item.returnQty) || 0;
      if (returnQty <= 0) continue;

      let targetVariant = null;
      if (item.sku) {
        targetVariant = await Variant.findOne({ sku: item.sku });
      }
      if (!targetVariant && item.variantId) {
        targetVariant = await Variant.findOne({ id: item.variantId });
      }

      if (targetVariant) {
        const vId = targetVariant.id;
        const inv = await Inventory.findOne({ variantId: vId, warehouseId });
        const beforeQty = inv ? (inv.available || 0) : 0;
        const afterQty = beforeQty + returnQty;

        if (inv) {
          inv.available = afterQty;
          await inv.save();
        } else {
          await Inventory.create({
            id: `inv_${vId}_${warehouseId}`,
            variantId: vId,
            warehouseId,
            available: afterQty,
            reserved: 0
          });
        }

        await StockMove.create({
          id: 'sm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          variantId: vId,
          warehouseId,
          type: 'in',
          change: returnQty,
          before: beforeQty,
          after: afterQty,
          reason: `Customer return: ${newReturn.no} (${data.reason || 'Restocked'})`,
          reference: newReturn.no
        });
      }
    }
  }

  // If linked to an order, update order return status
  if (data.orderNo || data.saleId) {
    const order = await Order.findOne({
      $or: [
        { orderNo: data.orderNo },
        { id: data.saleId },
        { orderNo: data.invoice }
      ].filter(Boolean)
    });

    if (order) {
      if (data.type === 'full') {
        order.fulfillmentStatus = 'returned';
        order.paymentStatus = 'refunded';
      }
      order.statusHistory.push({
        status: `Return requested: ${newReturn.no}`,
        by: user?.email || 'admin',
        note: `Reason: ${data.reason || 'Customer return'}, Amount: Rs ${refundAmount}`
      });
      await order.save();
    }
  }

  return newReturn;
}

export async function updateSalesReturnStatus(id, { status, notes }) {
  const ret = await SalesReturn.findOne({ $or: [{ id }, { _id: id }] });
  if (!ret) {
    throw ApiError.notFound('Sales return record not found.');
  }

  if (status) ret.status = status;
  if (notes !== undefined) ret.notes = notes;
  await ret.save();

  return ret;
}

export async function deleteSalesReturn(id) {
  const ret = await SalesReturn.findOneAndDelete({ $or: [{ id }, { _id: id }] });
  if (!ret) {
    throw ApiError.notFound('Sales return record not found.');
  }
  return { message: 'Sales return record deleted successfully.' };
}

export default {
  listSalesReturns,
  createSalesReturn,
  updateSalesReturnStatus,
  deleteSalesReturn
};
