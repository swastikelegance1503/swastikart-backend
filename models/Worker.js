import mongoose from 'mongoose';

// સિંગલ ઉપાડ (Withdrawal / Advance) સ્કીમા
const withdrawalSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Withdrawal amount is required'],
    min: [0, 'Amount must be positive']
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Online', 'રોકડ', 'ઓનલાઇન'],
    default: 'Cash',
    required: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// બોનસ (Bonus) સ્કીમા
const bonusSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Bonus amount is required'],
    min: [0, 'Amount must be positive']
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  reason: {
    type: String,
    trim: true,
    default: 'Festival / Performance Bonus'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// મુખ્ય કારીગર/વર્કર સ્કીમા (Main Worker Schema)
const workerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'કારીગરનું નામ જરૂરી છે (Worker name is required)'],
    trim: true
  },
  mobileNumber: {
    type: String,
    required: [true, 'મોબાઇલ નંબર જરૂરી છે (Mobile number is required)'],
    trim: true
  },
  role: {
    type: String,
    default: 'Embroidery Operator',
    trim: true
  },
  machineType: {
    type: String,
    required: [true, 'મશીનનો પ્રકાર જરૂરી છે (Machine type is required)'],
    trim: true
  },
  salary: {
    type: Number,
    required: [true, 'પગાર/સેલેરી જરૂરી છે (Salary is required)'],
    min: [0, 'Salary must be positive'],
    default: 0
  },
  // ઉપાડ ની વિગતો (તારીખ અને કેશ/ઓનલાઇન સાથે)
  withdrawals: [withdrawalSchema],
  // બોનસ ની વિગતો
  bonuses: [bonusSchema],
  // કુલ બોનસ (Direct bonus amount જો સિમ્પલ વાપરવું હોય)
  bonus: {
    type: Number,
    default: 0,
    min: 0
  },
  joinDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'એક્ટિવ', 'ઇનએક્ટિવ'],
    default: 'Active'
  },
  notes: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// વર્ચ્યુઅલ ફિલ્ડ: કુલ ઉપાડ (Total Withdrawal calculation)
workerSchema.virtual('totalWithdrawals').get(function () {
  if (!this.withdrawals || this.withdrawals.length === 0) return 0;
  return this.withdrawals.reduce((sum, item) => sum + (item.amount || 0), 0);
});

// વર્ચ્યુઅલ ફિલ્ડ: કુલ બોનસ (Total Bonus calculation)
workerSchema.virtual('totalBonuses').get(function () {
  const bonusArrayTotal = (!this.bonuses || this.bonuses.length === 0)
    ? 0
    : this.bonuses.reduce((sum, item) => sum + (item.amount || 0), 0);
  return bonusArrayTotal + (this.bonus || 0);
});

// વર્ચ્યુઅલ ફિલ્ડ: બાકી ચૂકવવાની રકમ (Net Payable: Salary + Bonus - Withdrawals)
workerSchema.virtual('netPayable').get(function () {
  const totalSal = this.salary || 0;
  const totalBon = this.totalBonuses || 0;
  const totalWith = this.totalWithdrawals || 0;
  return (totalSal + totalBon) - totalWith;
});

const Worker = mongoose.model('Worker', workerSchema);
export default Worker;

