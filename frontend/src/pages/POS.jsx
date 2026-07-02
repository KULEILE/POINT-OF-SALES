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
import TransactionSearch from '../components/returns/TransactionSearch';
import ReturnModal from '../components/returns/ReturnModal';
import HoldSaleModal from '../components/pos/HoldSaleModal';
import HeldSalesList from '../components/pos/HeldSalesList';
import { useCart } from '../context/CartContext';
import { validateCartStock } from '../utils/validators';

const POS = () => {
  const {
    cart, addToCart, removeFromCart, updateQuantity,
    updateDiscount, clearCart, subtotal, taxAmount, total, itemCount,
    isWholesale, setWholesaleMode
  } = useCart();

  const [saleMode, setSaleMode] = useState('cash');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [completedTx, setCompletedTx] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [settlementCustomer, setSettlementCustomer] = useState(null);
  const [showTransactionSearch, setShowTransactionSearch] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showHeldSales, setShowHeldSales] = useState(false);

  const handleModeChange = (mode) => {
    setSaleMode(mode);
    setSelectedCustomer(null);
  };

  const handleToggleWholesale = () => {
    setWholesaleMode(!isWholesale);
    if (!isWholesale) {
      toast.success('Wholesale mode enabled');
    } else {
      toast.success('Retail mode enabled');
    }
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
    setWholesaleMode(false);
  };

  const handleNewSale = () => {
    clearCart();
    setCompletedTx(null);
    setSelectedCustomer(null);
    setSaleMode('cash');
    setWholesaleMode(false);
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

  // Return handlers
  const handleOpenReturn = () => {
    setShowTransactionSearch(true);
  };

  const handleTransactionSelect = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionSearch(false);
    setShowReturnModal(true);
  };

  const handleReturnSuccess = () => {
    setShowReturnModal(false);
    setSelectedTransaction(null);
    toast.success('Return processed successfully.');
  };

  // Hold Sale handlers
  const handleOpenHold = () => {
    if (cart.length === 0) {
      toast.error('Cannot hold an empty cart. Please add items first.');
      return;
    }
    setShowHoldModal(true);
  };

  const handleHoldSuccess = () => {
    setShowHoldModal(false);
    clearCart();
    toast.success('Sale held successfully. You can resume it later.');
  };

  const handleOpenHeldSales = () => {
    setShowHeldSales(true);
  };

  const handleResumeHeldSale = (hold) => {
    // Restore cart from held sale data
    const cartData = hold.cart_data;
    for (const item of cartData) {
      // Add item back to cart
      const product = {
        product_id: item.product_id,
        name: item.name,
        selling_price: item.unit_price || item.selling_price,
        quantity: item.quantity,
        unit_price: item.unit_price || item.selling_price,
        discount_applied: item.discount_applied || 0,
        tax_rate: item.tax_rate || 15,
        tax_exempt: item.tax_exempt || false,
        stock_quantity: item.stock_quantity
      };
      // Use addToCart with the restored quantity
      addToCart(product);
      // Update quantity if needed
      if (item.quantity > 1) {
        updateQuantity(product.product_id, item.quantity);
      }
      if (item.discount_applied > 0) {
        updateDiscount(product.product_id, item.discount_applied);
      }
    }
    setShowHeldSales(false);
    toast.success(`Resumed sale for ${hold.customer_name || 'Walk-in Customer'}`);
  };

  const formatM = (n) => `M ${parseFloat(n).toFixed(2)}`;

  const isWholesaleMode = isWholesale;

  return (
    <div className="flex h-full overflow-hidden">

      <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ModeSwitch active={saleMode} onChange={handleModeChange} />
            <button
              onClick={handleToggleWholesale}
              className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-all border
                ${isWholesaleMode 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-surface-card border-surface-border text-text-muted hover:border-primary/50'}`}
            >
              {isWholesaleMode ? 'Wholesale' : 'Retail'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleOpenHeldSales} className="k-btn-outline text-sm px-4 py-2">
              Resume Sale
            </button>
            <button onClick={handleOpenReturn} className="k-btn-outline text-sm px-4 py-2">
              Return
            </button>
            <button onClick={handleOpenSettlement} className="k-btn-outline text-sm px-4 py-2">
              Settle Debt
            </button>
          </div>
        </div>

        {isWholesaleMode && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-primary font-600">Wholesale Mode Active</p>
            <p className="text-xs text-text-muted">
              {saleMode === 'cash' ? 'Cash sale with wholesale prices' : 
               saleMode === 'credit' ? 'Credit sale with wholesale prices' : 
               'Lay-by sale with wholesale prices'}
            </p>
          </div>
        )}

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
            isWholesale={isWholesaleMode}
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
          isWholesale={isWholesaleMode}
          onUpdateQty={updateQuantity}
          onRemove={removeFromCart}
          onUpdateDiscount={updateDiscount}
          onClear={clearCart}
          onCheckout={handleCheckout}
          onHold={handleOpenHold}
        />
      </div>

      {showPayment && (
        <PaymentModal
          total={total}
          cart={cart}
          saleMode={saleMode}
          selectedCustomer={selectedCustomer}
          isWholesale={isWholesaleMode}
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
          isWholesale={isWholesaleMode}
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

      {/* Return Modals */}
      {showTransactionSearch && (
        <TransactionSearch
          onSelect={handleTransactionSelect}
          onClose={() => setShowTransactionSearch(false)}
        />
      )}

      {showReturnModal && selectedTransaction && (
        <ReturnModal
          transaction={selectedTransaction}
          onSuccess={handleReturnSuccess}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedTransaction(null);
          }}
        />
      )}

      {/* Hold Sale Modals */}
      {showHoldModal && (
        <HoldSaleModal
          cart={cart}
          total={total}
          itemCount={itemCount}
          onSuccess={handleHoldSuccess}
          onClose={() => setShowHoldModal(false)}
        />
      )}

      {showHeldSales && (
        <HeldSalesList
          onSelect={handleResumeHeldSale}
          onClose={() => setShowHeldSales(false)}
        />
      )}
    </div>
  );
};

export default POS;