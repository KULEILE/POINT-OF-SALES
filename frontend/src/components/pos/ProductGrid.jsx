import React, { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import ProductCard from './ProductCard';
import toast from 'react-hot-toast';

const ProductGrid = ({ onAddToCart, refreshTrigger, isWholesale, canProcessSales = true }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activecat, setActivecat] = useState('');
  const [barcode, setBarcode] = useState('');

  useEffect(() => {
    productService.getCategories()
      .then(r => setCategories(r.data.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    productService.getAll({ search, category_id: activecat, limit: 120 })
      .then(r => setProducts(r.data.products))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, [search, activecat, refreshTrigger]);

  const handleBarcode = async (e) => {
    if (e.key === 'Enter' && barcode.trim()) {
      if (!canProcessSales) {
        toast.error('Please clock in before adding products.');
        setBarcode('');
        return;
      }
      try {
        const r = await productService.getByBarcode(barcode.trim());
        const product = r.data.product;
        
        if (product.expiry_date && new Date(product.expiry_date) <= new Date()) {
          toast.error(`"${product.name}" has expired. Cannot add to cart.`);
          setBarcode('');
          return;
        }
        
        onAddToCart(product);
        toast.success(`Added: ${product.name}`);
        setBarcode('');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Product not found');
        setBarcode('');
      }
    }
  };

  const displayProducts = products.filter(p => true);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex gap-2">
        <input 
          className="k-input flex-1 py-2 text-sm" 
          placeholder="Search products..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
        <input 
          className={`k-input w-44 py-2 text-sm ${!canProcessSales ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder="Scan barcode..." 
          value={barcode} 
          onChange={e => setBarcode(e.target.value)} 
          onKeyDown={handleBarcode} 
          disabled={!canProcessSales}
        />
      </div>
      {isWholesale && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5 text-xs text-primary font-500">
          Wholesale prices shown
        </div>
      )}
      {!canProcessSales && (
        <div className="bg-danger/5 border border-danger/20 rounded-lg px-3 py-1.5 text-xs text-danger font-500">
          Clock in to add products to cart
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button 
          onClick={() => setActivecat('')} 
          className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-500 flex-shrink-0 transition-all ${
            !activecat 
              ? 'bg-primary text-white' 
              : 'bg-surface-card border border-surface-border text-text-muted hover:border-primary'
          }`}
        >
          All
        </button>
        {categories.map(c => (
          <button 
            key={c.category_id} 
            onClick={() => setActivecat(c.category_id)} 
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-500 flex-shrink-0 transition-all ${
              activecat === c.category_id 
                ? 'bg-primary text-white' 
                : 'bg-surface-card border border-surface-border text-text-muted hover:border-primary'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-surface-card rounded-xl h-28 animate-pulse" />
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-faint">
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {displayProducts.map(p => (
              <ProductCard 
                key={p.product_id} 
                product={p} 
                onAdd={onAddToCart} 
                isWholesale={isWholesale}
                canProcessSales={canProcessSales}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGrid;