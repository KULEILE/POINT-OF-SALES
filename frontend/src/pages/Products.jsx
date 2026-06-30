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
    name: '', local_name: '', sku: '', barcode: '', category_id: '', brand: '',
    cost_price: '', selling_price: '', wholesale_price: '', tax_rate: 15, tax_exempt: false,
    reorder_level: 10, min_stock: 5, stock_quantity: 0, stock_unit: 'piece',
    expiry_date: '', location: 'Main Store'
  });

  const load = () => {
    setLoading(true);
    productService.getAll({ search, limit: 100 })
      .then(r => setProducts(r.data.products))
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
      name: '', local_name: '', sku: '', barcode: '', category_id: '', brand: '',
      cost_price: '', selling_price: '', wholesale_price: '', tax_rate: 15, tax_exempt: false,
      reorder_level: 10, min_stock: 5, stock_quantity: 0, stock_unit: 'piece',
      expiry_date: '', location: 'Main Store'
    });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({
      name: p.name, local_name: p.local_name || '', sku: p.sku,
      barcode: p.barcode || '', category_id: p.category_id || '',
      brand: p.brand || '', cost_price: p.cost_price,
      selling_price: p.selling_price, wholesale_price: p.wholesale_price || '',
      tax_rate: p.tax_rate, tax_exempt: p.tax_exempt, reorder_level: p.reorder_level,
      min_stock: p.min_stock || 5, stock_quantity: p.stock_quantity, stock_unit: p.stock_unit || 'piece',
      expiry_date: p.expiry_date ? p.expiry_date.split('T')[0] : '',
      location: p.location || 'Main Store'
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editProduct) {
        const updateData = { ...form };
        delete updateData.expiry_date;
        delete updateData.stock_quantity;
        await productService.update(editProduct.product_id, updateData);
        toast.success('Product updated successfully');
      } else {
        await productService.create(form);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product. Please try again.');
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-700 text-text-primary">Products</h2>
          <p className="text-sm text-text-muted">{products.length} active products</p>
        </div>
        <button onClick={openCreate} className="k-btn-primary">Add Product</button>
      </div>
      <div className="mb-4">
        <input className="k-input max-w-sm" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="k-card p-0 overflow-hidden">
        <table className="k-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Cost</th>
              <th>Retail Price</th>
              <th>Wholesale Price</th>
              <th>Stock</th>
              <th>Min Stock</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-center py-8 text-text-faint">Loading products...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-8 text-text-faint">No products found</td></tr>
            ) : products.map(p => {
              const isExpired = p.expiry_date && new Date(p.expiry_date) <= new Date();
              const hasWholesale = p.wholesale_price && p.wholesale_price > 0;
              return (
                <tr key={p.product_id}>
                  <td><div className="font-500 text-text-primary">{p.name}</div>{p.local_name && <div className="text-xs text-text-faint">{p.local_name}</div>}</td>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td>{p.category_name || '—'}</td>
                  <td>{formatCurrency(p.cost_price)}</td>
                  <td className="font-600 text-primary">{formatCurrency(p.selling_price)}</td>
                  <td className="font-600 text-accent">{hasWholesale ? formatCurrency(p.wholesale_price) : '—'}</td>
                  <td><span className={p.stock_quantity <= 0 ? 'text-danger font-600' : p.stock_quantity <= p.min_stock ? 'text-warning font-600' : 'text-text-muted'}>{p.stock_quantity}</span></td>
                  <td>{p.min_stock || 5}</td>
                  <td>
                    {p.expiry_date ? (
                      <span className={isExpired ? 'text-danger font-600' : 'text-text-muted'}>
                        {new Date(p.expiry_date).toLocaleDateString()}
                        {isExpired && ' (Expired)'}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <span className={isExpired ? 'text-danger font-600' : statusColor(p.status)}>
                      {isExpired ? 'Expired' : p.status}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => openEdit(p)} className="text-xs text-primary hover:underline">
                      {isExpired ? 'View' : 'Edit'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editProduct ? 'Edit Product' : 'Add Product'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          {[['name','Product Name','text',true],['local_name','Local Name','text',false],['sku','SKU','text',true],['barcode','Barcode','text',false],['brand','Brand','text',false]].map(([k,l,t,req]) => (
            <div key={k}>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">{l}{req && ' *'}</label>
              <input type={t} className="k-input" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} disabled={editProduct && k === 'sku'} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Category</label>
            <select className="k-input" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            </select>
          </div>
          {[['cost_price','Cost Price','number'],['selling_price','Retail Price','number'],['wholesale_price','Wholesale Price','number'],['tax_rate','Tax Rate %','number'],['reorder_level','Reorder Level','number'],['min_stock','Minimum Stock','number'],['stock_quantity','Opening Stock','number']].map(([k,l,t]) => (
            <div key={k}>
              <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">{l}</label>
              <input type={t} className="k-input" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} disabled={editProduct && k === 'stock_quantity'} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Expiry Date</label>
            <input type="date" className="k-input" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} disabled={!!editProduct} />
            {editProduct && <p className="text-xs text-text-faint mt-1">Expiry date cannot be edited after product creation.</p>}
          </div>
          <div>
            <label className="block text-xs font-500 text-text-muted uppercase tracking-wider mb-1.5">Location</label>
            <input type="text" className="k-input" placeholder="Main Store" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="k-btn-outline">Cancel</button>
          <button onClick={handleSave} className="k-btn-primary">{editProduct ? 'Update Product' : 'Create Product'}</button>
        </div>
      </Modal>
    </div>
  );
};

export default Products;