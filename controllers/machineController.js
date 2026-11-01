import Machine from '../models/Machine.js';

// સહાયક ફંક્શન: તારીખમાંથી YYYY-MM મેળવો
function getMonthKey(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ૧. મશીનોની યાદી (List Machines with Month Metrics)
export async function listMachines(req, res) {
  try {
    const { search, status, month } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { machineType: { $regex: search, $options: 'i' } },
        { defaultOperatorName: { $regex: search, $options: 'i' } }
      ];
    }

    let machines = await Machine.find(query).sort({ code: 1, createdAt: -1 });

    // જો કોઈ મશીન ન હોય તો ડિફોલ્ટ ૨-૩ મશીન આપોઆપ બનાવી આપો (Auto-seed initial machines)
    if (machines.length === 0 && !search && !status) {
      await Machine.insertMany([
        {
          name: 'Machine #01 (24 Head Multi)',
          code: 'M-01',
          machineType: '24 Head Multi-Head',
          headCount: 24,
          status: 'Active',
          dailyTarget: 25000,
          dailyStitchTarget: 500000,
          notes: 'Main 24 head embroidery machine'
        },
        {
          name: 'Machine #02 (Cording & Sequin)',
          code: 'M-02',
          machineType: 'Cording & Sequin Embroidery',
          headCount: 24,
          status: 'Active',
          dailyTarget: 30000,
          dailyStitchTarget: 450000,
          notes: 'Special work machine with cording attachment'
        },
        {
          name: 'Machine #03 (Flat Embroidery)',
          code: 'M-03',
          machineType: 'Flat High-Speed',
          headCount: 30,
          status: 'Active',
          dailyTarget: 35000,
          dailyStitchTarget: 600000,
          notes: 'High speed flat embroidery machine'
        }
      ]);
      machines = await Machine.find(query).sort({ code: 1 });
    }

    const targetMonth = month || getMonthKey(new Date());

    const enrichedMachines = machines.map((doc) => {
      const m = doc.toObject({ virtuals: true });

      const monthProductions = (m.dailyProductions || []).filter((p) => {
        const itemMonth = p.month || getMonthKey(p.date);
        return itemMonth === targetMonth;
      });

      const totalProduction = monthProductions.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const totalStitches = monthProductions.reduce((s, p) => s + (Number(p.stitches) || 0), 0);
      const totalQuantity = monthProductions.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
      const totalDowntime = monthProductions.reduce((s, p) => s + (Number(p.downtimeMinutes) || 0), 0);

      const targetMonthly = (Number(m.dailyTarget) || 25000) * 30;
      const targetProgress = targetMonthly > 0 ? Math.min(100, Math.round((totalProduction / targetMonthly) * 100)) : 100;

      return {
        ...m,
        selectedMonth: targetMonth,
        monthDailyProductions: monthProductions,
        monthTotalProduction: totalProduction,
        monthTotalStitches: totalStitches,
        monthTotalQuantity: totalQuantity,
        monthTotalDowntime: totalDowntime,
        monthEntriesCount: monthProductions.length,
        targetMonthly,
        targetProgress
      };
    });

    // કંપની ઓવરઓલ મશીન આંકડા
    const totalCompanyProduction = enrichedMachines.reduce((s, m) => s + m.monthTotalProduction, 0);
    const totalCompanyStitches = enrichedMachines.reduce((s, m) => s + m.monthTotalStitches, 0);
    const totalCompanyQuantity = enrichedMachines.reduce((s, m) => s + m.monthTotalQuantity, 0);
    const totalCompanyDowntime = enrichedMachines.reduce((s, m) => s + m.monthTotalDowntime, 0);

    return res.json({
      success: true,
      selectedMonth: targetMonth,
      count: enrichedMachines.length,
      stats: {
        totalMachines: enrichedMachines.length,
        activeMachines: enrichedMachines.filter((m) => m.status === 'Active').length,
        maintenanceMachines: enrichedMachines.filter((m) => m.status === 'Under Maintenance').length,
        totalCompanyProduction,
        totalCompanyStitches,
        totalCompanyQuantity,
        totalCompanyDowntime
      },
      machines: enrichedMachines
    });
  } catch (error) {
    console.error('Error fetching machines:', error);
    return res.status(500).json({
      success: false,
      message: 'મશીનોની માહિતી લાવવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// ૨. એક મશીન ની વિગતો (Get Single Machine)
export async function getMachine(req, res) {
  try {
    const machine = await Machine.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'મશીન મળ્યું નથી (Machine not found)' });
    }
    return res.json({ success: true, machine });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૩. નવું મશીન ઉમેરો (Create Machine)
export async function createMachine(req, res) {
  try {
    const {
      name,
      code,
      machineType,
      headCount,
      model,
      status,
      defaultOperatorName,
      defaultOperator,
      dailyTarget,
      dailyStitchTarget,
      notes
    } = req.body;

    if (!name || !code || !machineType) {
      return res.status(400).json({
        success: false,
        message: 'મશીનનું નામ, કોડ અને પ્રકાર જરૂરી છે. (Name, code, and type are required.)'
      });
    }

    const existing = await Machine.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `મશીન કોડ "${code}" પહેલાથી અસ્તિત્વમાં છે. નવો કોડ વાપરો.`
      });
    }

    const machine = await Machine.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      machineType: machineType.trim(),
      headCount: Number(headCount) || 24,
      model: model ? model.trim() : '',
      status: status || 'Active',
      defaultOperatorName: defaultOperatorName ? defaultOperatorName.trim() : '',
      defaultOperator: defaultOperator || null,
      dailyTarget: Number(dailyTarget) || 25000,
      dailyStitchTarget: Number(dailyStitchTarget) || 500000,
      notes: notes || ''
    });

    return res.status(201).json({
      success: true,
      message: 'નવું મશીન સફળતાપૂર્વક ઉમેરાઈ ગયું!',
      machine
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૪. મશીન સુધારો (Update Machine)
export async function updateMachine(req, res) {
  try {
    const {
      name,
      code,
      machineType,
      headCount,
      model,
      status,
      defaultOperatorName,
      defaultOperator,
      dailyTarget,
      dailyStitchTarget,
      notes
    } = req.body;

    const machine = await Machine.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'મશીન મળ્યું નથી' });
    }

    if (code && code.trim().toUpperCase() !== machine.code) {
      const existing = await Machine.findOne({ code: code.trim().toUpperCase() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `મશીન કોડ "${code}" પહેલાથી વપરાયેલ છે.`
        });
      }
      machine.code = code.trim().toUpperCase();
    }

    if (name) machine.name = name.trim();
    if (machineType) machine.machineType = machineType.trim();
    if (headCount !== undefined) machine.headCount = Number(headCount);
    if (model !== undefined) machine.model = model.trim();
    if (status) machine.status = status;
    if (defaultOperatorName !== undefined) machine.defaultOperatorName = defaultOperatorName.trim();
    if (defaultOperator !== undefined) machine.defaultOperator = defaultOperator;
    if (dailyTarget !== undefined) machine.dailyTarget = Number(dailyTarget);
    if (dailyStitchTarget !== undefined) machine.dailyStitchTarget = Number(dailyStitchTarget);
    if (notes !== undefined) machine.notes = notes;

    await machine.save();

    return res.json({
      success: true,
      message: 'મશીનની વિગતો સફળતાપૂર્વક અપડેટ થઈ ગઈ!',
      machine
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૫. મશીન કાઢી નાખો (Delete Machine)
export async function deleteMachine(req, res) {
  try {
    const machine = await Machine.findByIdAndDelete(req.params.id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'મશીન મળ્યું નથી' });
    }

    return res.json({
      success: true,
      message: 'મશીન સફળતાપૂર્વક કાઢી નાખવામાં આવ્યું!'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૬. મશીન માટે દૈનિક પ્રોડક્શન ઉમેરો (Add Machine Daily Production)
export async function addMachineDailyProduction(req, res) {
  try {
    const {
      date,
      shift,
      operatorName,
      operator,
      merchantName,
      merchant,
      designNo,
      stitches,
      amount,
      quantity,
      downtimeMinutes,
      remarks,
      month
    } = req.body;

    if (amount === undefined || Number(amount) < 0) {
      return res.status(400).json({
        success: false,
        message: 'પ્રોડક્શન રકમ (₹) દાખલ કરો.'
      });
    }

    const machine = await Machine.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'મશીન મળ્યું નથી' });
    }

    const recordDate = date ? new Date(date) : new Date();
    const targetMonth = month || getMonthKey(recordDate);

    machine.dailyProductions.push({
      date: recordDate,
      month: targetMonth,
      shift: shift || 'Day',
      operatorName: operatorName || machine.defaultOperatorName || '',
      operator: operator || machine.defaultOperator || null,
      merchantName: merchantName || '',
      merchant: merchant || null,
      designNo: designNo || '',
      stitches: Number(stitches) || 0,
      amount: Number(amount),
      quantity: Number(quantity) || 0,
      downtimeMinutes: Number(downtimeMinutes) || 0,
      remarks: remarks || ''
    });

    await machine.save();

    return res.status(201).json({
      success: true,
      message: `${machine.name} માટે ₹${Number(amount).toLocaleString('en-IN')} નું દૈનિક પ્રોડક્શન નોંધાઈ ગયું!`,
      machine
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૭. મશીન ની દૈનિક પ્રોડક્શન એન્ટ્રી ડિલીટ કરો (Delete Machine Daily Entry)
export async function deleteMachineDailyProduction(req, res) {
  try {
    const machine = await Machine.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'મશીન મળ્યું નથી' });
    }

    machine.dailyProductions = machine.dailyProductions.filter(
      (p) => p._id.toString() !== req.params.entryId
    );

    await machine.save();

    return res.json({
      success: true,
      message: 'મશીન પ્રોડક્શન એન્ટ્રી સફળતાપૂર્વક ડિલીટ થઈ ગઈ!',
      machine
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૮. તમામ મશીનો ની દૈનિક એન્ટ્રીઓ (List All Machine Daily Productions)
export async function listAllMachineDailyProductions(req, res) {
  try {
    const { month, date, shift, machineId } = req.query;
    const targetMonth = month || getMonthKey(new Date());

    const query = {};
    if (machineId) query._id = machineId;

    const machines = await Machine.find(query);

    let allEntries = [];
    machines.forEach((m) => {
      (m.dailyProductions || []).forEach((p) => {
        const itemMonth = p.month || getMonthKey(p.date);
        const itemDateStr = p.date ? new Date(p.date).toISOString().split('T')[0] : '';

        if (targetMonth && itemMonth !== targetMonth) return;
        if (date && itemDateStr !== date) return;
        if (shift && p.shift !== shift) return;

        allEntries.push({
          ...p.toObject(),
          machineId: m._id,
          machineName: m.name,
          machineCode: m.code,
          machineType: m.machineType
        });
      });
    });

    allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.json({
      success: true,
      selectedMonth: targetMonth,
      count: allEntries.length,
      entries: allEntries
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
