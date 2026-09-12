import mongoose from 'mongoose';

const purchaseReturnItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    productId: { type: String, default: '' },
    variantId: { type: String, default: '' },
    sku: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 }, // In Paisa
    amount: { type: Number, required: true, min: 0 } // In Paisa
  },
  { _id: false }
);

const purchaseReturnSchema = new mongoose.Schema(
  {
    no: {
      type: String,
      required: [true, 'Debit Note number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      default: null,
      index: true
    },
    billNo: {
      type: String,
      required: [true, 'Original Bill number is required'],
      trim: true,
      index: true
    },
    supplier: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true
    },
    supplierPan: {
      type: String,
      default: '',
      trim: true
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    items: [purchaseReturnItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0 // In Paisa
    },
    vatable: {
      type: Boolean,
      default: true
    },
    vatAmount: {
      type: Number,
      default: 0 // In Paisa
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0 // In Paisa
    },
    reason: {
      type: String,
      required: [true, 'Return reason is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'completed',
      index: true
    },
    warehouseId: {
      type: String,
      default: 'w1'
    },
    cancelReason: {
      type: String,
      default: ''
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: '',
      trim: true
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

purchaseReturnSchema.index({ date: -1, supplier: 1 });

export const PurchaseReturn = mongoose.models.PurchaseReturn || mongoose.model('PurchaseReturn', purchaseReturnSchema);
export default PurchaseReturn;
