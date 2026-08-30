import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    productId: {
      type: String,
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true,
      trim: true
    },
    userEmail: {
      type: String,
      default: '',
      trim: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5
    },
    title: {
      type: String,
      default: '',
      trim: true
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true
    },
    color: {
      type: String,
      default: '',
      trim: true
    },
    size: {
      type: String,
      default: '',
      trim: true
    },
    variantLabel: {
      type: String,
      default: '',
      trim: true
    },
    images: [{
      type: String,
      trim: true
    }],
    status: {
      type: String,
      enum: ['published', 'hidden'],
      default: 'published',
      index: true
    },
    verifiedPurchase: {
      type: Boolean,
      default: false
    }
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

// Enforce single review per user per product
reviewSchema.index({ productId: 1, user: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export default Review;
