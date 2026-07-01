const pool = require('../config/db');
const { auditLog } = require('../utils/helpers');

// Helper function to check if a transaction is overdue
const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  const today = new Date();
  const due = new Date(dueDate);
  return today > due;
};

// Helper function to get days remaining or overdue
const getDaysInfo = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const processCreditPayment = async (req, res) => {
  const { customer_id, amount, payment_method, notes } = req.body;

  if (!customer_id) {
    return res.status(400).json({ success: false, message: 'Customer ID is required.' });
  }

  const paymentAmount = parseFloat(amount) || 0;
  if (paymentAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customerResult = await client.query(
      `SELECT c.full_name, c.current_balance, c.phone, 
              t.due_date, t.transaction_id, t.balance_due
       FROM customers c
       LEFT JOIN transactions t ON t.customer_id = c.customer_id 
         AND t.payment_method = 'credit' 
         AND t.payment_status = 'pending'
       WHERE c.customer_id = $1
       ORDER BY t.transaction_date DESC LIMIT 1`,
      [customer_id]
    );

    if (!customerResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const customer = customerResult.rows[0];
    const currentBalance = parseFloat(customer.current_balance) || 0;

    if (paymentAmount > currentBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Payment amount (${paymentAmount}) exceeds current balance (${currentBalance}).`
      });
    }

    const newBalance = currentBalance - paymentAmount;

    const overdueStatus = isOverdue(customer.due_date);
    const daysInfo = getDaysInfo(customer.due_date);

    if (overdueStatus) {
      console.log(`[PAYMENT] Customer ${customer.full_name} is overdue by ${Math.abs(daysInfo)} days`);
    }

    const counterResult = await client.query(
      `INSERT INTO receipt_counter (counter_date, last_number)
       VALUES (CURRENT_DATE, 1)
       ON CONFLICT (counter_date)
       DO UPDATE SET last_number = receipt_counter.last_number + 1
       RETURNING last_number`,
      []
    );

    const counter = counterResult.rows[0].last_number;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const receiptNumber = 'KPOS-' + dateStr + '-' + String(counter).padStart(4, '0') + '-PAY';

    const txResult = await client.query(
      `INSERT INTO transactions (
        receipt_number, customer_id, customer_phone, is_guest,
        cashier_id, cashier_name,
        payment_method, transaction_type,
        subtotal, tax_amount, tax_rate, total_amount,
        amount_paid, change_amount, balance_due,
        payment_status, status, notes
      ) VALUES (
        $1, $2, $3, false,
        $4, $5,
        $6, 'credit',
        0, 0, 0, $7,
        $8, 0, 0,
        'paid', 'completed', $9
      ) RETURNING *`,
      [
        receiptNumber,
        customer_id,
        customer.phone || null,
        req.user.user_id,
        req.user.full_name,
        payment_method || 'cash',
        paymentAmount,
        paymentAmount,
        notes || 'Credit payment'
      ]
    );

    const tx = txResult.rows[0];

    await client.query(
      `INSERT INTO credit_transactions (
        customer_id, transaction_id, transaction_type,
        amount, previous_balance, new_balance,
        created_by
      ) VALUES ($1, $2, 'payment', $3, $4, $5, $6)`,
      [
        customer_id,
        tx.transaction_id,
        paymentAmount.toFixed(2),
        currentBalance.toFixed(2),
        newBalance.toFixed(2),
        req.user.user_id
      ]
    );

    await client.query(
      `UPDATE customers SET current_balance = $1, updated_at = NOW() WHERE customer_id = $2`,
      [newBalance.toFixed(2), customer_id]
    );

    if (newBalance <= 0) {
      await client.query(
        `UPDATE transactions 
         SET payment_status = 'paid', updated_at = NOW()
         WHERE customer_id = $1 AND payment_method = 'credit' AND payment_status = 'pending'`,
        [customer_id]
      );
    }

    await client.query('COMMIT');

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'PAYMENT',
      action_details: `Credit payment — M ${paymentAmount.toFixed(2)} from ${customer.full_name} — Receipt: ${receiptNumber}`,
      affected_table: 'transactions',
      affected_record_id: tx.transaction_id,
    });

    const final = await client.query(
      `SELECT * FROM transactions WHERE transaction_id = $1`,
      [tx.transaction_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Credit payment processed successfully.',
      transaction: final.rows[0],
      new_balance: newBalance,
      customer: customer,
      overdue_status: overdueStatus,
      days_info: daysInfo
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[payments/processCreditPayment]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to process credit payment.' });
  } finally {
    client.release();
  }
};

const processLaybyPayment = async (req, res) => {
  const { transaction_id, amount, payment_method, notes } = req.body;

  if (!transaction_id) {
    return res.status(400).json({ success: false, message: 'Transaction ID is required.' });
  }

  const paymentAmount = parseFloat(amount) || 0;
  if (paymentAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const txResult = await client.query(
      `SELECT t.*, c.full_name, c.phone, c.customer_id 
       FROM transactions t
       JOIN customers c ON t.customer_id = c.customer_id
       WHERE t.transaction_id = $1 AND t.payment_method = 'layby' AND t.payment_status = 'pending'`,
      [transaction_id]
    );

    if (!txResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Layby transaction not found or already completed.'
      });
    }

    const tx = txResult.rows[0];
    const balanceDue = parseFloat(tx.balance_due) || 0;
    const amountPaid = parseFloat(tx.amount_paid) || 0;

    const overdueStatus = isOverdue(tx.due_date);
    const daysInfo = getDaysInfo(tx.due_date);

    if (overdueStatus) {
      console.log(`[PAYMENT] Layby ${tx.receipt_number} is overdue by ${Math.abs(daysInfo)} days`);
    }

    if (paymentAmount > balanceDue) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Payment amount (${paymentAmount}) exceeds remaining balance (${balanceDue}).`
      });
    }

    const newBalanceDue = balanceDue - paymentAmount;
    const newAmountPaid = amountPaid + paymentAmount;
    const isFullyPaid = newBalanceDue <= 0;

    await client.query(
      `INSERT INTO layby_payments (
        transaction_id, amount_paid, payment_method,
        balance_before, balance_after, received_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        transaction_id,
        paymentAmount.toFixed(2),
        payment_method || 'cash',
        balanceDue.toFixed(2),
        Math.max(0, newBalanceDue).toFixed(2),
        req.user.user_id,
        notes || 'Layby installment'
      ]
    );

    await client.query(
      `UPDATE transactions 
       SET balance_due = $1, amount_paid = $2, payment_status = $3, updated_at = NOW()
       WHERE transaction_id = $4`,
      [
        Math.max(0, newBalanceDue).toFixed(2),
        newAmountPaid.toFixed(2),
        isFullyPaid ? 'paid' : 'pending',
        transaction_id
      ]
    );

    const counterResult = await client.query(
      `INSERT INTO receipt_counter (counter_date, last_number)
       VALUES (CURRENT_DATE, 1)
       ON CONFLICT (counter_date)
       DO UPDATE SET last_number = receipt_counter.last_number + 1
       RETURNING last_number`,
      []
    );

    const counter = counterResult.rows[0].last_number;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const receiptNumber = 'KPOS-' + dateStr + '-' + String(counter).padStart(4, '0') + '-LBY';

    const paymentTxResult = await client.query(
      `INSERT INTO transactions (
        receipt_number, customer_id, customer_phone, is_guest,
        cashier_id, cashier_name,
        payment_method, transaction_type,
        subtotal, tax_amount, tax_rate, total_amount,
        amount_paid, change_amount, balance_due,
        payment_status, status, notes
      ) VALUES (
        $1, $2, $3, false,
        $4, $5,
        $6, 'layby',
        0, 0, 0, $7,
        $8, 0, 0,
        'paid', 'completed', $9
      ) RETURNING *`,
      [
        receiptNumber,
        tx.customer_id,
        tx.phone || null,
        req.user.user_id,
        req.user.full_name,
        payment_method || 'cash',
        paymentAmount,
        paymentAmount,
        notes || 'Layby payment'
      ]
    );

    const paymentTx = paymentTxResult.rows[0];

    const customerResult = await client.query(
      `SELECT current_balance FROM customers WHERE customer_id = $1`,
      [tx.customer_id]
    );
    const currentBalance = parseFloat(customerResult.rows[0]?.current_balance || 0);
    const newCustomerBalance = Math.max(0, currentBalance - paymentAmount);

    await client.query(
      `UPDATE customers SET current_balance = $1, updated_at = NOW() WHERE customer_id = $2`,
      [newCustomerBalance.toFixed(2), tx.customer_id]
    );

    await client.query('COMMIT');

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'LAYBY_PAYMENT',
      action_details: `Layby payment — M ${paymentAmount.toFixed(2)} on ${tx.receipt_number} — ${isFullyPaid ? 'FULLY PAID' : 'Partial payment'}`,
      affected_table: 'transactions',
      affected_record_id: transaction_id,
    });

    const final = await client.query(
      `SELECT * FROM transactions WHERE transaction_id = $1`,
      [transaction_id]
    );

    return res.status(201).json({
      success: true,
      message: isFullyPaid ? 'Layby fully paid!' : 'Layby payment recorded.',
      transaction: final.rows[0],
      payment_transaction: paymentTx,
      is_fully_paid: isFullyPaid,
      remaining_balance: Math.max(0, newBalanceDue),
      customer: tx,
      overdue_status: overdueStatus,
      days_info: daysInfo
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[payments/processLaybyPayment]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to process layby payment.' });
  } finally {
    client.release();
  }
};

const processSplitPayment = async (req, res) => {
  const { transaction_id, splits } = req.body;

  if (!transaction_id) {
    return res.status(400).json({ success: false, message: 'Transaction ID is required.' });
  }

  if (!splits || !Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ success: false, message: 'Payment splits are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify transaction exists
    const txResult = await client.query(
      `SELECT total_amount, amount_paid, balance_due FROM transactions WHERE transaction_id = $1`,
      [transaction_id]
    );

    if (!txResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const transaction = txResult.rows[0];
    const totalAmount = parseFloat(transaction.total_amount) || 0;
    const totalSplitAmount = splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);

    if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Total split amount (${totalSplitAmount}) does not match transaction total (${totalAmount}).`
      });
    }

    // Insert payment splits
    const insertedSplits = [];
    for (const split of splits) {
      const result = await client.query(
        `INSERT INTO payment_splits (transaction_id, payment_method, amount, reference)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [transaction_id, split.payment_method, parseFloat(split.amount).toFixed(2), split.reference || null]
      );
      insertedSplits.push(result.rows[0]);
    }

    // Update transaction payment status
    await client.query(
      `UPDATE transactions 
       SET amount_paid = $1, 
           payment_status = 'paid', 
           updated_at = NOW() 
       WHERE transaction_id = $2`,
      [totalAmount.toFixed(2), transaction_id]
    );

    await client.query('COMMIT');

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'SPLIT_PAYMENT',
      action_details: `Split payment on transaction ${transaction_id} — ${splits.length} methods`,
      affected_table: 'payment_splits',
      affected_record_id: transaction_id,
    });

    return res.status(201).json({
      success: true,
      message: 'Split payment processed successfully.',
      splits: insertedSplits,
      transaction_id: transaction_id
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[payments/processSplitPayment]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to process split payment.' });
  } finally {
    client.release();
  }
};

const getPaymentSplits = async (req, res) => {
  try {
    const transactionId = req.params.id;

    const result = await pool.query(
      `SELECT * FROM payment_splits WHERE transaction_id = $1 ORDER BY split_id ASC`,
      [transactionId]
    );

    return res.json({
      success: true,
      splits: result.rows
    });

  } catch (err) {
    console.error('[payments/getPaymentSplits]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch payment splits.' });
  }
};

const getCustomerPayments = async (req, res) => {
  try {
    const customerId = req.params.id;

    const customerResult = await pool.query(
      `SELECT customer_id, full_name, phone, current_balance, credit_limit 
       FROM customers WHERE customer_id = $1`,
      [customerId]
    );

    if (!customerResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const creditPayments = await pool.query(
      `SELECT ct.*, t.receipt_number, t.transaction_date, t.due_date, t.duration_days
       FROM credit_transactions ct
       JOIN transactions t ON ct.transaction_id = t.transaction_id
       WHERE ct.customer_id = $1 AND ct.transaction_type = 'payment'
       ORDER BY t.transaction_date DESC
       LIMIT 50`,
      [customerId]
    );

    const laybyTransactions = await pool.query(
      `SELECT t.transaction_id, t.receipt_number, t.transaction_date, 
              t.total_amount, t.amount_paid, t.balance_due, t.payment_status,
              t.due_date, t.duration_days,
              (CURRENT_DATE - t.due_date) AS days_overdue
       FROM transactions t
       WHERE t.customer_id = $1 AND t.payment_method = 'layby' AND t.payment_status = 'pending'
       ORDER BY t.transaction_date DESC`,
      [customerId]
    );

    const laybyPayments = await pool.query(
      `SELECT lp.*, t.receipt_number 
       FROM layby_payments lp
       JOIN transactions t ON lp.transaction_id = t.transaction_id
       WHERE t.customer_id = $1
       ORDER BY lp.payment_date DESC
       LIMIT 50`,
      [customerId]
    );

    const creditDueDate = await pool.query(
      `SELECT due_date, duration_days 
       FROM transactions 
       WHERE customer_id = $1 AND payment_method = 'credit' AND payment_status = 'pending'
       ORDER BY transaction_date DESC
       LIMIT 1`,
      [customerId]
    );

    // Get payment splits for transactions
    const paymentSplits = await pool.query(
      `SELECT ps.*, t.receipt_number
       FROM payment_splits ps
       JOIN transactions t ON ps.transaction_id = t.transaction_id
       WHERE t.customer_id = $1
       ORDER BY ps.created_at DESC
       LIMIT 50`,
      [customerId]
    );

    return res.json({
      success: true,
      customer: {
        ...customerResult.rows[0],
        due_date: creditDueDate.rows[0]?.due_date || null,
        duration_days: creditDueDate.rows[0]?.duration_days || null,
        is_overdue: creditDueDate.rows[0]?.due_date ? isOverdue(creditDueDate.rows[0].due_date) : false,
        days_remaining: creditDueDate.rows[0]?.due_date ? getDaysInfo(creditDueDate.rows[0].due_date) : null
      },
      credit_payments: creditPayments.rows,
      layby_transactions: laybyTransactions.rows.map(l => ({
        ...l,
        is_overdue: l.due_date ? isOverdue(l.due_date) : false,
        days_remaining: l.due_date ? getDaysInfo(l.due_date) : null
      })),
      layby_payments: laybyPayments.rows,
      payment_splits: paymentSplits.rows,
      total_credit_balance: parseFloat(customerResult.rows[0].current_balance) || 0,
      open_layby_count: laybyTransactions.rows.length
    });

  } catch (err) {
    console.error('[payments/getCustomerPayments]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer payments.' });
  }
};

const getCustomerLaybys = async (req, res) => {
  try {
    const customerId = req.params.id;

    const result = await pool.query(
      `SELECT t.transaction_id, t.receipt_number, t.transaction_date, 
              t.total_amount, t.amount_paid, t.balance_due, t.payment_status,
              t.due_date, t.duration_days,
              (SELECT COUNT(*) FROM layby_payments lp WHERE lp.transaction_id = t.transaction_id) AS payment_count
       FROM transactions t
       WHERE t.customer_id = $1 AND t.payment_method = 'layby'
       ORDER BY t.transaction_date DESC`,
      [customerId]
    );

    return res.json({
      success: true,
      laybys: result.rows.map(l => ({
        ...l,
        is_overdue: l.due_date ? isOverdue(l.due_date) : false,
        days_remaining: l.due_date ? getDaysInfo(l.due_date) : null
      }))
    });

  } catch (err) {
    console.error('[payments/getCustomerLaybys]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch layby transactions.' });
  }
};

module.exports = {
  processCreditPayment,
  processLaybyPayment,
  processSplitPayment,
  getPaymentSplits,
  getCustomerPayments,
  getCustomerLaybys
};