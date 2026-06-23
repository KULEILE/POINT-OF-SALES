import React, { useState } from 'react';
import ProductGrid from '../components/pos/ProductGrid';
import Cart from '../components/pos/Cart';
import PaymentModal from '../components/pos/PaymentModal';
import ReceiptModal from '../components/pos/ReceiptModal';
import ModeSwitch from '../components/layout/ModeSwitch';
import { useCart } from '../context/CartContext';

const POS = () => {
  const { cart, addToCart, removeFromCart, updateQuantity, updateDiscount, clearCart, subtotal, taxAmount, total, itemCount } = useCart();
  const [saleMode,     setSaleMode]     = useState('cash');
  const [showPayment,  setShowPayment]  = useState(false);
  const [completedTx,  setCompletedTx] = useState(null);

  const handleSuccess = (tx) => { setShowPayment(false); setCompletedTx(tx); };
  const handleNewSale = () => { clearCart(); setCompletedTx(null); };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
        <ModeSwitch active={saleMode} onChange={setSaleMode} />
        <div className="flex-1 overflow-hidden">
          <ProductGrid onAddToCart={addToCart} />
        </div>
      </div>
      <div className="w-80 xl:w-96 flex-shrink-0">
        <Cart cart={cart} subtotal={subtotal} taxAmount={taxAmount} total={total} itemCount={itemCount} onUpdateQty={updateQuantity} onRemove={removeFromCart} onUpdateDiscount={updateDiscount} onClear={clearCart} onCheckout={() => setShowPayment(true)} />
      </div>
      {showPayment  && <PaymentModal total={total} cart={cart} onSuccess={handleSuccess} onClose={() => setShowPayment(false)} />}
      {completedTx  && <ReceiptModal transaction={completedTx} cart={cart} total={total} taxAmount={taxAmount} onClose={() => setCompletedTx(null)} onNewSale={handleNewSale} />}
    </div>
  );
};

export default POS;
