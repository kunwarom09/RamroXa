import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, index: true },
    variant: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', index: true },
    variantId: { type: String, required: true, index: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', index: true },
    warehouseId: { type: String, required: true, index: true },
    available: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    incoming: { type: Number, default: 0, min: 0 },
    damaged: { type: Number, default: 0, min: 0 },
    returned: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 5 },
    minStock: { type: Number, default: 0 },
    maxStock: { type: Number, default: 0 },
    archived: { type: Boolean, default: false }
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

inventorySchema.virtual('sellable').get(function () {
  return Math.max(0, (this.available || 0) - (this.reserved || 0));
});

inventorySchema.index({ variantId: 1, warehouseId: 1 }, { unique: true });

export const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);
export default Inventory;
