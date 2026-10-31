import Worker from '../models/Worker.js';

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
        { machineType: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }

    const workers = await Worker.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, count: workers.length, workers });
  } catch (error) {
    console.error('Error fetching workers:', error);
    return res.status(500).json({
      success: false,
      message: 'કારીગરો લાવવામાં ભૂલ આવી: ' + error.message
    });
  }
}

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

export async function createWorker(req, res) {
  try {
    const { name, mobileNumber, role, machineType, salary, bonus, joinDate, notes, status } = req.body;

    if (!name || !mobileNumber || !machineType || salary === undefined) {
      return res.status(400).json({
        success: false,
        message: 'નામ, મોબાઇલ નંબર, મશીનનો પ્રકાર અને પગાર જરૂરી છે. (Name, mobile, machine type, and salary are required.)'
      });
    }

    const worker = await Worker.create({
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      role: role || 'Embroidery Operator',
      machineType: machineType.trim(),
      salary: Number(salary) || 0,
      bonus: Number(bonus) || 0,
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

export async function updateWorker(req, res) {
  try {
    const { name, mobileNumber, role, machineType, salary, bonus, joinDate, notes, status } = req.body;
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

export async function addWithdrawal(req, res) {
  try {
    const { amount, date, paymentMethod, note } = req.body;
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

    worker.withdrawals.push({
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
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

export async function addBonus(req, res) {
  try {
    const { amount, date, reason } = req.body;
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

    worker.bonuses.push({
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
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

export async function getWorkerSummary(req, res) {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'કારીગર મળ્યા નથી (Worker not found)'
      });
    }

    const cashWithdrawals = worker.withdrawals
      .filter((withdrawal) => withdrawal.paymentMethod === 'Cash' || withdrawal.paymentMethod === 'રોકડ')
      .reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0);
    const onlineWithdrawals = worker.withdrawals
      .filter((withdrawal) => withdrawal.paymentMethod === 'Online' || withdrawal.paymentMethod === 'ઓનલાઇન')
      .reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0);
    const totalWithdrawals = cashWithdrawals + onlineWithdrawals;
    const bonusFromHistory = worker.bonuses
      ? worker.bonuses.reduce((sum, bonus) => sum + (bonus.amount || 0), 0)
      : 0;
    const totalBonus = bonusFromHistory + (worker.bonus || 0);

    return res.json({
      success: true,
      workerId: worker._id,
      name: worker.name,
      role: worker.role,
      machineType: worker.machineType,
      monthlySalary: worker.salary,
      totalBonus,
      withdrawalsSummary: {
        cashTotal: cashWithdrawals,
        onlineTotal: onlineWithdrawals,
        totalWithdrawn: totalWithdrawals,
        count: worker.withdrawals.length
      },
      netPayable: worker.salary + totalBonus - totalWithdrawals
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
