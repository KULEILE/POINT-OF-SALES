const generateReceiptText = (transaction, items, settings) => {
  const line  = '─'.repeat(40);
  const dline = '═'.repeat(40);
  const pad   = (l, r, w = 40) => {
    const gap = w - l.length - r.length;
    return l + ' '.repeat(Math.max(gap, 1)) + r;
  };

  let receipt = '';
  receipt += dline + '\n';
  receipt += settings.business_name.padStart(28) + '\n';
  if (settings.business_address) receipt += settings.business_address.padStart(28) + '\n';
  if (settings.business_phone)   receipt += settings.business_phone.padStart(28) + '\n';
  receipt += dline + '\n';
  receipt += `Receipt: ${transaction.receipt_number}\n`;
  receipt += `Date:    ${new Date(transaction.transaction_date).toLocaleString('en-LS')}\n`;
  receipt += `Cashier: ${transaction.cashier_name}\n`;
  if (!transaction.is_guest && transaction.customer_phone) {
    receipt += `Customer: ${transaction.customer_phone}\n`;
  }
  receipt += line + '\n';
  receipt += pad('ITEM', 'TOTAL') + '\n';
  receipt += line + '\n';

  items.forEach(item => {
    receipt += `${item.product_name}\n`;
    receipt += pad(`  ${item.quantity} x M${parseFloat(item.unit_price).toFixed(2)}`,
                   `M${parseFloat(item.total_price).toFixed(2)}`) + '\n';
  });

  receipt += line + '\n';
  receipt += pad('Subtotal:', `M${parseFloat(transaction.subtotal).toFixed(2)}`) + '\n';
  if (parseFloat(transaction.discount_amount) > 0) {
    receipt += pad('Discount:', `-M${parseFloat(transaction.discount_amount).toFixed(2)}`) + '\n';
  }
  receipt += pad(`VAT (${transaction.tax_rate}%):`, `M${parseFloat(transaction.tax_amount).toFixed(2)}`) + '\n';
  receipt += dline + '\n';
  receipt += pad('TOTAL:', `M${parseFloat(transaction.total_amount).toFixed(2)}`) + '\n';
  receipt += pad('Paid:', `M${parseFloat(transaction.amount_paid).toFixed(2)}`) + '\n';
  if (parseFloat(transaction.change_amount) > 0) {
    receipt += pad('Change:', `M${parseFloat(transaction.change_amount).toFixed(2)}`) + '\n';
  }
  receipt += dline + '\n';
  receipt += `Payment: ${transaction.payment_method.toUpperCase()}\n`;
  receipt += line + '\n';
  receipt += (settings.receipt_footer || 'Thank you!').padStart(28) + '\n';
  receipt += dline + '\n';

  return receipt;
};

module.exports = { generateReceiptText };
