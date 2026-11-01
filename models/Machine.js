import mongoose from 'mongoose';

// તારીખમાંથી YYYY-MM મેળવવાનું સહાયક ફંક્શન
function getMonthKey(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ૧. દૈનિક મશીન ઉત્પાદન એન્ટ્રી સ્કીમા (Daily Machine Production Entry)
const machineDailyEntrySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'પ્રોડક્શન તારીખ જરૂરી છે (Date is required)'],
      default: Date.now
    },
    month: {
      type: String, // "YYYY-MM"
      required: true,
      index: true,
      default: function () {
        return getMonthKey(this.date);
      }
    },
    shift: {
      type: String,
      enum: ['Day', 'Night', 'General'],
      default: 'Day'
    },
    operatorName: {
      type: String,
      trim: true,
      default: ''
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      default: null
    },
    merchantName: {
      type: String,
      trim: true,
      default: ''
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      default: null
    },
    designNo: {
      type: String,
      trim: true,
      default: ''
    },
    stitches: {
      type: Number,
      default: 0,
      min: [0, 'ટાંકા ઋણ ન હોઈ શકે (Stitches cannot be negative)']
    },
    amount: {
      type: Number,
      required: [true, 'પ્રોડક્શન રકમ (₹) જરૂરી છે (Amount is required)'],
      min: [0, 'રકમ ઋણ ન હોઈ શકે (Amount cannot be negative)']
    },
    quantity: {
      type: Number,
      default: 0,
      min: [0, 'ક્વોન્ટિટી ઋણ ન હોઈ શકે (Quantity cannot be negative)']
    },
    downtimeMinutes: {
      type: Number,
      default: 0,
      min: [0, 'ડાઉનટાઇમ ઋણ ન હોઈ શકે']
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

machineDailyEntrySchema.pre('validate', function () {
  if (this.date) {
    this.month = getMonthKey(this.date);
  }
});

// ૨. મશીન માસ્ટર સ્કીમા (Machine Master Schema)
const machineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'મશીનનું નામ જરૂરી છે (Machine name is required)'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'મશીન કોડ / નંબર જરૂરી છે (Machine code is required)'],
      unique: true,
      trim: true,
      uppercase: true
    },
    machineType: {
      type: String,
      required: [true, 'મશીનનો પ્રકાર જરૂરી છે (Machine type is required)'],
      trim: true
    },
    headCount: {
      type: Number,
      default: 24,
      min: [1, 'ઓછામાં ઓછું ૧ હેડ હોવું જોઈએ']
    },
    model: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Under Maintenance', 'Idle'],
      default: 'Active'
    },
    defaultOperatorName: {
      type: String,
      trim: true,
      default: ''
    },
    defaultOperator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      default: null
    },
    dailyTarget: {
      type: Number,
      default: 25000,
      min: [0, 'ટાર્ગેટ ઋણ ન હોઈ શકે']
    },
    dailyStitchTarget: {
      type: Number,
      default: 500000,
      min: [0, 'ટાંકા ટાર્ગેટ ઋણ ન હોઈ શકે']
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    dailyProductions: [machineDailyEntrySchema]
  },
  {
    timestamps: true
  }
);

const Machine = mongoose.models.Machine || mongoose.model('Machine', machineSchema);

export default Machine;
