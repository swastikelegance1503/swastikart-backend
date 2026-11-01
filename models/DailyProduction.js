import mongoose from 'mongoose';

const dailyProductionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Production date is required'],
      default: Date.now
    },
    month: {
      type: String, // e.g., "2026-11" (YYYY-MM)
      required: true,
      index: true,
      default: function () {
        const d = this.date ? new Date(this.date) : new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    employeeName: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Daily production amount (₹) is required'],
      min: [0, 'Production amount cannot be negative']
    },
    quantity: {
      type: Number,
      default: 0,
      min: [0, 'Quantity cannot be negative']
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

// તારીખ બદલાય તો મહિનો પણ આપોઆપ સુધરે
dailyProductionSchema.pre('save', function () {
  if (this.date) {
    const d = new Date(this.date);
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
});

// ઝડપી સર્ચ માટે કમ્પાઉન્ડ ઇન્ડેક્સ
dailyProductionSchema.index({ employee: 1, month: 1 });
dailyProductionSchema.index({ date: -1 });

const DailyProduction = mongoose.model('DailyProduction', dailyProductionSchema);
export default DailyProduction;
