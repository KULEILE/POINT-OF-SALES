const create = async (req, res) => {
  const { customer_name, customer_phone, cart_data, notes } = req.body;

  if (!cart_data || !Array.isArray(cart_data) || cart_data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot hold an empty cart. Please add items before holding the sale.'
    });
  }

  try {
    let subtotal = 0;
    let itemCount = 0;
    for (const item of cart_data) {
      const price = parseFloat(item.unit_price || item.selling_price || 0);
      const quantity = parseFloat(item.quantity) || 0;
      subtotal += price * quantity;
      itemCount += quantity;
    }

    const totalAmount = subtotal;

    const result = await pool.query(
      `INSERT INTO held_sales (
        customer_name,
        customer_phone,
        cart_data,
        items_count,
        total_amount,
        cashier_id,
        cashier_name,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        customer_name || null,
        customer_phone || null,
        JSON.stringify(cart_data),
        itemCount,
        totalAmount.toFixed(2),
        req.user.user_id,
        req.user.full_name,
        notes || null
      ]
    );

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'HOLD_SALE',
      action_details: `Held sale — ${itemCount} items — M ${totalAmount.toFixed(2)}`,
      affected_table: 'held_sales',
      affected_record_id: result.rows[0].hold_id
    });

    return res.status(201).json({
      success: true,
      message: 'Sale held successfully. You can resume it later.',
      hold: result.rows[0]
    });

  } catch (err) {
    console.error('[holds/create]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to hold sale. Please try again.'
    });
  }
};