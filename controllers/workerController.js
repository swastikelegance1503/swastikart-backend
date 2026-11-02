import Worker from '../models/Worker.js';
import Machine from '../models/Machine.js';
import DailyProduction from '../models/DailyProduction.js';

// સહાયક ફંક્શન: તારીખમાંથી YYYY-MM મેળવો
function getMonthKey(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// સહાયક ફંક્શન: હવે પછીનો મહિનો મેળવો (દા.ત. 2026-10 -> 2026-11)
function getNextMonthKey(currentMonthKey) {
  const [yearStr, monthStr] = currentMonthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

// સહાયક ફંક્શન: દૈનિક મશીન ઉત્પાદન બોનસ ગણતરી (Daily Machine Production Bonus Calculation)
// નિયમ: જ્યારે મશીન ઉત્પાદન ૫,૦૦,૦૦૦ થી ૫,૫૦,૦૦૦ વચ્ચે હોય ત્યારે ૧ સ્લેબ (દા.ત. ₹૫૦) બોનસ
// ૫,૫૦,૦૦૧ થી ૬,૦૦,૦૦૦ વચ્ચે ૨ સ્લેબ (દા.ત. ₹૧૦૦), વગેરે
export function calculateDailyProductionBonus(amount, target = 500000, step = 50000, rate = 50) {
  const numericAmount = Number(amount) || 0;
  const numTarget = Number(target) || 500000;
  const numStep = Number(step) || 50000;
  const numRate = Number(rate) || 50;

  if (numericAmount < numTarget) {
    return 0;
  }

  const excess = numericAmount - numTarget;
  const slabs = Math.floor(excess / numStep) + 1;
  return slabs * numRate;
}

// સહાયક ફંક્શન: દૈનિક પ્રોડક્શન બોનસ અને સ્લેબ વિગત (Daily Bonus & Slab Detail)
// Formula: Bonus = ₹50 × (floor(Production / 50,000) - 9), for Production ≥ ₹5,00,000
export function calculateProductionBonus(amount) {
  const num = Number(amount) || 0;
  if (num < 500000) {
    return {
      bonus: 0,
      slab: '₹0 – ₹4,99,999',
      isEligible: false
    };
  }
  // User Formula: Bonus = ₹50 * (floor(Production / 50,000) - 9)
  const slabUnits = Math.floor(num / 50000) - 9;
  const bonus = 50 * slabUnits;
  const lower = (slabUnits + 9) * 50000;
  const upper = lower + 49999;
  return {
    bonus,
    slab: `₹${lower.toLocaleString('en-IN')} – ₹${upper.toLocaleString('en-IN')}`,
    isEligible: true
  };
}

// સહાયક ફંક્શન: કારીગરના મશીનનું દૈનિક ઉત્પાદન ચકાસી ઓટોમેટિક બોનસ સિન્ક કરો
export async function syncWorkerMachineBonuses(worker, targetMonth) {
  if (!worker || !worker.machine) return;

  try {
    const machine = await Machine.findById(worker.machine);
    if (!machine) return;

    const entries = (machine.dailyProductions || []).filter((p) => {
      const itemMonth = p.month || getMonthKey(p.date);
      return !targetMonth || itemMonth === targetMonth;
    });

    const target = Number(worker.targetProduction) || 500000;
    const step = Number(worker.productionStep) || 50000;
    const rate = Number(worker.incentiveRate) || 50;

    let hasChanges = false;
    const currentEntryIds = new Set(entries.map((e) => e._id.toString()));

    for (const entry of entries) {
      const amount = Number(entry.amount) || 0;
      const entryIdStr = entry._id.toString();
      const entryDate = entry.date ? new Date(entry.date) : new Date();
      const entryMonth = entry.month || getMonthKey(entryDate);
      const entryDateKey = entryDate.toISOString().slice(0, 10);

      const dailyBonus = calculateDailyProductionBonus(amount, target, step, rate);

      const existingIdx = (worker.bonuses || []).findIndex((b) => {
        if (!b.isAutoIncentive) return false;
        if (b.machineDailyEntryId && b.machineDailyEntryId.toString() === entryIdStr) return true;
        const bDateKey = b.date ? new Date(b.date).toISOString().slice(0, 10) : '';
        return (
          bDateKey === entryDateKey &&
          (b.machineId?.toString() === machine._id.toString() || b.machineCode === machine.code)
        );
      });

      if (dailyBonus > 0) {
        const reason = `દૈનિક ઉત્પાદન બોનસ (${machine.name} [${machine.code}] પર ₹${amount.toLocaleString('en-IN')} ઉત્પાદન)`;
        if (existingIdx > -1) {
          if (
            worker.bonuses[existingIdx].amount !== dailyBonus ||
            worker.bonuses[existingIdx].productionAmount !== amount ||
            !worker.bonuses[existingIdx].machineDailyEntryId
          ) {
            worker.bonuses[existingIdx].amount = dailyBonus;
            worker.bonuses[existingIdx].productionAmount = amount;
            worker.bonuses[existingIdx].machineId = machine._id;
            worker.bonuses[existingIdx].machineCode = machine.code;
            worker.bonuses[existingIdx].machineName = machine.name;
            worker.bonuses[existingIdx].machineDailyEntryId = entry._id;
            worker.bonuses[existingIdx].reason = reason;
            worker.bonuses[existingIdx].date = entryDate;
            worker.bonuses[existingIdx].month = entryMonth;
            hasChanges = true;
          }
        } else {
          worker.bonuses.push({
            amount: dailyBonus,
            date: entryDate,
            month: entryMonth,
            reason,
            isAutoIncentive: true,
            productionAmount: amount,
            machineId: machine._id,
            machineCode: machine.code,
            machineName: machine.name,
            machineDailyEntryId: entry._id
          });
          hasChanges = true;
        }
      } else {
        if (existingIdx > -1) {
          worker.bonuses.splice(existingIdx, 1);
          hasChanges = true;
        }
      }
    }

    if (targetMonth) {
      const beforeCount = worker.bonuses.length;
      worker.bonuses = worker.bonuses.filter((b) => {
        if (!b.isAutoIncentive) return true;
        const bMonth = b.month || getMonthKey(b.date);
        if (bMonth !== targetMonth) return true;
        if (b.machineId && b.machineId.toString() === machine._id.toString()) {
          if (b.machineDailyEntryId && !currentEntryIds.has(b.machineDailyEntryId.toString())) {
            return false;
          }
        }
        return true;
      });
      if (worker.bonuses.length !== beforeCount) hasChanges = true;
    }

    if (hasChanges) {
      await worker.save();
    }
  } catch (err) {
    console.error('Error in syncWorkerMachineBonuses:', err);
  }
}

// ૧. કારીગરોની યાદી (List Workers)
export async function listWorkers(req, res) {
  try {
    const { search, status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { machineName: { $regex: search, $options: 'i' } },
        { machineCode: { $regex: search, $options: 'i' } },
        { machineType: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }

    const workers = await Worker.find(query)
      .populate('machine', 'name code machineType heads')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: workers.length,
      workers
    });
  } catch (error) {
    console.error('Error fetching workers:', error);
    return res.status(500).json({
      success: false,
      message: 'કારીગરો લાવવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// ૨. એક કારીગર ની વિગતો (Get Single Worker)
export async function getWorker(req, res) {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    return res.json({ success: true, worker });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૩. નવો કારીગર ઉમેરો (Create Worker)
export async function createWorker(req, res) {
  try {
    const {
      name,
      mobileNumber,
      role,
      machine,
      machineId,
      machineName,
      machineCode,
      machineType,
      salary,
      bonus,
      targetProduction,
      productionStep,
      incentiveRate,
      joinDate,
      notes,
      status,
      activeMonth
    } = req.body;

    if (!name || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'નામ અને મોબાઇલ નંબર જરૂરી છે. (Name and mobile number are required.)'
      });
    }

    const currentMonth = activeMonth || getMonthKey(new Date());

    let resolvedMachine = machineId || machine || null;
    let resolvedMachineName = (machineName || '').trim();
    let resolvedMachineCode = (machineCode || '').trim();
    let resolvedMachineType = (machineType || '').trim();

    if (resolvedMachine) {
      try {
        const machineDoc = await Machine.findById(resolvedMachine);
        if (machineDoc) {
          resolvedMachineName = machineDoc.name;
          resolvedMachineCode = machineDoc.code;
          resolvedMachineType = machineDoc.machineType || resolvedMachineType;
        }
      } catch (mErr) {
        // ignore
      }
    }

    const worker = await Worker.create({
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      role: role || 'Embroidery Operator',
      machine: resolvedMachine,
      machineName: resolvedMachineName,
      machineCode: resolvedMachineCode,
      machineType: resolvedMachineType || 'Embroidery Machine',
      salary: Number(salary) || 0,
      bonus: Number(bonus) || 0,
      targetProduction: targetProduction !== undefined ? Number(targetProduction) : 500000,
      productionStep: productionStep !== undefined ? Number(productionStep) : 50000,
      incentiveRate: incentiveRate !== undefined ? Number(incentiveRate) : 50,
      activeMonth: currentMonth,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      status: status || 'Active',
      notes: notes || ''
    });

    return res.status(201).json({
      success: true,
      message: 'નવો કારીગર સફળતાપૂર્વક ઉમેરાઈ ગયો! (Worker added successfully!)',
      worker
    });
  } catch (error) {
    console.error('Error creating worker:', error);
    return res.status(500).json({
      success: false,
      message: 'કારીગર ઉમેરવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// ૪. કારીગર સુધારો (Update Worker)
export async function updateWorker(req, res) {
  try {
    const {
      name,
      mobileNumber,
      role,
      machine,
      machineId,
      machineName,
      machineCode,
      machineType,
      salary,
      bonus,
      targetProduction,
      productionStep,
      incentiveRate,
      joinDate,
      notes,
      status,
      activeMonth
    } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    if (name) worker.name = name.trim();
    if (mobileNumber) worker.mobileNumber = mobileNumber.trim();
    if (role) worker.role = role.trim();

    if (machineId !== undefined || machine !== undefined) {
      const targetMachineId = machineId || machine;
      if (!targetMachineId) {
        worker.machine = null;
        worker.machineName = '';
        worker.machineCode = '';
      } else {
        try {
          const machineDoc = await Machine.findById(targetMachineId);
          if (machineDoc) {
            worker.machine = machineDoc._id;
            worker.machineName = machineDoc.name;
            worker.machineCode = machineDoc.code;
            worker.machineType = machineDoc.machineType;
          }
        } catch (mErr) {
          // ignore
        }
      }
    }
    if (machineName !== undefined) worker.machineName = machineName.trim();
    if (machineCode !== undefined) worker.machineCode = machineCode.trim();
    if (machineType) worker.machineType = machineType.trim();

    if (salary !== undefined) worker.salary = Number(salary);
    if (bonus !== undefined) worker.bonus = Number(bonus);
    if (targetProduction !== undefined) worker.targetProduction = Number(targetProduction);
    if (productionStep !== undefined) worker.productionStep = Number(productionStep);
    if (incentiveRate !== undefined) worker.incentiveRate = Number(incentiveRate);
    if (joinDate) worker.joinDate = new Date(joinDate);
    if (notes !== undefined) worker.notes = notes;
    if (status) worker.status = status;
    if (activeMonth) worker.activeMonth = activeMonth;

    await worker.save();
    return res.json({
      success: true,
      message: 'કારીગરની વિગતો સફળતાપૂર્વક અપડેટ થઈ ગઈ! (Worker updated successfully!)',
      worker
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૫. કારીગર ડિલીટ કરો (Delete Worker)
export async function deleteWorker(req, res) {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    return res.json({
      success: true,
      message: 'કારીગર સફળતાપૂર્વક ડિલીટ થઈ ગયો! (Worker deleted successfully!)'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૬. ઉપાડ નોંધો (Add Withdrawal)
export async function addWithdrawal(req, res) {
  try {
    const { amount, date, paymentMethod, note, month } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ઉપાડની રકમ (Amount) જરૂરી અને યોગ્ય હોવી જોઈએ. (Valid withdrawal amount is required.)'
      });
    }

    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    const recordDate = date ? new Date(date) : new Date();
    const targetMonth = month || getMonthKey(recordDate);

    worker.withdrawals.push({
      amount: Number(amount),
      date: recordDate,
      month: targetMonth,
      paymentMethod: paymentMethod || 'Cash',
      note: note || '',
      addedBy: req.body.addedBy || 'Admin'
    });
    await worker.save();

    return res.status(201).json({
      success: true,
      message: 'ઉપાડ સફળતાપૂર્વક નોંધાઈ ગયો! (Withdrawal recorded successfully!)',
      worker
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૭. ઉપાડ ડિલીટ કરો (Delete Withdrawal Entry)
export async function deleteWithdrawal(req, res) {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    worker.withdrawals = worker.withdrawals.filter(
      (withdrawal) => withdrawal._id.toString() !== req.params.withdrawalId
    );
    await worker.save();

    return res.json({
      success: true,
      message: 'ઉપાડ એન્ટ્રી સફળતાપૂર્વક હટાવી દેવામાં આવી! (Withdrawal entry removed!)',
      worker
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૭.૧ ઉપાડ સુધારો (Update Withdrawal Entry)
export async function updateWithdrawal(req, res) {
  try {
    const { amount, date, paymentMethod, note, addedBy } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    const withdrawal = worker.withdrawals.id(req.params.withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'ઉપાડ એન્ટ્રી મળી નથી (Withdrawal entry not found)'
      });
    }

    if (amount !== undefined) withdrawal.amount = Number(amount);
    if (date) {
      withdrawal.date = new Date(date);
      withdrawal.month = getMonthKey(withdrawal.date);
    }
    if (paymentMethod) withdrawal.paymentMethod = paymentMethod;
    if (note !== undefined) withdrawal.note = note;
    if (addedBy) withdrawal.addedBy = addedBy;

    await worker.save();

    return res.json({
      success: true,
      message: 'ઉપાડ એન્ટ્રી સફળતાપૂર્વક સુધારી લેવાઈ!',
      worker,
      withdrawal
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૮. બોનસ ઉમેરો (Add Bonus)
export async function addBonus(req, res) {
  try {
    const { amount, date, reason, month } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'બોનસની રકમ જરૂરી અને યોગ્ય હોવી જોઈએ. (Valid bonus amount is required.)'
      });
    }

    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    const recordDate = date ? new Date(date) : new Date();
    const targetMonth = month || getMonthKey(recordDate);

    worker.bonuses.push({
      amount: Number(amount),
      date: recordDate,
      month: targetMonth,
      reason: reason || 'Bonus'
    });
    await worker.save();

    return res.status(201).json({
      success: true,
      message: 'બોનસ સફળતાપૂર્વક ઉમેરાઈ ગયું! (Bonus recorded successfully!)',
      worker
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૯. બોનસ ડિલીટ કરો (Delete Bonus Entry)
export async function deleteBonus(req, res) {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    worker.bonuses = (worker.bonuses || []).filter(
      (bonus) => bonus._id.toString() !== req.params.bonusId
    );
    await worker.save();

    return res.json({
      success: true,
      message: 'બોનસ એન્ટ્રી સફળતાપૂર્વક હટાવી દેવામાં આવી! (Bonus entry removed!)',
      worker
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧૦. માસિક પગાર પતાવટ / કમ્પ્લીટ કરો (Settle Month Salary & Advance to Next Month)
export async function settleMonth(req, res) {
  try {
    const { month, paymentMode, notes, settlementDate } = req.body;
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    const targetMonth = month || worker.activeMonth || getMonthKey(new Date());

    // તે મહિનાના તમામ ઉપાડ ની ગણતરી
    const monthWithdrawals = (worker.withdrawals || []).filter((w) => {
      const itemMonth = w.month || getMonthKey(w.date);
      return itemMonth === targetMonth;
    });

    const cashWithdrawals = monthWithdrawals
      .filter((w) => w.paymentMethod === 'Cash' || w.paymentMethod === 'રોકડ')
      .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    const onlineWithdrawals = monthWithdrawals
      .filter((w) => w.paymentMethod === 'Online' || w.paymentMethod === 'ઓનલાઇન')
      .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    const totalWithdrawals = cashWithdrawals + onlineWithdrawals;

    // તે મહિનાના તમામ બોનસ ની ગણતરી
    const monthBonuses = (worker.bonuses || []).filter((b) => {
      const itemMonth = b.month || getMonthKey(b.date);
      return itemMonth === targetMonth;
    });

    const totalBonus = monthBonuses.reduce(
      (sum, b) => sum + (Number(b.amount) || 0),
      0
    );

    const baseSalary = Number(req.body.baseSalary) || worker.salary || 0;
    const netPaid = (baseSalary + totalBonus) - totalWithdrawals;

    // જો આ મહિનાનું સેટલમેન્ટ પહેલેથી હોય તો અપડેટ કરો, નહિતર નવું ઉમેરો
    const existingIndex = (worker.monthlySettlements || []).findIndex(
      (s) => s.month === targetMonth
    );

    const settlementRecord = {
      month: targetMonth,
      baseSalary,
      totalBonus,
      totalWithdrawals,
      cashWithdrawals,
      onlineWithdrawals,
      netPaid,
      settlementDate: settlementDate ? new Date(settlementDate) : new Date(),
      paymentMode: paymentMode || 'Cash',
      status: 'Completed',
      notes: notes || '',
      createdAt: new Date()
    };

    if (existingIndex > -1) {
      worker.monthlySettlements[existingIndex] = settlementRecord;
    } else {
      worker.monthlySettlements.push(settlementRecord);
    }

    // મહિનો કમ્પ્લીટ થતાં જ આગલા મહિનાને સક્રિય મહિનો (activeMonth) બનાવી દો
    const nextMonth = getNextMonthKey(targetMonth);
    worker.activeMonth = nextMonth;

    await worker.save();

    return res.status(200).json({
      success: true,
      message: `${targetMonth} મહિનાનો પગાર સફળતાપૂર્વક ચૂકવાઈ ગયો! નવો મહિનો ${nextMonth} શરૂ થયો.`,
      settlement: settlementRecord,
      nextMonth,
      worker
    });
  } catch (error) {
    console.error('Error settling month:', error);
    return res.status(500).json({
      success: false,
      message: 'મહિનાની પતાવટ કરવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// ૧૦. પૂર્ણ થયેલ મહિનાના સેટલમેન્ટમાં સુધારો કરવો (Edit Completed Month Settlement)
export async function updateSettlement(req, res) {
  try {
    const { id, settlementId } = req.params;
    const { baseSalary, totalBonus, totalWithdrawals, netPaid, paymentMode, status, notes, settlementDate } = req.body;

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    const settlement = worker.monthlySettlements.id(settlementId);
    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'સેટલમેન્ટ રેકોર્ડ મળ્યો નથી (Settlement not found)'
      });
    }

    if (baseSalary !== undefined) settlement.baseSalary = Number(baseSalary);
    if (totalBonus !== undefined) settlement.totalBonus = Number(totalBonus);
    if (totalWithdrawals !== undefined) settlement.totalWithdrawals = Number(totalWithdrawals);
    if (netPaid !== undefined) settlement.netPaid = Number(netPaid);
    if (paymentMode) settlement.paymentMode = paymentMode;
    if (status) settlement.status = status;
    if (notes !== undefined) settlement.notes = notes;
    if (settlementDate) settlement.settlementDate = new Date(settlementDate);

    await worker.save();

    return res.json({
      success: true,
      message: 'મહિનાના હિસાબની વિગતો સફળતાપૂર્વક સુધારી લેવાઈ છે! (Settlement updated!)',
      settlement,
      worker
    });
  } catch (error) {
    console.error('Error updating settlement:', error);
    return res.status(500).json({
      success: false,
      message: 'સેટલમેન્ટ સુધારવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// ૧૦.૨ પગાર પતાવટ રદ કરો (Delete Settlement Record)
export async function deleteSettlement(req, res) {
  try {
    const { id, settlementId } = req.params;
    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    worker.monthlySettlements = (worker.monthlySettlements || []).filter(
      (s) => s._id.toString() !== settlementId
    );

    await worker.save();

    return res.json({
      success: true,
      message: 'પગાર પતાવટ રદ કરવામાં આવી!',
      worker
    });
  } catch (error) {
    console.error('Error deleting settlement:', error);
    return res.status(500).json({
      success: false,
      message: 'સેટલમેન્ટ રદ કરવામાં ભૂલ આવી: ' + error.message
    });
  }
}

// ૧૧. કારીગરની સમરી વિગતો (Get Worker Summary)
export async function getWorkerSummary(req, res) {
  try {
    const { month } = req.query;
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    const targetMonth = month || getMonthKey(new Date());

    const monthWithdrawals = (worker.withdrawals || []).filter((w) => {
      const itemMonth = w.month || getMonthKey(w.date);
      return itemMonth === targetMonth;
    });

    const cashWithdrawals = monthWithdrawals
      .filter((w) => w.paymentMethod === 'Cash' || w.paymentMethod === 'રોકડ')
      .reduce((sum, w) => sum + (w.amount || 0), 0);

    const onlineWithdrawals = monthWithdrawals
      .filter((w) => w.paymentMethod === 'Online' || w.paymentMethod === 'ઓનલાઇન')
      .reduce((sum, w) => sum + (w.amount || 0), 0);

    const totalWithdrawals = cashWithdrawals + onlineWithdrawals;

    const monthBonuses = (worker.bonuses || []).filter((b) => {
      const itemMonth = b.month || getMonthKey(b.date);
      return itemMonth === targetMonth;
    });

    const totalBonus = monthBonuses.reduce((sum, b) => sum + (b.amount || 0), 0);

    const settlement = (worker.monthlySettlements || []).find((s) => s.month === targetMonth);
    const isSettled = Boolean(settlement && settlement.status === 'Completed');

    return res.json({
      success: true,
      workerId: worker._id,
      name: worker.name,
      role: worker.role,
      machineType: worker.machineType,
      monthlySalary: worker.salary,
      targetMonth,
      totalBonus,
      withdrawalsSummary: {
        cashTotal: cashWithdrawals,
        onlineTotal: onlineWithdrawals,
        totalWithdrawn: totalWithdrawals,
        count: monthWithdrawals.length
      },
      netPayable: (worker.salary + totalBonus) - totalWithdrawals,
      settlement: settlement || null,
      isSettled
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ======================================================================
// કારીગર પ્રોડક્શન & ઓટો બોનસ સિન્ક્રોનાઇઝેશન (Worker Production & Auto Bonus)
// ======================================================================

// ૧૨. સહાયક: કારીગરના દૈનિક પ્રોડક્શન પરથી આપોઆપ બોનસ ગણતરી અને Worker મોડ્યુલના Bonuses માં સેવ કરવું
export function syncWorkerProductionIncentive(worker, monthKey, entryDate) {
  const targetMonth = monthKey || worker.activeMonth || getMonthKey(new Date());

  // તે મહિનાનું કુલ પ્રોડક્શન
  const monthDailyProductions = (worker.dailyProductions || []).filter((p) => {
    const itemMonth = p.month || getMonthKey(p.date);
    return itemMonth === targetMonth;
  });

  const totalProduction = monthDailyProductions.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const target = Number(worker.targetProduction) || 500000;
  const step = Number(worker.productionStep) || 50000;
  const rate = Number(worker.incentiveRate) || 50;

  // જો પ્રોડક્શન ટાર્ગેટ (દા.ત. ₹5,00,000) થી વધુ હોય તો બોનસ ગણો
  let incentive = 0;
  if (totalProduction > target && step > 0) {
    incentive = Math.floor((totalProduction - target) / step) * rate;
  }

  // વર્કરના બોનસ એરેમાં આ મહિનાનું ઓટો-ઇન્સેન્ટિવ બોનસ શોધો
  const existingBonusIndex = (worker.bonuses || []).findIndex((b) => {
    const bMonth = b.month || getMonthKey(b.date);
    return bMonth === targetMonth && b.isAutoIncentive;
  });

  if (incentive > 0) {
    const reasonText = `પ્રોડક્શન ઇન્સેન્ટિવ (₹${totalProduction.toLocaleString('en-IN')} ઉત્પાદન પર)`;
    if (existingBonusIndex > -1) {
      worker.bonuses[existingBonusIndex].amount = incentive;
      worker.bonuses[existingBonusIndex].reason = reasonText;
      worker.bonuses[existingBonusIndex].productionAmount = totalProduction;
      if (entryDate) worker.bonuses[existingBonusIndex].date = new Date(entryDate);
    } else {
      worker.bonuses.push({
        amount: incentive,
        date: entryDate ? new Date(entryDate) : new Date(),
        month: targetMonth,
        reason: reasonText,
        isAutoIncentive: true,
        productionAmount: totalProduction
      });
    }
  } else {
    // જો પ્રોડક્શન ટાર્ગેટથી ઓછું હોય તો ઓટો બોનસ હટાવો
    if (existingBonusIndex > -1) {
      worker.bonuses.splice(existingBonusIndex, 1);
    }
  }

  return { totalProduction, incentive };
}

// ૧૩. કારીગર માટે દૈનિક પ્રોડક્શન એન્ટ્રી ઉમેરો (Add Daily Production for Worker)
export async function addWorkerDailyProduction(req, res) {
  try {
    const { date, amount, quantity, remarks, month, machineId } = req.body;
    if (amount === undefined || Number(amount) < 0) {
      return res.status(400).json({
        success: false,
        message: 'યોગ્ય પ્રોડક્શન રકમ (₹) દાખલ કરો.'
      });
    }

    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'કારીગર મળ્યા નથી' });
    }

    const recordDate = date ? new Date(date) : new Date();
    const targetMonth = month || getMonthKey(recordDate);

    // Resolve machine details from worker or selected machine
    let mId = machineId || worker.machine || null;
    let mName = worker.machineName || '';
    let mCode = worker.machineCode || '';
    let mHeads = 24;
    let mDoc = null;

    if (mId) {
      try {
        const machineDoc = await Machine.findById(mId);
        if (machineDoc) {
          mDoc = machineDoc;
          mName = machineDoc.name;
          mCode = machineDoc.code;
          mHeads = machineDoc.headCount || machineDoc.heads || 24;
        }
      } catch (err) {
        // ignore
      }
    }

    const numAmount = Number(amount);
    const { bonus, slab } = calculateProductionBonus(numAmount);

    worker.dailyProductions.push({
      date: recordDate,
      month: targetMonth,
      amount: numAmount,
      quantity: Number(quantity) || 0,
      remarks: remarks || '',
      bonusAmount: bonus,
      slab,
      machineId: mId,
      machineName: mName,
      machineCode: mCode,
      machineHeadCount: mHeads
    });

    const createdEntry = worker.dailyProductions[worker.dailyProductions.length - 1];

    // Two-way sync: મશીન મોડ્યુલમાં પણ આ એન્ટ્રી આપોઆપ ઉમેરી દો
    if (mDoc) {
      try {
        const mDateStr = recordDate.toISOString().slice(0, 10);
        const alreadyInMachine = (mDoc.dailyProductions || []).some(
          (p) => new Date(p.date).toISOString().slice(0, 10) === mDateStr && Number(p.amount) === numAmount
        );
        if (!alreadyInMachine) {
          mDoc.dailyProductions.push({
            date: recordDate,
            month: targetMonth,
            shift: 'Day',
            operatorName: worker.name,
            operator: worker._id,
            workerName: worker.name,
            worker: worker._id,
            amount: numAmount,
            quantity: Number(quantity) || 0,
            remarks: remarks || 'વર્કર સેલેરી મોડ્યુલ એન્ટ્રી'
          });
          await mDoc.save();
          createdEntry.machineDailyEntryId = mDoc.dailyProductions[mDoc.dailyProductions.length - 1]._id;
        }
      } catch (mErr) {
        console.error('Error syncing to machine dailyProductions:', mErr);
      }
    }

    if (bonus > 0) {
      worker.bonuses.push({
        amount: bonus,
        date: recordDate,
        month: targetMonth,
        reason: `દૈનિક પ્રોડક્શન બોનસ (${slab})`,
        slab,
        isAutoIncentive: true,
        productionAmount: numAmount,
        machineId: mId,
        machineCode: mCode,
        machineName: mName,
        productionEntryId: createdEntry._id
      });
    }

    await worker.save();

    let bonusMsg = '';
    if (bonus > 0) {
      bonusMsg = ` તેમજ ₹${bonus} પ્રોડક્શન બોનસ (${slab}) આપોઆપ ઉમેરાઈ ગયું!`;
    }

    return res.status(201).json({
      success: true,
      message: `₹${numAmount.toLocaleString('en-IN')} નું દૈનિક પ્રોડક્શન સફળતાપૂર્વક નોંધાઈ ગયું!${bonusMsg}`,
      worker,
      productionEntry: createdEntry,
      bonus,
      slab
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧૩.૧ કારીગરની દૈનિક પ્રોડક્શન એન્ટ્રી સુધારો (Update Daily Production & Recalculate Bonus)
export async function updateWorkerDailyProduction(req, res) {
  try {
    const { date, amount, quantity, remarks } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'કારીગર મળ્યા નથી' });
    }

    const entry = worker.dailyProductions.id(req.params.entryId);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'પ્રોડક્શન એન્ટ્રી મળી નથી' });
    }

    if (amount !== undefined) {
      const numAmount = Number(amount);
      const { bonus, slab } = calculateProductionBonus(numAmount);
      entry.amount = numAmount;
      entry.bonusAmount = bonus;
      entry.slab = slab;

      const bonusIdx = (worker.bonuses || []).findIndex(
        (b) => b.productionEntryId && b.productionEntryId.toString() === entry._id.toString()
      );

      if (bonus > 0) {
        if (bonusIdx > -1) {
          worker.bonuses[bonusIdx].amount = bonus;
          worker.bonuses[bonusIdx].slab = slab;
          worker.bonuses[bonusIdx].productionAmount = numAmount;
          worker.bonuses[bonusIdx].reason = `દૈનિક પ્રોડક્શન બોનસ (${slab})`;
          if (date) worker.bonuses[bonusIdx].date = new Date(date);
        } else {
          worker.bonuses.push({
            amount: bonus,
            date: date ? new Date(date) : entry.date,
            month: entry.month || getMonthKey(entry.date),
            reason: `દૈનિક પ્રોડક્શન બોનસ (${slab})`,
            slab,
            isAutoIncentive: true,
            productionAmount: numAmount,
            machineId: entry.machineId,
            machineCode: entry.machineCode,
            machineName: entry.machineName,
            productionEntryId: entry._id
          });
        }
      } else {
        if (bonusIdx > -1) {
          worker.bonuses.splice(bonusIdx, 1);
        }
      }
    }

    if (date) {
      entry.date = new Date(date);
      entry.month = getMonthKey(entry.date);
    }
    if (quantity !== undefined) entry.quantity = Number(quantity);
    if (remarks !== undefined) entry.remarks = remarks;

    await worker.save();

    return res.json({
      success: true,
      message: 'પ્રોડક્શન એન્ટ્રી અને બોનસ સફળતાપૂર્વક અપડેટ થયા!',
      worker,
      productionEntry: entry
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧૪. કારીગરની દૈનિક પ્રોડક્શન એન્ટ્રી ડિલીટ કરો (Delete Daily Production)
export async function deleteWorkerDailyProduction(req, res) {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'કારીગર મળ્યા નથી' });
    }

    const entryIdStr = req.params.entryId.toString();
    const entryToDelete = (worker.dailyProductions || []).find((p) => p._id.toString() === entryIdStr);

    if (entryToDelete && entryToDelete.machineDailyEntryId) {
      try {
        await Machine.updateMany(
          { 'dailyProductions._id': entryToDelete.machineDailyEntryId },
          { $pull: { dailyProductions: { _id: entryToDelete.machineDailyEntryId } } }
        );
      } catch (mErr) {
        // ignore
      }
    }

    worker.dailyProductions = (worker.dailyProductions || []).filter(
      (p) => p._id.toString() !== entryIdStr
    );

    worker.bonuses = (worker.bonuses || []).filter(
      (b) => !b.productionEntryId || b.productionEntryId.toString() !== entryIdStr
    );

    await worker.save();

    return res.json({
      success: true,
      message: 'પ્રોડક્શન એન્ટ્રી અને બોનસ સફળતાપૂર્વક ડિલીટ થઈ ગઈ!',
      worker
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧૫. કારીગરનો પ્રોડક્શન ટાર્ગેટ અને બોનસ રેટ બદલો (Update Production Target & Bonus Rule)
export async function updateWorkerProductionRule(req, res) {
  try {
    const { targetProduction, productionStep, incentiveRate, month } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'કારીગર મળ્યા નથી' });
    }

    if (targetProduction !== undefined) worker.targetProduction = Number(targetProduction);
    if (productionStep !== undefined) worker.productionStep = Number(productionStep);
    if (incentiveRate !== undefined) worker.incentiveRate = Number(incentiveRate);

    const targetMonth = month || worker.activeMonth || getMonthKey(new Date());
    const syncResult = syncWorkerProductionIncentive(worker, targetMonth);
    await worker.save();

    return res.json({
      success: true,
      message: `${worker.name} માટે ટાર્ગેટ ₹${Number(worker.targetProduction).toLocaleString('en-IN')} અને બોનસ ₹${worker.incentiveRate} પ્રતિ ₹${worker.productionStep} નિયમ સેવ થયો!`,
      worker,
      syncResult
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧૫. તમામ કારીગરોના દૈનિક પ્રોડક્શન બોનસની યાદી (List All Production Bonuses for Month)
export async function listAllProductionBonuses(req, res) {
  try {
    const { month, workerId, machineId } = req.query;
    const targetMonth = month || getMonthKey(new Date());

    const activeWorkers = await Worker.find({ status: 'Active', machine: { $ne: null } });
    for (const w of activeWorkers) {
      await syncWorkerMachineBonuses(w, targetMonth);
    }

    const query = {};
    if (workerId) query._id = workerId;
    if (machineId) query.machine = machineId;

    const workers = await Worker.find(query);
    const bonusesList = [];

    for (const w of workers) {
      for (const b of (w.bonuses || [])) {
        const bMonth = b.month || getMonthKey(b.date);
        if (targetMonth && bMonth !== targetMonth) continue;
        if (!b.isAutoIncentive) continue;

        bonusesList.push({
          _id: b._id,
          date: b.date,
          month: bMonth,
          workerId: w._id,
          workerName: w.name,
          workerRole: w.role,
          machineId: b.machineId || w.machine,
          machineCode: b.machineCode || w.machineCode,
          machineName: b.machineName || w.machineName || w.machineType,
          productionAmount: Number(b.productionAmount) || 0,
          bonusAmount: Number(b.amount) || 0,
          reason: b.reason,
          targetProduction: Number(w.targetProduction) || 500000,
          productionStep: Number(w.productionStep) || 50000,
          incentiveRate: Number(w.incentiveRate) || 50
        });
      }
    }

    bonusesList.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalBonusAmount = bonusesList.reduce((sum, item) => sum + item.bonusAmount, 0);
    const totalProductionAmount = bonusesList.reduce((sum, item) => sum + item.productionAmount, 0);

    return res.json({
      success: true,
      selectedMonth: targetMonth,
      count: bonusesList.length,
      totalBonusAmount,
      totalProductionAmount,
      bonuses: bonusesList
    });
  } catch (error) {
    console.error('Error fetching production bonuses:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧૫.૫ મશીન મોડ્યુલ અને પ્રોડક્શન મોડ્યુલમાંથી કારીગરોમાં ડેટા આપોઆપ સિન્ક કરો
// (Auto-sync Machine Module & Production Module entries to Worker Daily Production & Bonuses)
export async function syncMachineAndProductionDataToWorkers(targetMonth) {
  try {
    const workers = await Worker.find({});
    const machines = await Machine.find({});
    let dailyProductions = [];
    try {
      dailyProductions = await DailyProduction.find(targetMonth ? { month: targetMonth } : {});
    } catch (e) {
      // ignore
    }

    let totalSynced = 0;

    for (const worker of workers) {
      let workerModified = false;
      const workerIdStr = worker._id.toString();
      const workerNameNorm = (worker.name || '').trim().toLowerCase();

      // ૧. કારીગર સાથે જોડાયેલ મશીન શોધો
      let assignedMachine = machines.find((m) => {
        if (worker.machine && m._id.toString() === worker.machine.toString()) return true;
        if (m.defaultOperator && m.defaultOperator.toString() === workerIdStr) return true;
        if (m.defaultOperatorName && m.defaultOperatorName.trim().toLowerCase() === workerNameNorm) return true;
        return false;
      });

      // A. અસાઇન મશીનની તમામ dailyProductions એન્ટ્રીઓ સિન્ક કરો
      if (assignedMachine && Array.isArray(assignedMachine.dailyProductions)) {
        for (const mEntry of assignedMachine.dailyProductions) {
          const mMonth = mEntry.month || getMonthKey(mEntry.date);
          if (targetMonth && mMonth !== targetMonth) continue;

          const mEntryIdStr = mEntry._id ? mEntry._id.toString() : '';
          const mDateStr = new Date(mEntry.date).toISOString().slice(0, 10);
          const mAmount = Number(mEntry.amount) || 0;

          const exists = (worker.dailyProductions || []).some((p) => {
            if (p.machineDailyEntryId && p.machineDailyEntryId.toString() === mEntryIdStr) return true;
            const pDateStr = p.date ? new Date(p.date).toISOString().slice(0, 10) : '';
            return pDateStr === mDateStr && Number(p.amount) === mAmount;
          });

          if (!exists) {
            const { bonus, slab } = calculateProductionBonus(mAmount);
            worker.dailyProductions.push({
              date: mEntry.date,
              month: mMonth,
              amount: mAmount,
              quantity: Number(mEntry.quantity) || 0,
              remarks: `${assignedMachine.name} (${assignedMachine.code}) - મશીન પ્રોડક્શન`,
              bonusAmount: bonus,
              slab,
              machineId: assignedMachine._id,
              machineName: assignedMachine.name,
              machineCode: assignedMachine.code,
              machineHeadCount: assignedMachine.headCount || 24,
              machineDailyEntryId: mEntry._id
            });

            const createdEntry = worker.dailyProductions[worker.dailyProductions.length - 1];

            if (bonus > 0) {
              const bonusExists = (worker.bonuses || []).some(
                (b) => b.machineDailyEntryId && b.machineDailyEntryId.toString() === mEntryIdStr
              );
              if (!bonusExists) {
                worker.bonuses.push({
                  amount: bonus,
                  date: mEntry.date,
                  month: mMonth,
                  reason: `દૈનિક પ્રોડક્શન બોનસ (${slab})`,
                  slab,
                  isAutoIncentive: true,
                  productionAmount: mAmount,
                  machineId: assignedMachine._id,
                  machineCode: assignedMachine.code,
                  machineName: assignedMachine.name,
                  machineDailyEntryId: mEntry._id,
                  productionEntryId: createdEntry._id
                });
              }
            }
            workerModified = true;
            totalSynced++;
          }
        }
      }

      // B. અન્ય કોઈપણ મશીન જેમાં આ કારીગર ઓપરેટર હોય તે પણ સિન્ક કરો
      for (const m of machines) {
        if (assignedMachine && m._id.toString() === assignedMachine._id.toString()) continue;
        for (const mEntry of m.dailyProductions || []) {
          const mMonth = mEntry.month || getMonthKey(mEntry.date);
          if (targetMonth && mMonth !== targetMonth) continue;

          const isThisWorker =
            (mEntry.operator && mEntry.operator.toString() === workerIdStr) ||
            (mEntry.worker && mEntry.worker.toString() === workerIdStr) ||
            (mEntry.operatorName && mEntry.operatorName.trim().toLowerCase() === workerNameNorm) ||
            (mEntry.workerName && mEntry.workerName.trim().toLowerCase() === workerNameNorm);

          if (isThisWorker) {
            const mEntryIdStr = mEntry._id ? mEntry._id.toString() : '';
            const mDateStr = new Date(mEntry.date).toISOString().slice(0, 10);
            const mAmount = Number(mEntry.amount) || 0;

            const exists = (worker.dailyProductions || []).some((p) => {
              if (p.machineDailyEntryId && p.machineDailyEntryId.toString() === mEntryIdStr) return true;
              const pDateStr = p.date ? new Date(p.date).toISOString().slice(0, 10) : '';
              return pDateStr === mDateStr && Number(p.amount) === mAmount;
            });

            if (!exists) {
              const { bonus, slab } = calculateProductionBonus(mAmount);
              worker.dailyProductions.push({
                date: mEntry.date,
                month: mMonth,
                amount: mAmount,
                quantity: Number(mEntry.quantity) || 0,
                remarks: `${m.name} (${m.code}) - મશીન પ્રોડક્શન`,
                bonusAmount: bonus,
                slab,
                machineId: m._id,
                machineName: m.name,
                machineCode: m.code,
                machineHeadCount: m.headCount || 24,
                machineDailyEntryId: mEntry._id
              });

              const createdEntry = worker.dailyProductions[worker.dailyProductions.length - 1];

              if (bonus > 0) {
                const bonusExists = (worker.bonuses || []).some(
                  (b) => b.machineDailyEntryId && b.machineDailyEntryId.toString() === mEntryIdStr
                );
                if (!bonusExists) {
                  worker.bonuses.push({
                    amount: bonus,
                    date: mEntry.date,
                    month: mMonth,
                    reason: `દૈનિક પ્રોડક્શન બોનસ (${slab})`,
                    slab,
                    isAutoIncentive: true,
                    productionAmount: mAmount,
                    machineId: m._id,
                    machineCode: m.code,
                    machineName: m.name,
                    machineDailyEntryId: mEntry._id,
                    productionEntryId: createdEntry._id
                  });
                }
              }
              workerModified = true;
              totalSynced++;
            }
          }
        }
      }

      // C. Production Module (DailyProduction) માંથી સિન્ક કરો
      for (const dp of dailyProductions) {
        const dpNameNorm = (dp.employeeName || '').trim().toLowerCase();
        if (dpNameNorm === workerNameNorm) {
          const dpDateStr = new Date(dp.date).toISOString().slice(0, 10);
          const dpAmount = Number(dp.amount) || 0;
          const dpIdStr = dp._id.toString();

          const exists = (worker.dailyProductions || []).some((p) => {
            if (p.machineDailyEntryId && p.machineDailyEntryId.toString() === dpIdStr) return true;
            const pDateStr = p.date ? new Date(p.date).toISOString().slice(0, 10) : '';
            return pDateStr === dpDateStr && Number(p.amount) === dpAmount;
          });

          if (!exists) {
            const { bonus, slab } = calculateProductionBonus(dpAmount);
            worker.dailyProductions.push({
              date: dp.date,
              month: dp.month || getMonthKey(dp.date),
              amount: dpAmount,
              quantity: Number(dp.quantity) || 0,
              remarks: dp.remarks || 'પ્રોડક્શન મોડ્યુલ એન્ટ્રી',
              bonusAmount: bonus,
              slab,
              machineId: worker.machine || null,
              machineName: worker.machineName || '',
              machineCode: worker.machineCode || '',
              machineHeadCount: 24,
              machineDailyEntryId: dp._id
            });
            const createdEntry = worker.dailyProductions[worker.dailyProductions.length - 1];
            if (bonus > 0) {
              worker.bonuses.push({
                amount: bonus,
                date: dp.date,
                month: dp.month || getMonthKey(dp.date),
                reason: `દૈનિક પ્રોડક્શન બોનસ (${slab})`,
                slab,
                isAutoIncentive: true,
                productionAmount: dpAmount,
                machineId: worker.machine || null,
                machineCode: worker.machineCode || '',
                machineName: worker.machineName || '',
                machineDailyEntryId: dp._id,
                productionEntryId: createdEntry._id
              });
            }
            workerModified = true;
            totalSynced++;
          }
        }
      }

      if (workerModified) {
        await worker.save();
      }
    }

    return totalSynced;
  } catch (err) {
    console.error('Error in syncMachineAndProductionDataToWorkers:', err);
    return 0;
  }
}

// ૧૫.૬ મેન્યુઅલ સિન્ક API એન્ડપોઇન્ટ (Sync Machine & Production Endpoint)
export async function syncMachineProductionEndpoint(req, res) {
  try {
    const targetMonth = req.body?.month || req.query?.month || getMonthKey(new Date());
    const count = await syncMachineAndProductionDataToWorkers(targetMonth);
    return res.json({
      success: true,
      message: count > 0
        ? `${count} નવી મશીન પ્રોડક્શન એન્ટ્રીઓ સફળતાપૂર્વક કારીગરમાં ઉમેરાઈ ગઈ!`
        : 'મશીન અને પ્રોડક્શન મોડ્યુલનો તમામ ડેટા પહેલેથી જ સિન્ક છે.',
      syncedCount: count
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ૧૬. કારીગર સેલેરી મેનેજમેન્ટ - સંપૂર્ણ ડેટા અને ડેશબોર્ડ (Workers Salary Management Complete Data)
export async function getSalaryManagement(req, res) {
  try {
    const { month, search, status, machineId, workerId } = req.query;
    const targetMonth = month || getMonthKey(new Date());

    // ⚡ AUTO-SYNC: મશીન મોડ્યુલ અને પ્રોડક્શન મોડ્યુલમાંથી ડેટા આપોઆપ કારીગરમાં ફેચ કરો
    await syncMachineAndProductionDataToWorkers(targetMonth);

    const query = {};
    if (status) query.status = status;
    if (machineId) query.machine = machineId;
    if (workerId) query._id = workerId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { machineName: { $regex: search, $options: 'i' } },
        { machineCode: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }

    const workers = await Worker.find(query)
      .populate('machine', 'name code machineType headCount heads')
      .sort({ createdAt: -1 });

    const allDailyProductions = [];
    const allBonuses = [];
    const allAdvances = [];

    const enrichedWorkers = workers.map((wDoc) => {
      const w = wDoc.toObject({ virtuals: true });
      const mHeads = w.machine?.headCount || w.machine?.heads || 24;
      const mName = w.machine?.name || w.machineName || '';
      const mCode = w.machine?.code || w.machineCode || '';
      const mType = w.machine?.machineType || w.machineType || '';

      // Month Productions
      const monthProductions = (w.dailyProductions || []).filter((p) => {
        const pMonth = p.month || getMonthKey(p.date);
        return !targetMonth || pMonth === targetMonth;
      });

      monthProductions.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate dynamic bonus for each production entry to ensure 100% accurate slab
      for (const p of monthProductions) {
        const numAmount = Number(p.amount) || 0;
        const bInfo = calculateProductionBonus(numAmount);
        p.bonusAmount = bInfo.bonus;
        p.slab = bInfo.slab;
      }

      const totalProduction = monthProductions.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      );

      // Pure production bonus (sum of each day's production bonus)
      const monthProductionBonus = monthProductions.reduce(
        (sum, p) => sum + (Number(p.bonusAmount) || 0),
        0
      );

      // Other / Manual Bonuses (e.g. Diwali bonus, not from daily production)
      const monthBonuses = (w.bonuses || []).filter((b) => {
        const bMonth = b.month || getMonthKey(b.date);
        return !targetMonth || bMonth === targetMonth;
      });

      const manualBonuses = monthBonuses.filter(
        (b) => !b.isAutoIncentive && !b.productionEntryId
      );

      const monthOtherBonus = manualBonuses.reduce(
        (sum, b) => sum + (Number(b.amount) || 0),
        0
      );

      // Total Bonus combines production slab bonus + other manual bonuses
      const totalBonus = monthProductionBonus + monthOtherBonus;

      // Month Advances (Withdrawals)
      const monthAdvances = (w.withdrawals || []).filter((wd) => {
        const wdMonth = wd.month || getMonthKey(wd.date);
        return !targetMonth || wdMonth === targetMonth;
      });

      monthAdvances.sort((a, b) => new Date(b.date) - new Date(a.date));

      const cashAdvance = monthAdvances
        .filter((wd) => wd.paymentMethod === 'Cash' || wd.paymentMethod === 'રોકડ')
        .reduce((sum, wd) => sum + (Number(wd.amount) || 0), 0);

      const onlineAdvance = monthAdvances
        .filter((wd) => wd.paymentMethod === 'Online' || wd.paymentMethod === 'ઓનલાઇન')
        .reduce((sum, wd) => sum + (Number(wd.amount) || 0), 0);

      const totalAdvance = cashAdvance + onlineAdvance;

      // Settlement check
      const settlement = (w.monthlySettlements || []).find((s) => s.month === targetMonth);
      const isSettled = Boolean(settlement && settlement.status === 'Completed');

      const monthlySalary = Number(w.salary) || 0;
      const netPayable = (monthlySalary + totalBonus) - totalAdvance;
      const paidAmount = isSettled ? (settlement.netPaid ?? netPayable) : 0;
      const remainingBalance = isSettled ? 0 : netPayable;
      const paymentStatus = isSettled ? 'Paid' : 'Pending';

      // Push to flattened lists for individual sub-tabs
      for (const p of monthProductions) {
        allDailyProductions.push({
          ...p,
          workerId: w._id,
          workerName: w.name,
          workerRole: w.role,
          machineName: p.machineName || mName,
          machineCode: p.machineCode || mCode,
          machineHeadCount: p.machineHeadCount || mHeads
        });

        // Date-wise Production Bonus History (1:1 with daily production >= 500,000)
        // Displays production amount and bonus amount separately, zero duplicates!
        if (p.bonusAmount > 0) {
          allBonuses.push({
            _id: `bonus-${p._id}`,
            date: p.date,
            month: p.month || targetMonth,
            workerId: w._id,
            workerName: w.name,
            workerRole: w.role,
            machineName: p.machineName || mName,
            machineCode: p.machineCode || mCode,
            productionAmount: p.amount,
            slab: p.slab,
            amount: p.bonusAmount,
            reason: `દૈનિક પ્રોડક્શન બોનસ (${p.slab})`,
            isAutoIncentive: true,
            isProductionBonus: true
          });
        }
      }

      // Other manual bonuses if any
      for (const b of manualBonuses) {
        allBonuses.push({
          ...b,
          workerId: w._id,
          workerName: w.name,
          workerRole: w.role,
          machineName: b.machineName || mName,
          machineCode: b.machineCode || mCode,
          productionAmount: 0,
          slab: 'અન્ય બોનસ (Manual)',
          isProductionBonus: false
        });
      }

      for (const wd of monthAdvances) {
        allAdvances.push({
          ...wd,
          workerId: w._id,
          workerName: w.name,
          workerRole: w.role
        });
      }

      return {
        ...w,
        machineName: mName,
        machineCode: mCode,
        machineHeadCount: mHeads,
        machineType: mType,
        monthlySalary,
        monthProduction: totalProduction,
        monthBonus: totalBonus,
        monthProductionBonus,
        monthOtherBonus,
        monthAdvance: totalAdvance,
        monthCashAdvance: cashAdvance,
        monthOnlineAdvance: onlineAdvance,
        netPayable,
        paidAmount,
        remainingBalance,
        paymentStatus,
        isSettled,
        settlement: settlement || null,
        monthDailyProductions: monthProductions,
        monthBonuses,
        monthAdvances
      };
    });

    allDailyProductions.sort((a, b) => new Date(b.date) - new Date(a.date));
    allBonuses.sort((a, b) => new Date(b.date) - new Date(a.date));
    allAdvances.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Dashboard Totals
    const totalWorkers = enrichedWorkers.length;
    const totalMonthlySalary = enrichedWorkers.reduce((sum, w) => sum + w.monthlySalary, 0);
    const totalProduction = enrichedWorkers.reduce((sum, w) => sum + w.monthProduction, 0);
    const totalBonus = enrichedWorkers.reduce((sum, w) => sum + w.monthBonus, 0);
    const totalProductionBonus = enrichedWorkers.reduce((sum, w) => sum + (w.monthProductionBonus || 0), 0);
    const totalOtherBonus = enrichedWorkers.reduce((sum, w) => sum + (w.monthOtherBonus || 0), 0);
    const totalAdvance = enrichedWorkers.reduce((sum, w) => sum + w.monthAdvance, 0);
    const totalPendingSalary = enrichedWorkers.reduce(
      (sum, w) => sum + (w.isSettled ? 0 : Math.max(0, w.netPayable)),
      0
    );
    const totalPaidSalary = enrichedWorkers.reduce(
      (sum, w) => sum + (w.isSettled ? w.paidAmount : 0),
      0
    );

    return res.json({
      success: true,
      selectedMonth: targetMonth,
      dashboard: {
        totalWorkers,
        totalMonthlySalary,
        totalProduction,
        totalBonus,
        totalProductionBonus,
        totalOtherBonus,
        totalAdvance,
        totalPendingSalary,
        totalPaidSalary
      },
      workers: enrichedWorkers,
      allDailyProductions,
      allBonuses,
      allAdvances
    });
  } catch (error) {
    console.error('Error in getSalaryManagement:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
