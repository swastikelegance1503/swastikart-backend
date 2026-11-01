import Employee from '../models/Employee.js';
import DailyProduction from '../models/DailyProduction.js';
import ProductionConfig from '../models/ProductionConfig.js';

// ======================================================================
// સહાયક ફંક્શન: YYYY-MM કી મેળવો
// ======================================================================
function getMonthKey(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ======================================================================
// સહાયક ફંક્શન: ઓટોમેટિક પ્રોડક્શન ઇન્સેન્ટિવ ગણતરી (Auto Incentive Calculation)
// Monthly Production Target Structure:
// ₹5,00,000 -> ₹0
// ₹5,50,000 -> ₹50
// ₹6,00,000 -> ₹100
// ₹6,50,000 -> ₹150
// ₹7,00,000 -> ₹200
// ======================================================================
export function calculateIncentive(production, baseTarget = 500000, productionStep = 50000, incentivePerStep = 50) {
  const prod = Number(production) || 0;
  const target = Number(baseTarget) || 500000;
  const step = Number(productionStep) || 50000;
  const rate = Number(incentivePerStep) || 50;

  if (prod <= target || step <= 0) {
    return 0;
  }

  return Math.floor((prod - target) / step) * rate;
}

// સક્રિય ઇન્સેન્ટિવ કન્ફિગ મેળવો
async function getActiveConfig() {
  let config = await ProductionConfig.findOne().sort({ createdAt: -1 });
  if (!config) {
    config = await ProductionConfig.create({
      baseTarget: 500000,
      productionStep: 50000,
      incentivePerStep: 50
    });
  }
  return config;
}

// ======================================================================
// ૧. EMPLOYEE MANAGEMENT (કર્મચારી માસ્ટર)
// ======================================================================

// ૧.૧ તમામ કર્મચારીઓની યાદી (List Employees)
export async function listEmployees(req, res) {
  try {
    const { search, department, status } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { 'contactDetails.mobileNumber': { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await Employee.find(filter).sort({ employeeId: 1, createdAt: -1 });

    return res.json({
      success: true,
      count: employees.length,
      employees
    });
  } catch (error) {
    console.error('Error listing employees:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧.૨ એક કર્મચારી ની વિગતો અને સંપૂર્ણ ઇતિહાસ (Get Single Employee)
export async function getEmployee(req, res) {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'કર્મચારી મળ્યા નથી (Employee not found)' });
    }

    // કર્મચારીની તમામ પ્રોડક્શન એન્ટ્રીઓ
    const recentProductions = await DailyProduction.find({ employee: employee._id })
      .sort({ date: -1 })
      .limit(30);

    return res.json({
      success: true,
      employee,
      recentProductions
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧.૩ નવો કર્મચારી ઉમેરો (Create Employee)
export async function createEmployee(req, res) {
  try {
    let {
      employeeId,
      name,
      department,
      designation,
      joiningDate,
      currentMonthlySalary,
      status,
      contactDetails,
      notes
    } = req.body;

    if (!name || currentMonthlySalary === undefined) {
      return res.status(400).json({
        success: false,
        message: 'કર્મચારીનું નામ અને માસિક પગાર જરૂરી છે. (Name and salary are required.)'
      });
    }

    // જો Employee ID ન આપ્યો હોય તો ઓટો-જનરેટ કરો (દા.ત. EMP-001)
    if (!employeeId || employeeId.trim() === '') {
      const count = await Employee.countDocuments();
      employeeId = `EMP-${String(count + 1).padStart(3, '0')}`;
    } else {
      employeeId = employeeId.trim().toUpperCase();
      const existing = await Employee.findOne({ employeeId });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Employee ID "${employeeId}" પહેલેથી અસ્તિત્વમાં છે.`
        });
      }
    }

    const initialSalary = Number(currentMonthlySalary) || 0;

    const employee = new Employee({
      employeeId,
      name: name.trim(),
      department: department ? department.trim() : 'Production',
      designation: designation ? designation.trim() : 'Machine Operator',
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      currentMonthlySalary: initialSalary,
      annualCTC: initialSalary * 12,
      status: status || 'Active',
      contactDetails: contactDetails || {},
      notes: notes || '',
      salaryHistory: [
        {
          changeType: 'Initial',
          previousSalary: 0,
          revisedSalary: initialSalary,
          changeAmount: initialSalary,
          percentage: 100,
          effectiveDate: joiningDate ? new Date(joiningDate) : new Date(),
          reason: 'જોઇનિંગ વખતનો શરૂઆતનો પગાર (Initial Joining Salary)',
          approvedBy: 'Admin'
        }
      ]
    });

    await employee.save();

    return res.status(201).json({
      success: true,
      message: 'કર્મચારી સફળતાપૂર્વક ઉમેરાઈ ગયો! (Employee created successfully!)',
      employee
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧.૪ કર્મચારી ની પ્રોફાઈલ વિગતો સુધારો (Update Employee)
export async function updateEmployee(req, res) {
  try {
    const { name, department, designation, joiningDate, status, contactDetails, notes } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'કર્મચારી મળ્યા નથી (Employee not found)' });
    }

    if (name) employee.name = name.trim();
    if (department) employee.department = department.trim();
    if (designation) employee.designation = designation.trim();
    if (joiningDate) employee.joiningDate = new Date(joiningDate);
    if (status) employee.status = status;
    if (contactDetails) employee.contactDetails = contactDetails;
    if (notes !== undefined) employee.notes = notes;

    await employee.save();

    return res.json({
      success: true,
      message: 'કર્મચારીની વિગતો સફળતાપૂર્વક અપડેટ થઈ ગઈ!',
      employee
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧.૫ કર્મચારી ડિલીટ કરો (Delete Employee)
export async function deleteEmployee(req, res) {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'કર્મચારી મળ્યા નથી' });
    }

    // સંકળાયેલી પ્રોડક્શન એન્ટ્રીઓ પણ કાઢી નાખો
    await DailyProduction.deleteMany({ employee: employee._id });

    return res.json({
      success: true,
      message: 'કર્મચારી અને તમામ પ્રોડક્શન રેકોર્ડ્સ સફળતાપૂર્વક ડિલીટ થયા!'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ======================================================================
// ૨. DAILY PRODUCTION ENTRY (રોજિંદી ઉત્પાદન એન્ટ્રી)
// ======================================================================

// ૨.૧ નવી દૈનિક પ્રોડક્શન એન્ટ્રી (Add Daily Production Entry)
export async function addDailyProduction(req, res) {
  try {
    const { employeeId, date, amount, quantity, remarks } = req.body;

    if (!employeeId || amount === undefined || Number(amount) < 0) {
      return res.status(400).json({
        success: false,
        message: 'કર્મચારી અને યોગ્ય પ્રોડક્શન રકમ (₹) જરૂરી છે.'
      });
    }

    // કર્મચારી શોધો (ID કે _id બંનેથી)
    const employee = await Employee.findOne({
      $or: [{ _id: employeeId.match(/^[0-9a-fA-F]{24}$/) ? employeeId : null }, { employeeId: employeeId.toUpperCase() }]
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'પસંદ કરેલ કર્મચારી સિસ્ટમમાં મળ્યા નથી.'
      });
    }

    const entryDate = date ? new Date(date) : new Date();
    const month = getMonthKey(entryDate);

    const production = new DailyProduction({
      date: entryDate,
      month,
      employee: employee._id,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      amount: Number(amount),
      quantity: Number(quantity) || 0,
      remarks: remarks || ''
    });

    await production.save();

    return res.status(201).json({
      success: true,
      message: `₹${Number(amount).toLocaleString('en-IN')} ની દૈનિક પ્રોડક્શન એન્ટ્રી સફળતાપૂર્વક સેવ થઈ ગઈ!`,
      production
    });
  } catch (error) {
    console.error('Error adding daily production:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૨.૨ દૈનિક પ્રોડક્શન એન્ટ્રીઓની યાદી (List Daily Production Entries)
export async function listDailyProduction(req, res) {
  try {
    const { month, date, employeeId, limit = 100 } = req.query;
    const filter = {};

    if (month) filter.month = month;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (employeeId) {
      filter.$or = [
        { employeeId: employeeId.toUpperCase() },
        { employee: employeeId.match(/^[0-9a-fA-F]{24}$/) ? employeeId : null }
      ];
    }

    const entries = await DailyProduction.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(Number(limit))
      .populate('employee', 'name department designation currentMonthlySalary');

    const totalAmount = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalQuantity = entries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);

    return res.json({
      success: true,
      count: entries.length,
      totalAmount,
      totalQuantity,
      entries
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૨.૩ દૈનિક પ્રોડક્શન એન્ટ્રી ડિલીટ કરો (Delete Daily Production Entry)
export async function deleteDailyProduction(req, res) {
  try {
    const entry = await DailyProduction.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'એન્ટ્રી મળ્યા નથી' });
    }

    return res.json({
      success: true,
      message: 'પ્રોડક્શન એન્ટ્રી સફળતાપૂર્વક હટાવી દેવામાં આવી!'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ======================================================================
// ૩. MONTHLY PRODUCTION & AUTOMATIC INCENTIVE CALCULATION (માસિક પ્રોડક્શન & ઇન્સેન્ટિવ)
// ======================================================================
export async function getMonthlyProductionSummary(req, res) {
  try {
    const targetMonth = req.query.month || getMonthKey(new Date());
    const config = await getActiveConfig();

    // તમામ કર્મચારીઓ લાવો
    const employees = await Employee.find({ status: 'Active' }).sort({ employeeId: 1 });

    // પસંદ કરેલ મહિનાની તમામ પ્રોડક્શન એન્ટ્રીઓ
    const monthlyEntries = await DailyProduction.find({ month: targetMonth });

    // કર્મચારી-વાઇઝ ગ્રૂપિંગ
    const summaryPerEmployee = employees.map((emp) => {
      const empEntries = monthlyEntries.filter(
        (e) => e.employee.toString() === emp._id.toString() || e.employeeId === emp.employeeId
      );

      const totalProduction = empEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalQuantity = empEntries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0);
      const daysWorked = empEntries.length;

      // ઓટોમેટિક ઇન્સેન્ટિવ ગણતરી (Auto Incentive Calculation)
      const incentive = calculateIncentive(
        totalProduction,
        config.baseTarget,
        config.productionStep,
        config.incentivePerStep
      );

      // ટાર્ગેટ પ્રાપ્તિ ટકાવારી (% Target Achieved)
      const targetPercent = config.baseTarget > 0
        ? Math.min(100, Math.round((totalProduction / config.baseTarget) * 100))
        : 100;

      const baseSalary = Number(emp.currentMonthlySalary) || 0;
      const grossEarnings = baseSalary + incentive;

      // આ મહિનાનું પેન્ડિંગ એરિયર્સ
      const monthArrears = (emp.arrears || []).filter((a) => a.month === targetMonth && a.status === 'Pending');
      const pendingArrearsAmount = monthArrears.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

      return {
        _id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        designation: emp.designation,
        joiningDate: emp.joiningDate,
        currentMonthlySalary: baseSalary,
        annualCTC: emp.annualCTC,
        monthlyProduction: totalProduction,
        monthlyQuantity: totalQuantity,
        daysWorked,
        targetPercent,
        baseTarget: config.baseTarget,
        incentiveAmount: incentive,
        grossEarnings,
        pendingArrearsAmount,
        totalNetPayable: grossEarnings + pendingArrearsAmount,
        entriesCount: empEntries.length
      };
    });

    // કંપની વાઇઝ કુલ માસિક આંકડા
    const totalCompanyProduction = summaryPerEmployee.reduce((s, e) => s + e.monthlyProduction, 0);
    const totalCompanyIncentives = summaryPerEmployee.reduce((s, e) => s + e.incentiveAmount, 0);
    const totalCompanySalaries = summaryPerEmployee.reduce((s, e) => s + e.currentMonthlySalary, 0);
    const totalGrossPayroll = totalCompanySalaries + totalCompanyIncentives;

    // સૌથી વધુ પ્રોડક્શન આપનાર (Top Performer)
    const sorted = [...summaryPerEmployee].sort((a, b) => b.monthlyProduction - a.monthlyProduction);
    const topPerformer = sorted.length > 0 && sorted[0].monthlyProduction > 0 ? sorted[0] : null;

    return res.json({
      success: true,
      selectedMonth: targetMonth,
      config: {
        baseTarget: config.baseTarget,
        productionStep: config.productionStep,
        incentivePerStep: config.incentivePerStep
      },
      stats: {
        totalEmployees: employees.length,
        totalProduction: totalCompanyProduction,
        totalIncentives: totalCompanyIncentives,
        totalBaseSalaries: totalCompanySalaries,
        totalGrossPayroll,
        averageProductionPerEmployee: employees.length > 0 ? Math.round(totalCompanyProduction / employees.length) : 0,
        topPerformer: topPerformer
          ? { name: topPerformer.name, employeeId: topPerformer.employeeId, production: topPerformer.monthlyProduction }
          : null
      },
      employees: summaryPerEmployee
    });
  } catch (error) {
    console.error('Error getting monthly production summary:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ======================================================================
// ૪. SALARY INCREMENT MANAGEMENT (પગાર વધારો)
// ======================================================================
export async function incrementSalary(req, res) {
  try {
    const {
      employeeId,
      incrementType = 'amount', // 'amount' | 'percentage'
      incrementValue,
      effectiveDate,
      reason,
      approvedBy,
      calculateArrears = true
    } = req.body;

    if (!employeeId || incrementValue === undefined || Number(incrementValue) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'કર્મચારી અને યોગ્ય વધારાની રકમ જરૂરી છે.'
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'પગાર વધારાનું કારણ (Reason) લખવું ફરજિયાત છે.'
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'કર્મચારી મળ્યા નથી' });
    }

    const previousSalary = Number(employee.currentMonthlySalary) || 0;
    let changeAmount = 0;
    let percentage = 0;

    if (incrementType === 'percentage') {
      percentage = Number(incrementValue);
      changeAmount = Math.round((previousSalary * percentage) / 100);
    } else {
      changeAmount = Number(incrementValue);
      percentage = previousSalary > 0 ? Number(((changeAmount / previousSalary) * 100).toFixed(2)) : 100;
    }

    const revisedSalary = previousSalary + changeAmount;
    const effDate = effectiveDate ? new Date(effectiveDate) : new Date();

    // જો અસરકારક તારીખ ભૂતકાળની હોય તો આપોઆપ Arrears (એરિયર્સ) ગણતરી કરો
    let totalArrearsGenerated = 0;
    const today = new Date();
    const effMonth = getMonthKey(effDate);
    const currentMonth = getMonthKey(today);

    if (calculateArrears && effMonth < currentMonth) {
      // કેટલા મહિના બાકી નીકળે છે તેની ગણતરી
      const [effY, effM] = effMonth.split('-').map(Number);
      const [curY, curM] = currentMonth.split('-').map(Number);
      const monthsDiff = (curY - effY) * 12 + (curM - effM);

      if (monthsDiff > 0) {
        totalArrearsGenerated = monthsDiff * changeAmount;
        // દરેક પાછલા મહિના માટે એરિયર્સ રેકોર્ડ ઉમેરો
        for (let i = 0; i < monthsDiff; i++) {
          let y = effY;
          let m = effM + i;
          while (m > 12) {
            m -= 12;
            y += 1;
          }
          const mKey = `${y}-${String(m).padStart(2, '0')}`;
          employee.arrears.push({
            month: mKey,
            amount: changeAmount,
            previousSalary,
            revisedSalary,
            reason: `${effMonth} થી લાગુ થયેલ પગાર વધારાનું એરિયર્સ (Increment Arrears)`,
            status: 'Pending'
          });
        }
      }
    }

    // પગાર રિવિઝન ઇતિહાસમાં નવો રેકોર્ડ ઉમેરો (Never overwrite history)
    employee.salaryHistory.push({
      changeType: 'Increment',
      previousSalary,
      revisedSalary,
      changeAmount,
      percentage,
      effectiveDate: effDate,
      reason: reason.trim(),
      approvedBy: approvedBy || 'Admin',
      status: 'Approved',
      arrearsGenerated: totalArrearsGenerated
    });

    // નવો પગાર અને વાર્ષિક CTC અપડેટ કરો
    employee.currentMonthlySalary = revisedSalary;
    employee.annualCTC = revisedSalary * 12;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: `${employee.name} નો પગાર ₹${previousSalary.toLocaleString('en-IN')} થી વધારીને ₹${revisedSalary.toLocaleString('en-IN')} કર્યો! (+₹${changeAmount.toLocaleString('en-IN')})`,
      employee,
      arrearsGenerated: totalArrearsGenerated
    });
  } catch (error) {
    console.error('Error incrementing salary:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ======================================================================
// ૫. SALARY DECREMENT MANAGEMENT (પગાર ઘટાડો)
// ======================================================================
export async function decrementSalary(req, res) {
  try {
    const {
      employeeId,
      decrementType = 'amount',
      decrementValue,
      effectiveDate,
      reason,
      approvedBy
    } = req.body;

    if (!employeeId || decrementValue === undefined || Number(decrementValue) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'કર્મચારી અને યોગ્ય ઘટાડાની રકમ જરૂરી છે.'
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'પગાર ઘટાડાનું કારણ (Reason) લખવું ફરજિયાત છે.'
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'કર્મચારી મળ્યા નથી' });
    }

    const previousSalary = Number(employee.currentMonthlySalary) || 0;
    let changeAmount = 0;
    let percentage = 0;

    if (decrementType === 'percentage') {
      percentage = Number(decrementValue);
      changeAmount = Math.round((previousSalary * percentage) / 100);
    } else {
      changeAmount = Number(decrementValue);
      percentage = previousSalary > 0 ? Number(((changeAmount / previousSalary) * 100).toFixed(2)) : 0;
    }

    if (changeAmount >= previousSalary) {
      return res.status(400).json({
        success: false,
        message: 'ઘટાડાની રકમ વર્તમાન પગાર કરતાં વધુ કે સરખી ન હોઈ શકે.'
      });
    }

    const revisedSalary = previousSalary - changeAmount;
    const effDate = effectiveDate ? new Date(effectiveDate) : new Date();

    // ક્યારેય જૂના રેકોર્ડ ઓવરરાઇટ ન કરો, હંમેશા હિસ્ટ્રીમાં નવો રેકોર્ડ ઉમેરો
    employee.salaryHistory.push({
      changeType: 'Decrement',
      previousSalary,
      revisedSalary,
      changeAmount: -changeAmount,
      percentage: -percentage,
      effectiveDate: effDate,
      reason: reason.trim(),
      approvedBy: approvedBy || 'Admin',
      status: 'Approved'
    });

    employee.currentMonthlySalary = revisedSalary;
    employee.annualCTC = revisedSalary * 12;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: `${employee.name} નો પગાર ₹${previousSalary.toLocaleString('en-IN')} થી ઘટાડીને ₹${revisedSalary.toLocaleString('en-IN')} કર્યો! (-₹${changeAmount.toLocaleString('en-IN')})`,
      employee
    });
  } catch (error) {
    console.error('Error decrementing salary:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ======================================================================
// ૬. PENDING SALARY & ARREARS MANAGEMENT (એરિયર્સ અને બાકી પગાર)
// ======================================================================

// ૬.૧ તમામ એરિયર્સની યાદી (List All Arrears across Employees)
export async function listArrears(req, res) {
  try {
    const { status, month, employeeId } = req.query;

    const filter = {};
    if (employeeId) {
      filter._id = employeeId;
    }

    const employees = await Employee.find(filter).select('employeeId name department designation arrears currentMonthlySalary');

    let allArrears = [];
    employees.forEach((emp) => {
      (emp.arrears || []).forEach((arr) => {
        if (status && arr.status !== status) return;
        if (month && arr.month !== month) return;

        allArrears.push({
          _id: arr._id,
          employeeDbId: emp._id,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          department: emp.department,
          designation: emp.designation,
          currentMonthlySalary: emp.currentMonthlySalary,
          month: arr.month,
          amount: arr.amount,
          previousSalary: arr.previousSalary,
          revisedSalary: arr.revisedSalary,
          reason: arr.reason,
          status: arr.status,
          paidDate: arr.paidDate,
          paidNote: arr.paidNote,
          paymentMode: arr.paymentMode,
          createdAt: arr.createdAt
        });
      });
    });

    // નવીનતમ તારીખ પ્રમાણે ક્રમ
    allArrears.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const pendingTotal = allArrears
      .filter((a) => a.status === 'Pending' || a.status === 'પેન્ડિંગ')
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);

    const paidTotal = allArrears
      .filter((a) => a.status === 'Paid' || a.status === 'ચૂકતે')
      .reduce((s, a) => s + (Number(a.amount) || 0), 0);

    return res.json({
      success: true,
      count: allArrears.length,
      pendingTotal,
      paidTotal,
      arrears: allArrears
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૬.૨ એરિયર્સ ચૂકવણી કમ્પ્લીટ કરો (Settle / Mark Arrear as Paid)
export async function settleArrear(req, res) {
  try {
    const { employeeId, arrearId } = req.params;
    const { paymentMode, paidNote, paidDate } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'કર્મચારી મળ્યા નથી' });
    }

    const arrear = employee.arrears.id(arrearId);
    if (!arrear) {
      return res.status(404).json({ success: false, message: 'એરિયર્સ રેકોર્ડ મળ્યો નથી' });
    }

    arrear.status = 'Paid';
    arrear.paidDate = paidDate ? new Date(paidDate) : new Date();
    arrear.paymentMode = paymentMode || 'Cash';
    arrear.paidNote = paidNote || 'એરિયર્સ ચૂકતે કર્યું';

    await employee.save();

    return res.json({
      success: true,
      message: `₹${arrear.amount.toLocaleString('en-IN')} નું એરિયર્સ ચૂકતે થઈ ગયું!`,
      employee
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૬.૩ મેન્યુઅલ એરિયર્સ / બાકી પગાર ઉમેરો (Add Manual Arrear Entry)
export async function addManualArrear(req, res) {
  try {
    const { employeeId, month, amount, reason } = req.body;
    if (!employeeId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'કર્મચારી અને યોગ્ય રકમ જરૂરી છે.'
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'કર્મચારી મળ્યા નથી' });
    }

    employee.arrears.push({
      month: month || getMonthKey(new Date()),
      amount: Number(amount),
      previousSalary: employee.currentMonthlySalary,
      revisedSalary: employee.currentMonthlySalary,
      reason: reason || 'બાકી પગાર / એરિયર્સ (Pending Salary / Arrear)',
      status: 'Pending'
    });

    await employee.save();

    return res.status(201).json({
      success: true,
      message: 'એરિયર્સ એન્ટ્રી સફળતાપૂર્વક ઉમેરાઈ ગઈ!',
      employee
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ======================================================================
// ૭. INCENTIVE STRUCTURE CONFIGURATION (ઇન્સેન્ટિવ માળખા સેટિંગ્સ)
// ======================================================================

// ૭.૧ કન્ફિગ મેળવો
export async function getIncentiveConfig(req, res) {
  try {
    const config = await getActiveConfig();
    return res.json({ success: true, config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૭.૨ કન્ફિગ અપડેટ કરો
export async function updateIncentiveConfig(req, res) {
  try {
    const { baseTarget, productionStep, incentivePerStep, description } = req.body;

    if (Number(baseTarget) <= 0 || Number(productionStep) <= 0 || Number(incentivePerStep) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ટાર્ગેટ, સ્ટેપ અને ઇન્સેન્ટિવ રકમ શૂન્ય કરતાં વધુ હોવી જોઈએ.'
      });
    }

    let config = await ProductionConfig.findOne().sort({ createdAt: -1 });
    if (!config) {
      config = new ProductionConfig();
    }

    config.baseTarget = Number(baseTarget);
    config.productionStep = Number(productionStep);
    config.incentivePerStep = Number(incentivePerStep);
    if (description) config.description = description.trim();
    config.updatedBy = req.user?.name || 'Admin';

    await config.save();

    return res.json({
      success: true,
      message: 'ઇન્સેન્ટિવ ગણતરી માળખું સફળતાપૂર્વક સેવ થયું!',
      config
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

