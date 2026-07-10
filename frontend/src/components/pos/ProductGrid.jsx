import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { productService } from '../../services/productService';
import ProductCard from './ProductCard';
import GroupedProductCard from './GroupedProductCard';
import toast from 'react-hot-toast';

const ProductGrid = ({ onAddToCart, refreshTrigger, isWholesale, canProcessSales = true }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activecat, setActivecat] = useState('');
  const [barcode, setBarcode] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Load categories
  useEffect(() => {
    productService.getCategories()
      .then(r => setCategories(r.data.categories))
      .catch(() => {});
  }, []);

  // Load products
  useEffect(() => {
    setLoading(true);
    productService.getAll({ search, category_id: activecat, limit: 120 })
      .then(r => {
        const productData = r.data.products || [];
        setProducts(productData);
        
        // Auto-select first product if only one result and searching by name
        if (search && productData.length === 1 && !barcode) {
          const singleProduct = productData[0];
          // If product has variants, show them
          const hasVariants = products.filter(p => p.name === singleProduct.name).length > 1;
          if (!hasVariants) {
            handleProductAdd(singleProduct);
          }
        }
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, [search, activecat, refreshTrigger]);

  // Check if we're searching
  useEffect(() => {
    setIsSearching(search.trim().length > 0);
  }, [search]);

  // Reset selected group when search changes
  useEffect(() => {
    if (search) {
      setSelectedGroup(null);
    }
  }, [search]);

  // Group products by name
  const groupedProducts = useMemo(() => {
    const groups = {};
    const filtered = products.filter(p => {
      // Don't show expired products in the main grid
      const isExpired = p.expiry_date && new Date(p.expiry_date) <= new Date();
      return !isExpired;
    });
    
    filtered.forEach(p => {
      const key = p.name;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(p);
    });
    return groups;
  }, [products]);

  // Get display products based on current state
  const getDisplayProducts = useMemo(() => {
    // If searching, show individual products
    if (isSearching) {
      return products.filter(p => {
        const isExpired = p.expiry_date && new Date(p.expiry_date) <= new Date();
        return !isExpired;
      });
    }
    
    // If a group is selected, show its variants
    if (selectedGroup) {
      return products.filter(p => {
        const isExpired = p.expiry_date && new Date(p.expiry_date) <= new Date();
        return p.name === selectedGroup && !isExpired;
      });
    }
    
    // Otherwise show grouped view
    return Object.keys(groupedProducts).map(name => ({
      name,
      variants: groupedProducts[name],
      count: groupedProducts[name].length
    }));
  }, [isSearching, selectedGroup, products, groupedProducts]);

  const handleGroupClick = (groupName) => {
    setSelectedGroup(groupName);
  };

  const handleBack = () => {
    setSelectedGroup(null);
    setSearch('');
  };

  const handleProductAdd = (product) => {
    if (!canProcessSales) {
      toast.error('Please clock in before adding products.');
      return false;
    }
    
    if (product.expiry_date && new Date(product.expiry_date) <= new Date()) {
      toast.error(`"${product.name}" has expired. Cannot add to cart.`);
      return false;
    }
    
    if (product.stock_quantity <= 0) {
      toast.error(`"${product.name}" is out of stock.`);
      return false;
    }
    
    onAddToCart(product);
    toast.success(`Added: ${product.name}`);
    return true;
  };

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
        
        handleProductAdd(product);
        setBarcode('');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Product not found');
        setBarcode('');
      }
    }
  };

  // Check if we're in a grouped view
  const isGroupView = selectedGroup !== null;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input 
          className="k-input flex-1 py-2 text-sm" 
          placeholder="Search by name, SKU, or barcode..." 
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

      {/* Wholesale Indicator */}
      {isWholesale && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5 text-xs text-primary font-500">
          Wholesale prices shown
        </div>
      )}

      {/* Clock-in Warning */}
      {!canProcessSales && (
        <div className="bg-danger/5 border border-danger/20 rounded-lg px-3 py-1.5 text-xs text-danger font-500">
          Clock in to add products to cart
        </div>
      )}

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button 
          onClick={() => {
            setActivecat('');
            setSelectedGroup(null);
          }} 
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
            onClick={() => {
              setActivecat(c.category_id);
              setSelectedGroup(null);
            }} 
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

      {/* Back Button - Only show when viewing variants */}
      {isGroupView && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="text-xs text-primary hover:underline font-500 flex items-center gap-1"
          >
            ← Back
          </button>
          <span className="text-xs text-text-muted">
            {selectedGroup} ({getDisplayProducts.length} variants)
          </span>
        </div>
      )}

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-surface-card rounded-xl h-28 animate-pulse" />
            ))}
          </div>
        ) : getDisplayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-faint">
            <p className="text-sm">No products found</p>
            {isGroupView && (
              <button
                onClick={handleBack}
                className="text-xs text-primary hover:underline mt-2"
              >
                ← Back to all products
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {isGroupView || isSearching ? (
              // Show individual products (variants or search results)
              getDisplayProducts.map(p => (
                <ProductCard 
                  key={p.product_id} 
                  product={p} 
                  onAdd={handleProductAdd} 
                  isWholesale={isWholesale}
                  canProcessSales={canProcessSales}
                  showSku={isSearching}
                />
              ))
            ) : (
              // Show grouped products
              getDisplayProducts.map(group => (
                <GroupedProductCard
                  key={group.name}
                  groupName={group.name}
                  variantCount={group.count}
                  firstVariant={group.variants[0]}
                  onClick={() => handleGroupClick(group.name)}
                  isWholesale={isWholesale}
                  canProcessSales={canProcessSales}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGrid;