import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 }, // In Paisa
    amount: { type: Number, required: true, min: 0 } // In Paisa
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    billNo: {
      type: String,
      required: [true, 'Bill number is required'],
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
    head: {
      type: String,
      default: 'Purchases (stock)',
      trim: true
    },
    items: [purchaseItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    vatable: {
      type: Boolean,
      default: true
    },
    vatAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'credit'],
      default: 'bank'
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'unpaid', 'partial'],
      default: 'paid'
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

purchaseSchema.index({ date: -1, supplier: 1 });

export const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
export default Purchase;
