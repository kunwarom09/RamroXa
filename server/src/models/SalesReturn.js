import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    desc: { type: String, default: '' },
    rate: { type: Number, default: 0 },
    bought: { type: Number, default: 1 },
    returned: { type: Number, default: 0 },
    returnQty: { type: Number, default: 1 },
    variantId: { type: String, default: '' }
  },
  { _id: false }
);

const salesReturnSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    no: { type: String, required: true, unique: true, uppercase: true, index: true },
    saleId: { type: String, default: '' },
    orderNo: { type: String, default: '', index: true },
    invoice: { type: String, default: '' },
    customer: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    type: { type: String, enum: ['full', 'item', 'quantity', 'custom'], default: 'full' },
    reason: { type: String, required: true },
    restock: { type: String, enum: ['available', 'damaged', 'none'], default: 'available' },
    warehouseId: { type: String, default: 'w1' },
    items: [returnItemSchema],
    refundNet: { type: Number, default: 0 },
    refundVat: { type: Number, default: 0 },
    refundAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'inspected', 'approved', 'refunded', 'rejected', 'completed'],
      default: 'pending',
      index: true
    },
    notes: { type: String, default: '' },
    attachments: [
      {
        name: { type: String },
        data: { type: String },
        type: { type: String }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        if (!ret.id && ret._id) ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);

salesReturnSchema.index({ createdAt: -1 });

export const SalesReturn = mongoose.models.SalesReturn || mongoose.model('SalesReturn', salesReturnSchema);
export default SalesReturn;
