import mongoose from 'mongoose';

// પગાર વધારા/ઘટાડા નો ઇતિહાસ સ્કીમા (Salary Revision History)
const salaryHistorySchema = new mongoose.Schema({
  changeType: {
    type: String,
    enum: ['Increment', 'Decrement', 'Initial', 'વધારો', 'ઘટાડો'],
    required: true,
    default: 'Increment'
  },
  previousSalary: {
    type: Number,
    required: true,
    min: 0
  },
  revisedSalary: {
    type: Number,
    required: true,
    min: 0
  },
  changeAmount: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  effectiveDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  reason: {
    type: String,
    trim: true,
    required: [true, 'Revision reason is required']
  },
  approvedBy: {
    type: String,
    default: 'Admin',
    trim: true
  },
  status: {
    type: String,
    enum: ['Approved', 'Pending', 'Rejected'],
    default: 'Approved'
  },
  arrearsGenerated: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// બાકી પગાર અને એરિયર્સ સ્કીમા (Pending Salary & Arrears Record)
const arrearSchema = new mongoose.Schema({
  month: {
    type: String, // e.g. "2026-10" (YYYY-MM format)
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  previousSalary: {
    type: Number,
    default: 0
  },
  revisedSalary: {
    type: Number,
    default: 0
  },
  reason: {
    type: String,
    trim: true,
    default: 'Salary Revision Arrears'
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'પેન્ડિંગ', 'ચૂકતે'],
    default: 'Pending'
  },
  paidDate: {
    type: Date
  },
  paidNote: {
    type: String,
    trim: true,
    default: ''
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Online', 'Bank Transfer', 'રોકડ', 'ઓનલાઇન'],
    default: 'Cash'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// મુખ્ય કર્મચારી સ્કીમા (Employee Master Schema)
const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      default: 'Production',
      trim: true
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      default: 'Machine Operator',
      trim: true
    },
    joiningDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    currentMonthlySalary: {
      type: Number,
      required: [true, 'Current monthly salary is required'],
      min: [0, 'Salary must be positive'],
      default: 0
    },
    annualCTC: {
      type: Number,
      default: function () {
        return (this.currentMonthlySalary || 0) * 12;
      }
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'એક્ટિવ', 'ઇનએક્ટિવ'],
      default: 'Active'
    },
    contactDetails: {
      mobileNumber: {
        type: String,
        trim: true,
        default: ''
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
      },
      address: {
        type: String,
        trim: true,
        default: ''
      }
    },
    salaryHistory: [salaryHistorySchema],
    arrears: [arrearSchema],
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// હંમેશા સેવ કરતાં પહેલાં Annual CTC ગણતરી કરો
employeeSchema.pre('save', function () {
  if (this.currentMonthlySalary !== undefined) {
    this.annualCTC = Number(this.currentMonthlySalary) * 12;
  }
});

// પેન્ડિંગ એરિયર્સ નો વર્ચ્યુઅલ ટોટલ
employeeSchema.virtual('totalPendingArrears').get(function () {
  if (!this.arrears || this.arrears.length === 0) return 0;
  return this.arrears
    .filter((a) => a.status === 'Pending' || a.status === 'પેન્ડિંગ')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
});

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
