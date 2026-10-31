import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false,
  },
  role: {
    type: String,
    default: 'Operator',
    enum: ['Owner & Admin', 'Production Supervisor', 'Embroidery Operator', 'Admin', 'Manager', 'Operator', 'User'],
  },
  roleGuj: {
    type: String,
    default: 'ઓપરેટર',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);
export default User;
