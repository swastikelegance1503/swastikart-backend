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
  // ચાલુ સક્રિય મહિનો (Current Active Month Cycle)
  activeMonth: {
    type: String,
    default: function () {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  },
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
