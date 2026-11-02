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
  month: {
    type: String, // e.g. "2026-10", "2026-11" (YYYY-MM format)
    default: function () {
      const d = this.date ? new Date(this.date) : new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
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
  addedBy: {
    type: String,
    trim: true,
    default: 'Admin'
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
  month: {
    type: String, // e.g. "2026-10", "2026-11"
    default: function () {
      const d = this.date ? new Date(this.date) : new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  },
  reason: {
    type: String,
    trim: true,
    default: 'Festival / Performance Bonus'
  },
  isAutoIncentive: {
    type: Boolean,
    default: false
  },
  productionAmount: {
    type: Number,
    default: 0
  },
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    default: null
  },
  machineCode: {
    type: String,
    trim: true,
    default: ''
  },
  machineName: {
    type: String,
    trim: true,
    default: ''
  },
  machineDailyEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  productionEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  slab: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// દૈનિક ઉત્પાદન (Daily Production) સ્કીમા
const dailyProductionEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  month: {
    type: String, // e.g. "2026-11" (YYYY-MM)
    default: function () {
      const d = this.date ? new Date(this.date) : new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  },
  amount: {
    type: Number,
    required: [true, 'Production amount is required'],
    min: [0, 'Amount must be positive']
  },
  quantity: {
    type: Number,
    default: 0
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  bonusAmount: {
    type: Number,
    default: 0
  },
  slab: {
    type: String,
    trim: true,
    default: ''
  },
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    default: null
  },
  machineName: {
    type: String,
    trim: true,
    default: ''
  },
  machineCode: {
    type: String,
    trim: true,
    default: ''
  },
  machineHeadCount: {
    type: Number,
    default: 24
  },
  machineDailyEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// માસિક પગાર પતાવટ / સેટલમેન્ટ સ્કીમા (Monthly Salary Settlement Record)
const monthlySettlementSchema = new mongoose.Schema({
  month: {
    type: String, // e.g., "2026-10" (YYYY-MM format)
    required: true
  },
  baseSalary: {
    type: Number,
    required: true,
    min: 0
  },
  totalBonus: {
    type: Number,
    default: 0
  },
  totalWithdrawals: {
    type: Number,
    default: 0
  },
  cashWithdrawals: {
    type: Number,
    default: 0
  },
  onlineWithdrawals: {
    type: Number,
    default: 0
  },
  netPaid: {
    type: Number, // (baseSalary + totalBonus) - totalWithdrawals
    required: true
  },
  settlementDate: {
    type: Date,
    default: Date.now
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Online', 'Bank Transfer', 'રોકડ', 'ઓનલાઇન', 'બેંક ટ્રાન્સફર'],
    default: 'Cash'
  },
  status: {
    type: String,
    enum: ['Completed', 'Pending', 'સંપૂર્ણ', 'બાકી'],
    default: 'Completed'
  },
  notes: {
    type: String,
    default: '',
    trim: true
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
  machine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    default: null
  },
  machineName: {
    type: String,
    default: '',
    trim: true
  },
  machineCode: {
    type: String,
    default: '',
    trim: true
  },
  machineType: {
    type: String,
    default: '',
    trim: true
  },
  salary: {
    type: Number,
    default: 0
  },
  // ચાલુ સક્રિય મહિનો (Current Active Month Cycle)
  activeMonth: {
    type: String,
    default: function () {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  },
  // કસ્ટમ પ્રોડક્શન ટાર્ગેટ અને બોનસ નિયમો (Custom Production Target & Bonus Rule)
  targetProduction: {
    type: Number,
    default: 500000, // ડિફોલ્ટ ₹5,00,000 ટાર્ગેટ
    min: 0
  },
  productionStep: {
    type: Number,
    default: 50000, // ડિફોલ્ટ ₹50,000 સ્ટેપ
    min: 1
  },
  incentiveRate: {
    type: Number,
    default: 50, // ડિફોલ્ટ દર સ્ટેપે ₹50 બોનસ
    min: 0
  },
  // દૈનિક પ્રોડક્શન એન્ટ્રીઓ (Daily Production Records)
  dailyProductions: [dailyProductionEntrySchema],
  // ઉપાડ ની વિગતો
  withdrawals: [withdrawalSchema],
  // બોનસ ની વિગતો
  bonuses: [bonusSchema],
  // માસિક પગાર પતાવટ ઇતિહાસ (Monthly Completed Salaries)
  monthlySettlements: [monthlySettlementSchema],
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

// વર્ચ્યુઅલ ફિલ્ડ: કુલ ઉપાડ
workerSchema.virtual('totalWithdrawals').get(function () {
  if (!this.withdrawals || this.withdrawals.length === 0) return 0;
  return this.withdrawals.reduce((sum, item) => sum + (item.amount || 0), 0);
});

// વર્ચ્યુઅલ ફિલ્ડ: કુલ બોનસ
workerSchema.virtual('totalBonuses').get(function () {
  const bonusArrayTotal = (!this.bonuses || this.bonuses.length === 0)
    ? 0
    : this.bonuses.reduce((sum, item) => sum + (item.amount || 0), 0);
  return bonusArrayTotal + (this.bonus || 0);
});

// વર્ચ્યુઅલ ફિલ્ડ: બાકી ચૂકવવાની રકમ
workerSchema.virtual('netPayable').get(function () {
  const totalSal = this.salary || 0;
  const totalBon = this.totalBonuses || 0;
  const totalWith = this.totalWithdrawals || 0;
  return (totalSal + totalBon) - totalWith;
});

const Worker = mongoose.model('Worker', workerSchema);
export default Worker;
