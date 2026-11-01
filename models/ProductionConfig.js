import mongoose from 'mongoose';

const productionConfigSchema = new mongoose.Schema(
  {
    baseTarget: {
      type: Number,
      required: true,
      default: 500000 // ₹5,00,000 Base Target
    },
    productionStep: {
      type: Number,
      required: true,
      default: 50000 // ₹50,000 Step
    },
    incentivePerStep: {
      type: Number,
      required: true,
      default: 50 // ₹50 Incentive per Step
    },
    description: {
      type: String,
      default: 'Swastik Art Monthly Production Incentive Structure'
    },
    updatedBy: {
      type: String,
      default: 'Admin'
    }
  },
  {
    timestamps: true
  }
);

const ProductionConfig = mongoose.model('ProductionConfig', productionConfigSchema);
export default ProductionConfig;
