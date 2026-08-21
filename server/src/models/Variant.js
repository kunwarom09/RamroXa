import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, index: true },
    name: { type: String, trim: true, default: '' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
    productId: { type: String, required: true, index: true },
    parentVariantId: { type: String, default: null, index: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    options: { type: Map, of: String, default: {} },
    price: { type: Number, default: null, min: 0 }, // If null, falls back to parent variant or Product.basePrice
    compareAtPrice: { type: Number, default: null, min: 0 },
    cost: { type: Number, default: null, min: 0 },
    barcode: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ['active', 'draft', 'published', 'hidden', 'out_of_stock', 'discontinued', 'archived'],
      default: 'active',
      index: true
    },
    published: { type: Boolean, default: true, index: true },
    hidden: { type: Boolean, default: false, index: true },
    weight: { type: Number, default: null } // In grams
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

variantSchema.index({ productId: 1, published: 1 });
variantSchema.index({ productId: 1, parentVariantId: 1 });
variantSchema.index({ parentVariantId: 1, hidden: 1 });

export const Variant = mongoose.models.Variant || mongoose.model('Variant', variantSchema);
export default Variant;
