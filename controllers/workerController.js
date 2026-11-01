import Worker from '../models/Worker.js';

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

// ૧. કારીગરોની યાદી (List Workers with Month Filtering & Settlement Status)
export async function listWorkers(req, res) {
  try {
    const { search, status, month } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { machineType: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }

    const workers = await Worker.find(query).sort({ createdAt: -1 });

    // જો કોઈ ચોક્કસ મહિનો માંગ્યો હોય તો તે મહિના પ્રમાણે ગણતરી કરો
    const targetMonth = month || getMonthKey(new Date());

    const enrichedWorkers = workers.map((workerDoc) => {
      const worker = workerDoc.toObject({ virtuals: true });

      // તે મહિનાના ઉપાડ ફિલ્ટર કરો
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

      const totalWithdrawalsForMonth = cashWithdrawals + onlineWithdrawals;

      // તે મહિનાના બોનસ
      const monthBonuses = (worker.bonuses || []).filter((b) => {
        const itemMonth = b.month || getMonthKey(b.date);
        return itemMonth === targetMonth;
      });

      const totalBonusForMonth = monthBonuses.reduce(
        (sum, b) => sum + (Number(b.amount) || 0),
        0
      );

      // તપાસો કે આ મહિનાનો પગાર ચૂકવાઈ ગયો છે? (Settlement check)
      const settlement = (worker.monthlySettlements || []).find(
        (s) => s.month === targetMonth
      );

      const isSettled = Boolean(settlement && settlement.status === 'Completed');
      const netPayableForMonth = isSettled
        ? 0
        : (worker.salary + totalBonusForMonth) - totalWithdrawalsForMonth;

      return {
        ...worker,
        selectedMonth: targetMonth,
        monthWithdrawals,
        monthCashWithdrawals: cashWithdrawals,
        monthOnlineWithdrawals: onlineWithdrawals,
        monthTotalWithdrawals: totalWithdrawalsForMonth,
        monthBonuses,
        monthTotalBonus: totalBonusForMonth,
        monthNetPayable: netPayableForMonth,
        settlement: settlement || null,
        isSettled
      };
    });

    return res.json({
      success: true,
      selectedMonth: targetMonth,
      count: enrichedWorkers.length,
      workers: enrichedWorkers
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
    const { name, mobileNumber, role, machineType, salary, bonus, joinDate, notes, status, activeMonth } = req.body;

    if (!name || !mobileNumber || !machineType || salary === undefined) {
      return res.status(400).json({
        success: false,
        message: 'નામ, મોબાઇલ નંબર, મશીનનો પ્રકાર અને પગાર જરૂરી છે. (Name, mobile, machine type, and salary are required.)'
      });
    }

    const currentMonth = activeMonth || getMonthKey(new Date());

    const worker = await Worker.create({
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      role: role || 'Embroidery Operator',
      machineType: machineType.trim(),
      salary: Number(salary) || 0,
      bonus: Number(bonus) || 0,
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
    const { name, mobileNumber, role, machineType, salary, bonus, joinDate, notes, status, activeMonth } = req.body;
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
    if (machineType) worker.machineType = machineType.trim();
    if (salary !== undefined) worker.salary = Number(salary);
    if (bonus !== undefined) worker.bonus = Number(bonus);
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
      note: note || ''
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

// ૯. માસિક પગાર પતાવટ / કમ્પ્લીટ કરો (Settle Month Salary & Advance to Next Month)
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
