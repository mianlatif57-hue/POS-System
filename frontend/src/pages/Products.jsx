// ============================================================
//  pages/Products.jsx — Product Catalogue Page
// ============================================================
// LEARNING NOTE:
// This page is simpler than Inventory. It shows ALL products
// (including out-of-stock ones) in a card grid format instead
// of a table. The difference from Inventory.jsx:
//
//  Inventory page  → table, managers use it, shows cost/margin,
//                    has stock adjustment, clicks open history
//
//  Products page   → card grid, shows what's available,
//                    good for a quick visual overview
//
// This page uses fetchInventory() (same endpoint) because that
// returns all product fields we need. We just display it differently.
//
// KEY LEARNING: The same API data can power completely different
// UI layouts. Data and presentation are separate concerns.
// ============================================================

import { useState, useEffect } from 'react';
import { fetchInventory, createProduct } from '../api.js';


// ============================================================
// PRODUCT CARD
// ============================================================
function ProductCard({ product }) {
  const isOutOfStock = product.stockQuantity === 0;
  const isLowStock   = product.stockQuantity > 0 && product.stockQuantity <= 5;

  const formatCurrency = (val) =>
    `Rs. ${parseFloat(val).toLocaleString('en-PK')}`;

  const margin = parseFloat(product.marginPercent).toFixed(1);

  return (
    <div className="card" style={{
      opacity: isOutOfStock ? 0.6 : 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
{/* Product Image Section */}
<div style={{
  width: '100%',
  height: 100,
  background: 'var(--color-surface-2)',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden', // Keeps the image inside the rounded corners
}}>
  {product.prodImage && product.prodImage !== '' ? (
    <img 
      src={product.prodImage} 
      alt={product.prodName} 
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover' // Fits the image beautifully without stretching it
      }} 
      onError={(e) => {
        // Fallback placeholder if the image path fails to load
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
  ) : null}

  {/* Fallback Box Placeholder (hidden if image loads successfully) */}
  <span style={{ 
    fontSize: '2.5rem', 
    display: product.prodImage ? 'none' : 'block' 
  }}>
    📦
  </span>
</div>


      {/* Name */}
      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
        {product.prodName}
      </div>

      {/* Stock badge */}
      <div>
        {isOutOfStock  && <span className="badge badge-danger">Out of Stock</span>}
        {isLowStock    && <span className="badge badge-warning">Low: {product.stockQuantity} left</span>}
        {!isOutOfStock && !isLowStock && (
          <span className="badge badge-success">{product.stockQuantity} in stock</span>
        )}
      </div>

      {/* Pricing info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        padding: '10px 0',
        borderTop: '1px solid var(--color-border)',
        fontSize: '0.82rem',
      }}>
        <div>
          <div className="text-muted">Cost</div>
          <div style={{ fontWeight: 600 }}>{formatCurrency(product.costPrice)}</div>
        </div>
        <div>
          <div className="text-muted">Sale</div>
          <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>
            {formatCurrency(product.salePrice)}
          </div>
        </div>
      </div>

      {/* Margin */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.82rem',
      }}>
        <span className="text-muted">Profit margin</span>
        <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
          {margin}%
        </span>
      </div>

      {product.prodDescription && (
        <p className="text-muted text-sm" style={{ marginTop: 4, lineHeight: 1.4 }}>
          {product.prodDescription.length > 80
            ? `${product.prodDescription.slice(0, 80)}...`
            : product.prodDescription}
        </p>
      )}
    </div>
  );
}


// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [form, setForm] = useState({
    prodName: '',
    prodDescription: '',
    prodImage: '',
    costPrice: '',
    salePrice: '',
    stockQuantity: '0',
  });
  const [imagePreview, setImagePreview] = useState('');

  const loadProducts = async () => {
    try {
      const data = await fetchInventory();
      setProducts(data);
    } catch {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setForm((prev) => ({ ...prev, prodImage: dataUrl }));
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm({
      prodName: '',
      prodDescription: '',
      prodImage: '',
      costPrice: '',
      salePrice: '',
      stockQuantity: '0',
    });
    setImagePreview('');
    setShowForm(false);
    setFormMessage('');
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!form.prodName.trim()) {
      setFormMessage('Product name is required.');
      return;
    }
    if (!form.costPrice || !form.salePrice) {
      setFormMessage('Cost and sale price are required.');
      return;
    }

    setSubmitting(true);
    setFormMessage('');
    try {
      await createProduct({
        prodName: form.prodName.trim(),
        prodDescription: form.prodDescription.trim() || null,
        prodImage: form.prodImage || null,
        costPrice: parseFloat(form.costPrice),
        salePrice: parseFloat(form.salePrice),
        stockQuantity: parseInt(form.stockQuantity, 10) || 0,
      });
      resetForm();
      setLoading(true);
      await loadProducts();
      setFormMessage('');
    } catch (err) {
      setFormMessage(err.friendlyMessage || 'Failed to create product.');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // FILTERING
  // ============================================================
  // LEARNING NOTE — chaining array methods:
  // We chain .filter() twice: once for stock status, once for
  // the search term. Each .filter() returns a new array, so
  // they can be chained cleanly.
  // ============================================================
  const filtered = products
    .filter(p => {
      if (filter === 'instock')    return p.stockQuantity > 0;
      if (filter === 'outofstock') return p.stockQuantity === 0;
      return true; // 'all'
    })
    .filter(p =>
      p.prodName.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">
            Full product catalogue — {products.length} products total
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Product
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>Add New Product</h2>
          <form onSubmit={handleCreateProduct}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="text-sm text-muted">Product Name *</label>
                <input
                  className="input"
                  value={form.prodName}
                  onChange={(e) => setForm({ ...form, prodName: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Image URL (or upload below)</label>
                <input
                  className="input"
                  value={form.prodImage.startsWith('data:') ? '' : form.prodImage}
                  onChange={(e) => {
                    setForm({ ...form, prodImage: e.target.value });
                    setImagePreview(e.target.value);
                  }}
                  placeholder="https://..."
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="text-sm text-muted">Description</label>
              <textarea
                className="input"
                value={form.prodDescription}
                onChange={(e) => setForm({ ...form, prodDescription: e.target.value })}
                rows={3}
                style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'flex-start' }}>
              <div>
                <label className="text-sm text-muted">Upload Image</label>
                <input type="file" accept="image/*" onChange={handleImageFile} />
              </div>
              {(imagePreview || form.prodImage) && (
                <img
                  src={imagePreview || form.prodImage}
                  alt="Preview"
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="text-sm text-muted">Cost Price (Rs.) *</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Sale Price (Rs.) *</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salePrice}
                  onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Initial Stock</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {formMessage && (
              <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{formMessage}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Product'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Search */}
        <input
          className="input"
          placeholder="🔍 Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />

        {/* Stock filter buttons */}
        {/* LEARNING NOTE — Active styling with ternary:
            We dynamically switch the button class based on
            which filter is currently selected. */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { value: 'all',        label: 'All' },
            { value: 'instock',    label: 'In Stock' },
            { value: 'outofstock', label: 'Out of Stock' },
          ].map(option => (
            <button
              key={option.value}
              className={`btn ${filter === option.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && <div className="state-box"><p>Loading products...</p></div>}
      {error   && <div className="state-box"><p style={{ color: 'var(--color-danger)' }}>{error}</p></div>}

      {/* Product grid */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="state-box">
              <p>No products match your search or filter.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}>
              {filtered.map(p => (
                <ProductCard key={p.prodID} product={p} />
              ))}
            </div>
          )}

          {/* Summary line */}
          <p className="text-muted text-sm" style={{ marginTop: 20 }}>
            Showing {filtered.length} of {products.length} products
          </p>
        </>
      )}
    </div>
  );
}