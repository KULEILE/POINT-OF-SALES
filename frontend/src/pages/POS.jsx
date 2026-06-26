import React, { useState } from 'react';
import toast from 'react-hot-toast';
import ProductGrid from '../components/pos/ProductGrid';
import Cart from '../components/pos/Cart';
import PaymentModal from '../components/pos/PaymentModal';
import ReceiptModal from '../components/pos/ReceiptModal';
import ModeSwitch from '../components/layout/ModeSwitch';
import CustomerPanel from '../components/pos/CustomerPanel';
import SettlementModal from '../components/payments/SettlementModal';
import CustomerSelectModal from '../components/payments/CustomerSelectModal';
import { useCart } from '../context/CartContext';
import { validateCartStock } from '../utils/validators';

const POS = () => {
  const {
    cart, addToCart, removeFromCart, updateQuantity,
    updateDiscount, clearCart, subtotal, taxAmount, total, itemCount,
  } = useCart();

  const [saleMode, setSaleMode] = useState('cash');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [completedTx, setCompletedTx] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [settlementCustomer, setSettlementCustomer] = useState(null);

  const handleModeChange = (mode) => {
    setSaleMode(mode);
    setSelectedCustomer(null);
  };

  const handleCheckout = () => {
    if ((saleMode === 'credit' || saleMode === 'layby') && !selectedCustomer) {
      toast.error(`Please select a customer for a ${saleMode === 'credit' ? 'credit' : 'lay-by'} sale.`);
      return;
    }

    if (saleMode === 'credit' && selectedCustomer) {
      const available = parseFloat(selectedCustomer.credit_limit || 0) - parseFloat(selectedCustomer.current_balance || 0);
      if (total > available) {
        toast.error(
          `Sale total (${formatM(total)}) exceeds available credit (${formatM(available)}) for ${selectedCustomer.full_name}.`
        );
        return;
      }
    }

    const stockValidation = validateCartStock(cart);
    if (stockValidation.hasErrors) {
      toast.error(stockValidation.message);
      return;
    }

    setShowPayment(true);
  };

  const handleSuccess = (tx) => {
    setShowPayment(false);
    setCompletedTx(tx);
    setRefreshKey(prev => prev + 1);
    setSelectedCustomer(null);
  };

  const handleNewSale = () => {
    clearCart();
    setCompletedTx(null);
    setSelectedCustomer(null);
    setSaleMode('cash');
  };

  const handleSettlementSuccess = () => {
    setShowSettlement(false);
    setSettlementCustomer(null);
    toast.success('Settlement completed successfully.');
  };

  const handleOpenSettlement = () => {
    setShowCustomerSelect(true);
  };

  const handleSelectCustomer = (customer) => {
    setSettlementCustomer(customer);
    setShowCustomerSelect(false);
    setShowSettlement(true);
  };

  const formatM = (n) => `M ${parseFloat(n).toFixed(2)}`;

  return (
    <div className="flex h-full overflow-hidden">

      <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <ModeSwitch active={saleMode} onChange={handleModeChange} />
          <button onClick={handleOpenSettlement} className="k-btn-outline text-sm px-4 py-2">
            Settle Debt
          </button>
        </div>

        {(saleMode === 'credit' || saleMode === 'layby') && (
          <CustomerPanel
            saleMode={saleMode}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onClearCustomer={() => setSelectedCustomer(null)}
          />
        )}

        <div className="flex-1 overflow-hidden">
          <ProductGrid
            onAddToCart={addToCart}
            refreshTrigger={refreshKey}
          />
        </div>
      </div>

      <div className="w-80 xl:w-96 flex-shrink-0">
        <Cart
          cart={cart}
          subtotal={subtotal}
          taxAmount={taxAmount}
          total={total}
          itemCount={itemCount}
          saleMode={saleMode}
          selectedCustomer={selectedCustomer}
          onUpdateQty={updateQuantity}
          onRemove={removeFromCart}
          onUpdateDiscount={updateDiscount}
          onClear={clearCart}
          onCheckout={handleCheckout}
        />
      </div>

      {showPayment && (
        <PaymentModal
          total={total}
          cart={cart}
          saleMode={saleMode}
          selectedCustomer={selectedCustomer}
          onSuccess={handleSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

      {completedTx && (
        <ReceiptModal
          transaction={completedTx}
          cart={cart}
          total={total}
          taxAmount={taxAmount}
          onClose={() => setCompletedTx(null)}
          onNewSale={handleNewSale}
        />
      )}

      {showCustomerSelect && (
        <CustomerSelectModal
          onSelect={handleSelectCustomer}
          onClose={() => setShowCustomerSelect(false)}
        />
      )}

      {showSettlement && settlementCustomer && (
        <SettlementModal
          customer={settlementCustomer}
          onClose={() => {
            setShowSettlement(false);
            setSettlementCustomer(null);
          }}
          onSuccess={handleSettlementSuccess}
        />
      )}
    </div>
  );
};

export default POS;