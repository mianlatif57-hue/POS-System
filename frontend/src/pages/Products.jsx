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
import { fetchInventory } from '../api.js';


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
  const [filter,   setFilter]   = useState('all'); // 'all' | 'instock' | 'outofstock'

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchInventory();
        setProducts(data);
      } catch (err) {
        setError('Failed to load products.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <p className="page-subtitle">
          Full product catalogue — {products.length} products total
        </p>
      </div>

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