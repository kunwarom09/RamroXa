import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    variant: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' },
    variantId: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    priceSnapshot: { type: Number, default: 0 } // Cached reference only; server always re-derives live price
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    guestToken: { type: String, index: true, default: null },
    items: [cartItemSchema],
    couponCode: { type: String, default: null, trim: true, uppercase: true }
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

// TTL index for guest cart cleanup (30 days)
cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
export default Cart;
