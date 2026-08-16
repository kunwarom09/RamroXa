import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    orderNo: {
      type: String,
      required: true,
      index: true
    },
    provider: {
      type: String,
      enum: ['cod', 'esewa', 'fonepay'],
      required: true
    },
    providerRef: {
      type: String,
      sparse: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0 // In Paisa
    },
    currency: {
      type: String,
      default: 'NPR'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },
    rawWebhookPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
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

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export default Payment;
