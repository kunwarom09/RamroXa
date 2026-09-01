import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    isFeatured: { type: Boolean, default: false },
    format: { type: String, default: 'webp' }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    categoryId: { type: String, required: true, index: true },
    productType: { type: String, default: 'Top Wear', trim: true },
    brand: { type: String, default: 'Zylo', trim: true },
    gender: { type: String, enum: ['Men', 'Women', 'Unisex', 'Kids'], default: 'Unisex' },
    season: { type: String, default: 'SS26' },
    tags: [{ type: String, trim: true, index: true }],
    description: { type: String, default: '', trim: true },
    options: { type: Map, of: [String], default: {} },
    images: [imageSchema],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    labels: {
      featured: { type: Boolean, default: false },
      trending: { type: Boolean, default: false },
      newArrival: { type: Boolean, default: false },
      bestSelling: { type: Boolean, default: false }
    },
    basePrice: {
      type: Number,
      min: 0,
      default: function () {
        return this?.price !== undefined ? this.price : 0;
      }
    },
    price: {
      type: Number,
      min: 0,
      default: function () {
        return this?.basePrice !== undefined ? this.basePrice : 0;
      }
    },
    mrp: { type: Number, default: 0, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    deletedAt: { type: Date, default: null }
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

// Compound indexes
productSchema.index({ status: 1, categoryId: 1, createdAt: -1 });
productSchema.index({ status: 1, basePrice: 1 });
productSchema.index({ name: 'text', tags: 'text', description: 'text', brand: 'text' });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
