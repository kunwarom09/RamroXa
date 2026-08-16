import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    address: { type: String, default: '' },
    isDefault: { type: Boolean, default: false }
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

export const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', warehouseSchema);
export default Warehouse;
