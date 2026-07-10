import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { formatCurrency, statusColor } from '../utils/formatters';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({
    name: '',
    local_name: '',
    size: '',
    sku: '',
    barcode: '',
    category_id: '',
    brand: '',
    cost_price: '',
    retail_price: '',
    wholesale_price: '',
    tax_rate: 15,
    tax_exempt: false,
    reorder_level: 10,
    min_stock: 5,
    stock_quantity: 0,
    stock_unit: 'piece',
    expiry_date: '',
    location: 'Main Store',
    // Auto-filled fields (hidden from user)
    variant_group: '',
    variant_name: '',
    variant_value: ''
  });

  const load = () => {
    setLoading(true);
    productService.getAll({ search, limit: 100 })
      .then(r => {
        const productData = r.data.products || [];
        productData.sort((a, b) => {
          if (a.variant_group && b.variant_group) {
            if (a.variant_group !== b.variant_group) {
              return a.variant_group.localeCompare(b.variant_group);
            }
            // Same group — order variants by size (e.g. "500g" before "1kg"),
            // NOT by variant_value, which holds cost_price in this schema.
            // `numeric: true` makes localeCompare treat embedded digits as
            // numbers so "2kg" correctly sorts after "500g" and before "10kg".
            return (a.size || a.variant_name || '').localeCompare(
              b.size || b.variant_name || '',
              undefined,
              { numeric: true, sensitivity: 'base' }
            );
          }
          return a.name.localeCompare(b.name);
        });
        setProducts(productData);
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);
  useEffect(() => {
    productService.getCategories()
      .then(r => setCategories(r.data.categories))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditProduct(null);
    setForm({
      name: '',
      local_name: '',
      size: '',
      sku: '',
      barcode: '',
      category_id: '',
      brand: '',
      cost_price: '',
      retail_price: '',
      wholesale_price: '',
      tax_rate: 15,
      tax_exempt: false,
      reorder_level: 10,
      min_stock: 5,
      stock_quantity: 0,
      stock_unit: 'piece',
      expiry_date: '',
      location: 'Main Store',
      variant_group: '',
      variant_name: '',
      variant_value: ''
    });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({
      name: p.name || '',
      local_name: p.local_name || '',
      size: p.size || p.variant_name || '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      category_id: p.category_id || '',
      brand: p.brand || '',
      cost_price: p.cost_price || '',
      retail_price: p.selling_price || '',
      wholesale_price: p.wholesale_price || '',
      tax_rate: p.tax_rate || 15,
      tax_exempt: p.tax_exempt || false,
      reorder_level: p.reorder_level || 10,
      min_stock: p.min_stock || 5,
      stock_quantity: p.stock_quantity || 0,
      stock_unit: p.stock_unit || 'piece',
      expiry_date: p.expiry_date ? p.expiry_date.split('T')[0] : '',
      location: p.location || 'Main Store',
      variant_group: p.variant_group || p.name || '',
      variant_name: p.variant_name || p.size || '',
      variant_value: p.variant_value || p.cost_price || ''
    });
    setShowModal(true);
  };

  // AUTO-FILL HANDLERS
  const handleNameChange = (value) => {
    setForm({
      ...form,
      name: value,
      variant_group: value // Auto-fill variant_group from name
    });
  };

  const handleSizeChange = (value) => {
    setForm({
      ...form,
      size: value,
      variant_name: value // Auto-fill variant_name from size
    });
  };

  const handleCostPriceChange = (value) => {
    setForm({
      ...form,
      cost_price: value,
      variant_value: value // Auto-fill variant_value from cost price
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.retail_price) {
      toast.error('Product Name, SKU, and Retail Price are required.');
      return;
    }

    try {
      const payload = {
        name: form.name,
        local_name: form.local_name || null,
        size: form.size || null,
        sku: form.sku,
        barcode: form.barcode || null,
        category_id: form.category_id || null,
        brand: form.brand || null,
        cost_price: parseFloat(form.cost_price) || 0,
        selling_price: parseFloat(form.retail_price) || 0,
        wholesale_price: form.wholesale_price ? parseFloat(form.wholesale_price) : null,
        tax_rate: parseFloat(form.tax_rate) || 15,
        tax_exempt: form.tax_exempt || false,
        reorder_level: parseFloat(form.reorder_level) || 10,
        min_stock: parseInt(form.min_stock) || 5,
        stock_unit: form.stock_unit || 'piece',
        expiry_date: form.expiry_date || null,
        location: form.location || 'Main Store',
        status: 'active',
        // AUTO-FILLED FIELDS (from user input)
        variant_group: form.variant_group || form.name, // Auto from name
        variant_name: form.variant_name || form.size || null, // Auto from size
        variant_value: parseFloat(form.variant_value) || parseFloat(form.cost_price) || 0 // Auto from cost
      };

      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      if (editProduct) {
        delete payload.stock_quantity;
        delete payload.expiry_date;
        await productService.update(editProduct.product_id, payload);
        toast.success('Product updated successfully');
      } else {
        payload.stock_quantity = parseFloat(form.stock_quantity) || 0;
        await productService.create(payload);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      load();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to save product. Please try again.';
      toast.error(errorMsg);
      console.error('Save error:', err);
    }
  };

  const formatVariantDisplay = (product) => {
    if (product.size) {
      return product.size;
    }
    if (product.variant_name) {
      return product.variant_name;
    }
    if (product.local_name) {
      return product.local_name;
    }
    return '';
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-700 text-text-primary">Products</h2>
          <p className="text-sm text-text-muted">{products.length} products</p>
        </div>
        <button onClick={openCreate} className="k-btn-primary">
          Add Product
        </button>
      </div>

      <div className="mb-4">
        <input
          className="k-input max-w-sm"
          placeholder="Search products by name, SKU, or barcode..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="k-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="k-table w-full">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Product</th>
                <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Variant</th>
                <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">SKU</th>
                <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Category</th>
                <th className="text-right py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Cost</th>
                <th className="text-right py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Retail</th>
                <th className="text-right py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Wholesale</th>
                <th className="text-right py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Stock</th>
                <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Expiry</th>
                <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-600 text-text-muted uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-8 text-text-faint">Loading products...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-text-faint">No products found</td></tr>
              ) : products.map(p => {
                const isExpired = p.expiry_date && new Date(p.expiry_date) <= new Date();
                const variantDisplay = formatVariantDisplay(p);
                const hasWholesale = p.wholesale_price && p.wholesale_price > 0;
                const hasVariants = products.filter(prod => prod.name === p.name).length > 1;

                return (
                  <tr key={p.product_id} className="border-t border-surface-border hover:bg-surface-card/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-500 text-text-primary">{p.name}</div>
                      {hasVariants && (
                        <div className="text-xs text-text-faint font-500">
                          Group: {p.variant_group || p.name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-text-muted">{variantDisplay || 'Standard'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-text-muted">{p.sku}</td>
                    <td className="py-3 px-4 text-sm">{p.category_name || '—'}</td>
                    <td className="py-3 px-4 text-right font-500">{formatCurrency(p.cost_price)}</td>
                    <td className="py-3 px-4 text-right font-600 text-primary">{formatCurrency(p.selling_price)}</td>
                    <td className="py-3 px-4 text-right font-600 text-accent">
                      {hasWholesale ? formatCurrency(p.wholesale_price) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-600 ${p.stock_quantity <= 0 ? 'text-danger' : p.stock_quantity <= p.min_stock ? 'text-warning' : 'text-text-muted'}`}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.expiry_date ? (
                        <span className={`text-sm ${isExpired ? 'text-danger font-600' : 'text-text-muted'}`}>
                          {new Date(p.expiry_date).toLocaleDateString()}
                          {isExpired && ' (Expired)'}
                        </span>
                      ) : (
                        <span className="text-sm text-text-faint">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isExpired ? 'bg-danger/10 text-danger' : statusColor(p.status)}`}>
                        {isExpired ? 'Expired' : p.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs text-primary hover:underline font-500"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editProduct ? 'Edit Product' : 'Add Product'} size="lg">
        <div className="space-y-6">
          {/* Basic Information Section */}
          <div>
            <h4 className="text-sm font-600 text-text-primary mb-3 border-b border-surface-border pb-2">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="e.g., Salt"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                />
                <p className="text-xs text-text-faint mt-1">→ Auto-fills variant group</p>
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Local Name
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="e.g., Letsoai"
                  value={form.local_name}
                  onChange={e => setForm({...form, local_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Size / Variant
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="e.g., 500g, 1kg, 2L"
                  value={form.size}
                  onChange={e => handleSizeChange(e.target.value)}
                />
                <p className="text-xs text-text-faint mt-1">→ Auto-fills variant name</p>
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  SKU (Unique Identifier)
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="e.g., SALT-001"
                  value={form.sku}
                  onChange={e => setForm({...form, sku: e.target.value})}
                  disabled={!!editProduct}
                />
                {editProduct && <p className="text-xs text-text-faint mt-1">SKU cannot be changed</p>}
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Barcode
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="Scan or enter barcode"
                  value={form.barcode}
                  onChange={e => setForm({...form, barcode: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  className="k-input"
                  value={form.category_id}
                  onChange={e => setForm({...form, category_id: e.target.value})}
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.category_id} value={c.category_id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Brand
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="Brand name"
                  value={form.brand}
                  onChange={e => setForm({...form, brand: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div>
            <h4 className="text-sm font-600 text-text-primary mb-3 border-b border-surface-border pb-2">Pricing</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Cost Price
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="0.00"
                  value={form.cost_price}
                  onChange={e => handleCostPriceChange(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-text-faint mt-1">→ Auto-fills variant value</p>
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Retail Price
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="0.00"
                  value={form.retail_price}
                  onChange={e => setForm({...form, retail_price: e.target.value})}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Wholesale Price
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="Optional - leave empty if not applicable"
                  value={form.wholesale_price}
                  onChange={e => setForm({...form, wholesale_price: e.target.value})}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-text-faint mt-1">Used for wholesale customers</p>
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="15"
                  value={form.tax_rate}
                  onChange={e => setForm({...form, tax_rate: e.target.value})}
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Stock Management Section */}
          <div>
            <h4 className="text-sm font-600 text-text-primary mb-3 border-b border-surface-border pb-2">Stock Management</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Opening Stock
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="0"
                  value={form.stock_quantity}
                  onChange={e => setForm({...form, stock_quantity: e.target.value})}
                  min="0"
                  disabled={!!editProduct}
                />
                {editProduct && <p className="text-xs text-text-faint mt-1">Stock quantity cannot be changed here</p>}
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Stock Unit
                </label>
                <select
                  className="k-input"
                  value={form.stock_unit}
                  onChange={e => setForm({...form, stock_unit: e.target.value})}
                >
                  <option value="piece">Piece</option>
                  <option value="kg">Kilogram</option>
                  <option value="g">Gram</option>
                  <option value="L">Liter</option>
                  <option value="ml">Milliliter</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="carton">Carton</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Reorder Level
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="10"
                  value={form.reorder_level}
                  onChange={e => setForm({...form, reorder_level: e.target.value})}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Minimum Stock
                </label>
                <input
                  type="number"
                  className="k-input"
                  placeholder="5"
                  value={form.min_stock}
                  onChange={e => setForm({...form, min_stock: e.target.value})}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Expiry Date
                </label>
                <input
                  type="date"
                  className="k-input"
                  value={form.expiry_date}
                  onChange={e => setForm({...form, expiry_date: e.target.value})}
                  disabled={!!editProduct}
                />
                {editProduct && <p className="text-xs text-text-faint mt-1">Expiry date cannot be changed</p>}
              </div>
              <div>
                <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  className="k-input"
                  placeholder="Main Store"
                  value={form.location}
                  onChange={e => setForm({...form, location: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Auto-Fill Summary (Hidden from user) */}
          <div className="hidden">
            <p>Auto-fill fields (not shown to user):</p>
            <p>variant_group: {form.variant_group}</p>
            <p>variant_name: {form.variant_name}</p>
            <p>variant_value: {form.variant_value}</p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-border">
          <button onClick={() => setShowModal(false)} className="k-btn-outline px-6 py-2">
            Cancel
          </button>
          <button onClick={handleSave} className="k-btn-primary px-6 py-2">
            {editProduct ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Products;