import { Router } from 'express';
import {
  // Employee Management
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  // Daily Production
  addDailyProduction,
  listDailyProduction,
  deleteDailyProduction,
  // Monthly Production & Incentive
  getMonthlyProductionSummary,
  // Salary Increment / Decrement
  incrementSalary,
  decrementSalary,
  // Arrears
  listArrears,
  settleArrear,
  addManualArrear,
  // Config
  getIncentiveConfig,
  updateIncentiveConfig
} from '../controllers/productionController.js';

const router = Router();

// ૧. Employee Master Routes
router.get('/production/employees', listEmployees);
router.post('/production/employees', createEmployee);
router.get('/production/employees/:id', getEmployee);
router.put('/production/employees/:id', updateEmployee);
router.delete('/production/employees/:id', deleteEmployee);

// ૨. Daily Production Routes
router.get('/production/daily', listDailyProduction);
router.post('/production/daily', addDailyProduction);
router.delete('/production/daily/:id', deleteDailyProduction);

// ૩. Monthly Production Summary & Incentive Calculation
router.get('/production/monthly-summary', getMonthlyProductionSummary);

// ૪. Salary Increment & Decrement
router.post('/production/salary/increment', incrementSalary);
router.post('/production/salary/decrement', decrementSalary);

// ૫. Arrears & Pending Salary Routes
router.get('/production/arrears', listArrears);
router.post('/production/arrears', addManualArrear);
router.put('/production/arrears/:employeeId/:arrearId/settle', settleArrear);

// ૬. Incentive Settings Config Routes
router.get('/production/config', getIncentiveConfig);
router.put('/production/config', updateIncentiveConfig);

export default router;

