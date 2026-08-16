import mongoose from 'mongoose';

const stockMoveSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, index: true },
    inventory: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', index: true },
    variantId: { type: String, required: true, index: true },
    warehouseId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['opening', 'sale', 'return', 'adjustment', 'transfer', 'transfer_in', 'transfer_out', 'restock', 'purchase', 'correction', 'deleted'],
      required: true
    },
    change: { type: Number, required: true },
    reason: { type: String, default: '', trim: true },
    reference: { type: String, default: '', trim: true },
    before: { type: Number, required: true },
    after: { type: Number, required: true },
    user: { type: String, default: 'Zylo System' },
    at: { type: Date, default: Date.now }
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

stockMoveSchema.index({ inventory: 1, createdAt: -1 });
stockMoveSchema.index({ variantId: 1, createdAt: -1 });

export const StockMove = mongoose.models.StockMove || mongoose.model('StockMove', stockMoveSchema);
export default StockMove;
