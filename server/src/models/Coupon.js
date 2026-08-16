import mongoose from 'mongoose';

const usedBySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orderNo: { type: String, required: true },
    usedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    discountType: {
      type: String,
      enum: ['fixed', 'percentage'],
      required: true,
      default: 'fixed'
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: 0 // In Paisa if fixed (e.g. 50000 = 500 NPR), or percentage (e.g. 10 = 10%)
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0 // In Paisa
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: 0 // In Paisa, caps percentage discounts if set
    },
    validFrom: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      default: null
    },
    usageLimit: {
      type: Number,
      default: null // Total usage limit across all customers
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    userLimit: {
      type: Number,
      default: 1 // Max uses per individual user
    },
    usedBy: [usedBySchema],
    active: {
      type: Boolean,
      default: true,
      index: true
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

couponSchema.index({ active: 1, validFrom: 1, validUntil: 1 });

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
export default Coupon;
