import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  avatar?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: Date;
  hobbies?: string[];
  joinedEvents: mongoose.Types.ObjectId[];
  createdEvents: mongoose.Types.ObjectId[];
  draftEvents: mongoose.Types.ObjectId[];
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name must not exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: undefined,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: undefined,
    },
    dateOfBirth: {
      type: Date,
      default: undefined,
    },
    hobbies: [{
      type: String,
      trim: true,
    }],
    joinedEvents: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Event',
      },
    ],
    createdEvents: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Event',
      },
    ],
    draftEvents: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Event',
      },
    ],
    refreshToken: {
      type: String,
      select: false, // Not returned in queries by default
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ────────────────────────────────────────────────
// email index is already defined as unique in the field definition above

// ─── Pre-save Hook: Hash Password ──────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Method: Compare Password ──────────────────────
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Transform: Remove password from JSON output ────────────
userSchema.set('toJSON', {
  transform(_doc: any, ret: any) {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', userSchema);
