import mongoose from 'mongoose';

// ચલણ/બિલ આઇટમ સ્કીમા (Challan Line Item Schema)
const challanItemSchema = new mongoose.Schema({
  srNo: {
    type: Number,
    default: 1
  },
  description: {
    type: String,
    required: [true, 'આઇટમ વિગત જરૂરી છે (Item description / particular is required)'],
    trim: true
  },
  qty: {
    type: Number,
    required: [true, 'જથ્થો / ક્વોન્ટિટી જરૂરી છે (Quantity is required)'],
    min: [0, 'Quantity cannot be negative']
  },
  rate: {
    type: Number,
    required: [true, 'ભાવ / રેટ જરૂરી છે (Rate is required)'],
    min: [0, 'Rate cannot be negative']
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  }
}, { _id: false });

// મુખ્ય ચલણ/બિલ સ્કીમા (Main Challan / Bill Schema)
const challanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: false
  },
  firmName: {
    type: String,
    required: [true, 'ફર્મનું નામ જરૂરી છે (Firm name is required)'],
    trim: true
  },
  // મર્ચન્ટ ની વિગતો
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: false
  },
  merchantName: {
    type: String,
    required: [true, 'મર્ચન્ટનું નામ જરૂરી છે (Merchant name is required)'],
    trim: true
  },
  merchantAddress: {
    type: String,
    required: [true, 'મર્ચન્ટનું સરનામું જરૂરી છે (Merchant address is required)'],
    trim: true
  },
  merchantMobile: {
    type: String,
    trim: true,
    default: ''
  },
  merchantGstin: {
    type: String,
    trim: true,
    default: ''
  },
  stateCode: {
    type: String,
    trim: true,
    default: '24' // 24 = Gujarat
  },
  // બિલ & ચલણ નંબર
  billNo: {
    type: String,
    required: [true, 'બિલ નંબર જરૂરી છે (Bill number is required)'],
    trim: true
  },
  bookNo: {
    type: String,
    trim: true,
    default: ''
  },
  challanNo: {
    type: String,
    trim: true,
    default: ''
  },
  // તારીખો
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date
  },
  // આઇટમ્સ
  items: {
    type: [challanItemSchema],
    validate: {
      validator: function (items) {
        return Array.isArray(items) && items.length > 0;
      },
      message: 'ઓછામાં ઓછી એક આઇટમ હોવી જરૂરી છે (At least one item is required)'
    }
  },
  // ટોટલ ગણતરીઓ
  totalQty: {
    type: Number,
    default: 0
  },
  subTotal: {
    type: Number,
    required: true,
    default: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmountBeforeTax: {
    type: Number,
    required: true,
    default: 0
  },
  // GST વિગતો (GST જો એડ કરવો હોય તો)
  isGstApplicable: {
    type: Boolean,
    default: false
  },
  cgstRate: {
    type: Number,
    default: 0
  },
  cgstAmount: {
    type: Number,
    default: 0
  },
  sgstRate: {
    type: Number,
    default: 0
  },
  sgstAmount: {
    type: Number,
    default: 0
  },
  igstRate: {
    type: Number,
    default: 0
  },
  igstAmount: {
    type: Number,
    default: 0
  },
  totalGst: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    default: 0
  },
  // પેમેન્ટ / ચેક વિગતો
  paymentDetails: {
    paymentWithinDays: { type: Number, default: 0 },
    chequeDate: { type: Date },
    chequeNo: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    bankName: { type: String, default: '' }
  },
  // ફર્મની સ્થિર વિગતો નો સ્નેપશોટ (પ્રિન્ટિંગ અને જૂના બિલ સાચવવા માટે)
  firmSnapshot: {
    firmName: String,
    businessType: String,
    greeting: String,
    ownerName: String,
    mobileNumbers: [String],
    address: String,
    gstin: String,
    panNo: String,
    stateCode: String,
    bankDetails: {
      bankName: String,
      accountNo: String,
      ifscCode: String,
      branch: String
    },
    termsAndConditions: [String],
    templateType: String
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Partially Paid', 'Cancelled'],
    default: 'Pending'
  },
  // Google Drive સિંક સ્ટેટસ (swastikelegance065@gmail.com)
  googleDriveSynced: {
    type: Boolean,
    default: false
  },
  googleDriveFileUrl: {
    type: String,
    default: ''
  },
  googleDriveSheetUrl: {
    type: String,
    default: ''
  },
  googleDriveSyncedAt: {
    type: Date
  }
}, {
  timestamps: true // createdAt and updatedAt auto-generated
});

// ઝડપી સર્ચ માટે ઇન્ડેક્સ
challanSchema.index({ firmName: 1, date: -1 });
challanSchema.index({ merchant: 1 });
challanSchema.index({ billNo: 1 });

const Challan = mongoose.model('Challan', challanSchema);
export default Challan;

