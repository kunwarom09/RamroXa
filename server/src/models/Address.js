import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    line1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true
    },
    line2: {
      type: String,
      default: '',
      trim: true
    },
    city: {
      type: String,
      default: 'Kathmandu',
      trim: true
    },
    district: {
      type: String,
      default: 'Kathmandu',
      trim: true
    },
    province: {
      type: String,
      default: 'Bagmati',
      trim: true
    },
    postalCode: {
      type: String,
      default: '',
      trim: true
    },
    country: {
      type: String,
      default: 'NP',
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    label: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
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

addressSchema.index({ user: 1, isDefault: 1 });

export const Address = mongoose.models.Address || mongoose.model('Address', addressSchema);
export default Address;
