import mongoose from 'mongoose';

// એપ સેટિંગ્સ સ્કીમા (App Settings Schema)
const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;

