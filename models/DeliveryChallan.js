import mongoose from 'mongoose';

// ચલાણ આઇટમ સ્કીમા (Delivery Challan Line Item Schema)
const deliveryChallanItemSchema = new mongoose.Schema({
  srNo: {
    type: Number,
    default: 1
  },
  particulars: {
    type: String,
    required: [true, 'વિગત જરૂરી છે (Particulars / Item description is required)'],
    trim: true
  },
  qty: {
    type: Number,
    required: [true, 'જથ્થો / પીસ જરૂરી છે (Quantity / Pcs is required)'],
    min: [0, 'Quantity cannot be negative']
  },
  rate: {
    type: Number,
    default: 0,
    min: [0, 'Rate cannot be negative']
  },
  amount: {
    type: Number,
    default: 0,
    min: [0, 'Amount cannot be negative']
  }
}, { _id: false });

// મુખ્ય ડિલિવરી ચલાણ સ્કીમા (Main Delivery Challan Schema)
const deliveryChallanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  firmName: {
    type: String,
    required: [true, 'ફર્મનું નામ જરૂરી છે (Firm name is required)'],
    enum: ['Swastik Art', 'Astha Fashion'],
    default: 'Swastik Art',
    trim: true
  },
  // ચલાણ નંબર (Ch.No.)
  challanNo: {
    type: String,
    required: [true, 'ચલાણ નંબર જરૂરી છે (Challan number is required)'],
    trim: true
  },
  // પાર્ટી ચલાણ નંબર (P.Ch.No.)
  pChallanNo: {
    type: String,
    trim: true,
    default: ''
  },
  // તારીખ
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  // મર્ચન્ટ / વેપારી ની વિગતો (M/s)
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: false
  },
  merchantName: {
    type: String,
    required: [true, 'વેપારીનું નામ જરૂરી છે (Merchant / Party name is required)'],
    trim: true
  },
  merchantAddress: {
    type: String,
    trim: true,
    default: ''
  },
  merchantCity: {
    type: String,
    trim: true,
    default: 'Surat'
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
  // આઇટમ્સ લિસ્ટ
  items: {
    type: [deliveryChallanItemSchema],
    validate: {
      validator: function (items) {
        return Array.isArray(items) && items.length > 0;
      },
      message: 'ઓછામાં ઓછી એક આઇટમ હોવી જરૂરી છે (At least one item is required)'
    }
  },
  // કુલ જથ્થો (Total Qty / Pcs)
  totalQty: {
    type: Number,
    default: 0
  },
  // નેટ રકમ (Net Amount)
  netAmount: {
    type: Number,
    default: 0
  },
  // સ્ટેટસ: ડિલિવર થયેલ, બિલ બાકી, બિલ બની ગયું, પરત આવેલ
  status: {
    type: String,
    enum: ['Delivered', 'Pending Bill', 'Billed', 'Returned'],
    default: 'Delivered'
  },
  // જો બિલ બની ગયું હોય તો તે બિલ સાથે લિંક
  linkedBillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challan',
    required: false
  },
  linkedBillNo: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  // Google Drive & Sheet સિંક
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
  timestamps: true
});

// ઇન્ડેક્સ
deliveryChallanSchema.index({ firmName: 1, challanNo: 1 });
deliveryChallanSchema.index({ date: -1 });
deliveryChallanSchema.index({ merchantName: 1 });

const DeliveryChallan = mongoose.model('DeliveryChallan', deliveryChallanSchema);
export default DeliveryChallan;

