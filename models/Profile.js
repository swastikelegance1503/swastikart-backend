import mongoose from 'mongoose';

// ફર્મ પ્રોફાઇલ સ્કીમા (Firm Profile Schema for Bills & Challans)
const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  firmName: {
    type: String,
    required: [true, 'પેઢી/ફર્મનું નામ જરૂરી છે (Firm name is required)'],
    trim: true
  },
  businessType: {
    type: String,
    default: 'All Types of Embroidery Job Work',
    trim: true
  },
  greeting: {
    type: String,
    default: 'Shree Ganeshay Namah',
    trim: true
  },
  ownerName: {
    type: String,
    default: '',
    trim: true
  },
  mobileNumbers: {
    type: [String],
    default: []
  },
  address: {
    type: String,
    required: [true, 'ફર્મનું સરનામું જરૂરી છે (Firm address is required)'],
    trim: true
  },
  gstin: {
    type: String,
    trim: true,
    default: ''
  },
  panNo: {
    type: String,
    trim: true,
    default: ''
  },
  stateCode: {
    type: String,
    trim: true,
    default: '24' // 24 = Gujarat
  },
  bankDetails: {
    bankName: { type: String, default: 'The Panchsheel Mercantile Co-Op. Bank LTD.', trim: true },
    accountNo: { type: String, default: '', trim: true },
    ifscCode: { type: String, default: '', trim: true },
    branch: { type: String, default: 'Surat', trim: true }
  },
  termsAndConditions: {
    type: [String],
    default: [
      'Interest at 2% on the bill amount after due date.',
      'Complaints regarding this invoice must be settled within 24 hours.',
      'Subject to Surat Jurisdiction.'
    ]
  },
  templateType: {
    type: String,
    enum: ['astha', 'swastik', 'standard'],
    default: 'standard'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Profile = mongoose.model('Profile', profileSchema);
export default Profile;

