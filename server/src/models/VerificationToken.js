import mongoose from 'mongoose';

const verificationTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      default: 'email_verification'
    },
    redirect: {
      type: String,
      default: '/shop'
    },
    isUsed: {
      type: Boolean,
      default: false
    },
    usedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically cleans up expired tokens in MongoDB
    }
  },
  {
    timestamps: true
  }
);

export const VerificationToken =
  mongoose.models.VerificationToken ||
  mongoose.model('VerificationToken', verificationTokenSchema);

export default VerificationToken;
