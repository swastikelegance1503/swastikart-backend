import mongoose from 'mongoose';

// મર્ચન્ટ / વેપારી સ્કીમા (Merchant Schema)
const merchantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'મર્ચન્ટનું નામ જરૂરી છે (Merchant name is required)'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'સરનામું જરૂરી છે (Address is required)'],
    trim: true
  },
  mobileNumber: {
    type: String,
    required: [true, 'મોબાઇલ નંબર જરૂરી છે (Mobile number is required)'],
    trim: true
  }
}, {
  timestamps: true
});

const Merchant = mongoose.model('Merchant', merchantSchema);
export default Merchant;

