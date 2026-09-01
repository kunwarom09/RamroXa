import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variant: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' },
    productId: { type: String, required: true },
    variantId: { type: String, required: true },
    name: { type: String, required: true },
    variantLabel: { type: String, default: '' },
    sku: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // In Paisa
    lineTotal: { type: Number, required: true, min: 0 }, // In Paisa
    image: { type: String, default: '' }
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, default: '', trim: true },
    line2: { type: String, default: '', trim: true },
    city: { type: String, default: 'Kathmandu', trim: true },
    district: { type: String, default: 'Kathmandu', trim: true },
    province: { type: String, default: 'Bagmati', trim: true },
    postalCode: { type: String, default: '', trim: true },
    country: { type: String, default: 'NP', trim: true }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String, default: 'system' },
    note: { type: String, default: '' }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true, uppercase: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    guestEmail: { type: String, default: null, lowercase: true, trim: true },
    guestPhone: { type: String, default: null, trim: true },
    guestToken: { type: String, default: null, index: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 }, // In Paisa
    discountTotal: { type: Number, default: 0, min: 0 },
    shippingTotal: { type: Number, default: 0, min: 0 },
    vatTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NPR' },
    shippingAddress: addressSchema,
    billingAddress: addressSchema,
    paymentMethod: {
      type: String,
      enum: ['cod', 'esewa', 'fonepay'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },
    fulfillmentStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'pending',
      index: true
    },
    couponCode: { type: String, default: null },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    placedAt: { type: Date, default: Date.now },
    statusHistory: [statusHistorySchema]
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
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, fulfillmentStatus: 1 });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
