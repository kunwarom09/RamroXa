import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    parentId: { type: String, default: null, index: true },
    sortOrder: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, default: null },
    banner: { type: String, default: null },
    icon: { type: String, default: null },
    metaTitle: { type: String, default: null },
    metaDesc: { type: String, default: null }
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

categorySchema.index({ status: 1, visible: 1, sortOrder: 1 });

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export default Category;
