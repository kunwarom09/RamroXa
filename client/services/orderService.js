import { loadDB, saveDB, offsetDate } from './dataStore';

export function getOrders() {
  const db = loadDB();
  return db.orders || [];
}

export function createOrder(orderData) {
  const db = loadDB();
  const newOrder = {
    no: orderData.no || ("ZY-" + Math.floor(100000 + Math.random() * 899999)),
    customer: orderData.customer || orderData.name || "Customer",
    phone: orderData.phone || "",
    date: offsetDate(0),
    total: orderData.total || 0,
    pay: orderData.method || orderData.pay || "COD",
    status: "pending"
  };
  db.orders = [newOrder, ...(db.orders || [])];
  saveDB(db);
  return newOrder;
}

export function updateOrderStatus(orderNo, status) {
  const db = loadDB();
  const order = (db.orders || []).find(o => o.no === orderNo);
  if (order) {
    order.status = status;
    saveDB(db);
  }
  return order;
}
