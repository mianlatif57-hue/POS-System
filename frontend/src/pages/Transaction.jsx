// ============================================================
//  pages/Transaction.jsx — POS / New Sale Page
// ============================================================
// LEARNING NOTE:
// This is the most complex page. It manages:
//  1. A product grid (clickable to add to cart)
//  2. A live cart with quantity controls
//  3. A "Complete Sale" action that calls the backend
//  4. An invoice modal shown after a successful sale
//
// Key React concepts demonstrated here:
//  - Multiple useState hooks managing different slices of state
//  - Passing functions as props (callbacks) to child components
//  - Derived state (cart total calculated from cart items)
//  - Optimistic UI updates (add to cart instantly, no API needed)
// ============================================================

import { useState, useEffect } from 'react';
import { fetchProducts, fetchEmployees, createSale } from '../api.js';
import InvoiceModal from '../components/InvoiceModal.jsx';

// ============================================================
// HARDCODED EMPLOYEE ID
// ============================================================
// DEPRECATED: Replaced with dynamic employee selector.
// See MAIN PAGE COMPONENT below for the employee selection state.
// ============================================================

// ============================================================
// ProductCard — A single product tile in the grid
// ============================================================
// LEARNING NOTE — Small focused components:
// Instead of one huge render function, we break UI into small
// components. ProductCard is a "presentational" component —
// it only knows how to display a product and fire an event.
// It doesn't know about carts, sales, or anything else.
// ============================================================
function ProductCard({ product, onAdd }) {
  const isOutOfStock = product.stockQuantity === 0;

  return (
    <div
      className={`card clickable ${isOutOfStock ? 'disabled-card' : ''}`}
      onClick={() => !isOutOfStock && onAdd(product)}
      style={{
        opacity: isOutOfStock ? 0.45 : 1,
        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
        padding: 16,
      }}
      // CSS hover effect via inline style isn't ideal — ideally
      // put hover styles in CSS. But for simplicity:
      onMouseEnter={(e) => !isOutOfStock && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
    >
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

      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
        {product.prodName}
      </div>
      <div style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
        Rs. {parseFloat(product.salePrice).toLocaleString()}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 4 }}>
        {isOutOfStock
          ? <span style={{ color: 'var(--color-danger)' }}>Out of stock</span>
          : `${product.stockQuantity} available`}
      </div>
    </div>
  );
}

// ============================================================
// CartItem — One row in the cart panel
// ============================================================
function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0', borderBottom: '1px solid var(--color-border)'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.prodName}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
          Rs. {parseFloat(item.unitPrice).toLocaleString()} each
        </div>
      </div>

      {/* Quantity controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button className="btn btn-ghost" onClick={() => onDecrease(item.prodID)}
          style={{ padding: '4px 10px', fontSize: '1rem' }}>−</button>
        <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>
          {item.qty}
        </span>
        <button className="btn btn-ghost" onClick={() => onIncrease(item.prodID)}
          style={{ padding: '4px 10px', fontSize: '1rem' }}>+</button>
      </div>

      {/* Subtotal */}
      <div style={{ minWidth: 90, textAlign: 'right', fontWeight: 600 }}>
        Rs. {(item.qty * parseFloat(item.unitPrice)).toLocaleString()}
      </div>

      {/* Remove */}
      <button className="btn btn-danger" onClick={() => onRemove(item.prodID)}
        style={{ padding: '4px 10px' }}>✕</button>
    </div>
  );
}


// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function Transaction() {
  const [products,   setProducts]   = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [cart,       setCart]       = useState([]);     // [{prodID, prodName, unitPrice, qty, stockQuantity}]
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [invoiceID,  setInvoiceID]  = useState(null);  // shows invoice modal when set
  const [search,     setSearch]     = useState('');
  const [selectedEmpID, setSelectedEmpID] = useState(null); // selected cashier/employee

  // Load products and employees on mount
  useEffect(() => {
    async function load() {
      try {
        const productsData = await fetchProducts();
        const employeesData = await fetchEmployees();
        setProducts(productsData);
        setEmployees(employeesData);
        // Auto-select first employee if available
        if (employeesData.length > 0) {
          setSelectedEmpID(employeesData[0].empID);
        }
      } catch (err) {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ============================================================
  // CART OPERATIONS
  // ============================================================
  // LEARNING NOTE — Immutable state updates:
  // In React, you must NEVER directly mutate state:
  //   cart.push(item)           ❌ Wrong — React won't re-render
  //   setCart([...cart, item])  ✅ Correct — creates a new array
  //
  // Always create a new array/object for state updates.
  // React compares references, not deep equality.
  // ============================================================

  const addToCart = (product) => {
    setCart(prev => {
      // Check if this product is already in the cart
      const existing = prev.find(item => item.prodID === product.prodID);
      if (existing) {
        // If it's already in the cart, increment qty (if stock allows)
        if (existing.qty >= product.stockQuantity) return prev; // don't exceed stock
        return prev.map(item =>
          item.prodID === product.prodID
            ? { ...item, qty: item.qty + 1 }  // spread + override qty
            : item
        );
      }
      // Not in cart yet — add as new item
      return [...prev, {
        prodID:        product.prodID,
        prodName:      product.prodName,
        unitPrice:     product.salePrice,
        qty:           1,
        stockQuantity: product.stockQuantity,
      }];
    });
  };

  const increaseQty = (prodID) => {
    setCart(prev => prev.map(item => {
      if (item.prodID !== prodID) return item;
      if (item.qty >= item.stockQuantity) return item; // cap at stock
      return { ...item, qty: item.qty + 1 };
    }));
  };

  const decreaseQty = (prodID) => {
    setCart(prev => {
      const updated = prev.map(item =>
        item.prodID === prodID ? { ...item, qty: item.qty - 1 } : item
      );
      // Remove items that reach 0
      return updated.filter(item => item.qty > 0);
    });
  };

  const removeFromCart = (prodID) => {
    setCart(prev => prev.filter(item => item.prodID !== prodID));
  };

  const clearCart = () => setCart([]);

  // ============================================================
  // DERIVED STATE — Cart Total
  // ============================================================
  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.qty * parseFloat(item.unitPrice)), 0
  );

  // ============================================================
  // COMPLETE SALE — Sends cart to backend
  // ============================================================
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (!selectedEmpID) {
      setError('Please select a cashier.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Format cart for the API (matches CreateSaleSchema)
      const apiCart = cart.map(item => ({
        prodID:    item.prodID,
        qty:       item.qty,
        unitPrice: parseFloat(item.unitPrice),
      }));

      const result = await createSale(selectedEmpID, apiCart);
      // Sale created! Show invoice modal.
      setInvoiceID(result.invoiceID);
      clearCart();
      // Refresh product list to show updated stock
      const updated = await fetchProducts();
      setProducts(updated);
    } catch (err) {
      setError(err.friendlyMessage || 'Sale failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products by search query
  const filteredProducts = products.filter(p =>
    p.prodName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New Sale</h1>
        <p className="page-subtitle">Click a product to add it to the cart</p>
      </div>

      {/* Cashier/Employee Selector */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>👤 Cashier:</label>
        <select
          className="input"
          value={selectedEmpID || ''}
          onChange={(e) => setSelectedEmpID(parseInt(e.target.value))}
          style={{ flex: 1, maxWidth: 250 }}
        >
          <option value="">Select a cashier...</option>
          {employees.map(emp => (
            <option key={emp.empID} value={emp.empID}>
              {emp.empName}
            </option>
          ))}
        </select>
      </div>

      {/* Two-column layout: products left, cart right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* ---- Product Grid ---- */}
        <div>
          {/* Search bar */}
          <input
            className="input"
            placeholder="🔍 Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          {loading && <div className="state-box"><p>Loading products...</p></div>}
          {error && <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{error}</p>}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12
          }}>
            {filteredProducts.map(product => (
              <ProductCard
                key={product.prodID}
                product={product}
                onAdd={addToCart}
              />
            ))}
          </div>

          {!loading && filteredProducts.length === 0 && (
            <div className="state-box"><p>No products found.</p></div>
          )}
        </div>

        {/* ---- Cart Panel ---- */}
        <div style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700 }}>Cart</h2>
              {cart.length > 0 && (
                <button className="btn btn-ghost" style={{ fontSize: '0.78rem' }}
                  onClick={clearCart}>
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-muted)' }}>
                <div style={{ fontSize: '2rem' }}>🛒</div>
                <p className="text-sm mt-2">Cart is empty</p>
              </div>
            ) : (
              <>
                {/* Cart items */}
                {cart.map(item => (
                  <CartItem
                    key={item.prodID}
                    item={item}
                    onIncrease={increaseQty}
                    onDecrease={decreaseQty}
                    onRemove={removeFromCart}
                  />
                ))}

                {/* Total */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '14px 0 10px', fontWeight: 700, fontSize: '1.05rem'
                }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--color-success)' }}>
                    Rs. {cartTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Complete Sale button */}
                <button
                  className="btn btn-success"
                  style={{ width: '100%', marginTop: 10, padding: '12px' }}
                  onClick={handleCompleteSale}
                  disabled={submitting || cart.length === 0}
                >
                  {submitting ? 'Processing...' : '✅ Complete Sale'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal — shown after a successful sale */}
      {invoiceID && (
        <InvoiceModal
          invoiceID={invoiceID}
          onClose={() => setInvoiceID(null)}
        />
      )}
    </div>
  );
}