// ============================================================
//  pages/Inventory.jsx — Inventory Management Page
// ============================================================
// LEARNING NOTE:
// This page has the most going on visually. It demonstrates:
//  1. Fetching a list and displaying it in a table
//  2. Clicking a row to open a DETAIL modal (usp_GetProductDetail)
//  3. A stock ADJUSTMENT form inside the detail modal
//     (usp_AdjustInventory)
//  4. Multiple pieces of state working together
//
// Two modals are used here:
//  - ProductDetailModal: shows product info + history
//  - AdjustModal: form to add/remove stock
// ============================================================

import { useState, useEffect } from 'react';
import { fetchInventory, fetchProductDetail, adjustInventory } from '../api.js';

// ============================================================
// STOCK BADGE — shows color based on quantity
// ============================================================
// LEARNING NOTE — Small helper components:
// Even a tiny piece of repeated UI logic is worth extracting.
// This badge is used in every table row, so we define it once.
// ============================================================
function StockBadge({ qty }) {
  if (qty === 0)  return <span className="badge badge-danger">Out of Stock</span>;
  if (qty <= 5)   return <span className="badge badge-warning">{qty} left</span>;
  return               <span className="badge badge-success">{qty} in stock</span>;
}


// ============================================================
// ADJUST STOCK MODAL
// ============================================================
// Props:
//   product  — the product being adjusted
//   onClose  — called when user cancels
//   onSaved  — called after successful adjustment (with new qty)
// ============================================================
function AdjustModal({ product, onClose, onSaved }) {
  // LEARNING NOTE — Controlled inputs:
  // In React, form inputs are "controlled" when their value
  // is stored in state and updated via onChange.
  // The input doesn't control itself — React does.
  // This is the recommended way to handle forms in React.
  const [qty,    setQty]    = useState('');
  const [reason, setReason] = useState('');
  const [type,   setType]   = useState('add');    // 'add' or 'remove'
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const CURRENT_EMP_ID = 1; // hardcoded for now (same as Transaction.jsx)

  const handleSubmit = async () => {
    const numQty = parseInt(qty);
    if (!numQty || numQty <= 0) {
      setError('Please enter a valid quantity (must be greater than 0).');
      return;
    }
    if (type === 'remove' && numQty > product.stockQuantity) {
      setError(`Cannot remove more than current stock (${product.stockQuantity}).`);
      return;
    }

    // Positive for add, negative for remove
    const adjustedQty = type === 'add' ? numQty : -numQty;

    setSaving(true);
    setError('');
    try {
      const result = await adjustInventory(
        product.prodID,
        CURRENT_EMP_ID,
        adjustedQty,
        reason || null
      );
      onSaved(result.newStockQuantity); // tell parent the new quantity
    } catch (err) {
      setError(err.friendlyMessage || 'Adjustment failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Adjust Stock</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
          Product: <strong style={{ color: 'var(--color-text)' }}>{product.prodName}</strong>
          <br />
          Current stock: <strong style={{ color: 'var(--color-text)' }}>{product.stockQuantity}</strong>
        </p>

        {/* Add or Remove toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className={`btn ${type === 'add' ? 'btn-success' : 'btn-ghost'}`}
            style={{ flex: 1 }}
            onClick={() => setType('add')}
          >
            ➕ Add Stock
          </button>
          <button
            className={`btn ${type === 'remove' ? 'btn-danger' : 'btn-ghost'}`}
            style={{ flex: 1 }}
            onClick={() => setType('remove')}
          >
            ➖ Remove Stock
          </button>
        </div>

        {/* Quantity input */}
        <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
          Quantity
        </label>
        <input
          className="input"
          type="number"
          min="1"
          placeholder="e.g. 10"
          value={qty}
          onChange={e => setQty(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {/* Reason input */}
        <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--color-muted)' }}>
          Reason (optional)
        </label>
        <input
          className="input"
          type="text"
          placeholder="e.g. New stock from supplier"
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        {/* Error */}
        {error && (
          <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 12 }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className={`btn ${type === 'add' ? 'btn-success' : 'btn-danger'}`}
            onClick={handleSubmit}
            disabled={saving || !qty}
          >
            {saving ? 'Saving...' : `Confirm ${type === 'add' ? 'Add' : 'Remove'}`}
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// PRODUCT DETAIL MODAL
// ============================================================
// Triggered when the user clicks a product row in the table.
// Calls usp_GetProductDetail which returns:
//   - Product info (result set 1)
//   - Inventory history (result set 2)
// ============================================================
function ProductDetailModal({ prodID, onClose, onStockChanged }) {
  const [detail,      setDetail]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [showAdjust,  setShowAdjust]  = useState(false);

  // Load product detail when modal opens
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProductDetail(prodID);
        setDetail(data);
      } catch (err) {
        setError('Failed to load product details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [prodID]);

  // Called after a successful stock adjustment
  const handleStockSaved = (newQty) => {
    // Update the detail in local state so the UI refreshes
    // without needing to re-fetch from the server
    setDetail(prev => ({ ...prev, stockQuantity: newQty }));
    setShowAdjust(false);
    onStockChanged(); // tell the parent table to refresh too
  };

  const formatCurrency = (val) =>
    `Rs. ${parseFloat(val).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

  const formatDateTime = (str) =>
    new Date(str).toLocaleString('en-PK', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Product Detail</h2>
            <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
          </div>

          {loading && <div className="state-box"><p>Loading...</p></div>}
          {error   && <div className="state-box"><p style={{ color: 'var(--color-danger)' }}>{error}</p></div>}

          {detail && (
            <>
              {/* Product info grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 12, marginBottom: 20,
                padding: 16, background: 'var(--color-surface-2)',
                borderRadius: 8
              }}>
                <div>
                  <div className="text-muted text-sm">Product Name</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{detail.prodName}</div>
                </div>
                <div>
                  <div className="text-muted text-sm">Current Stock</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>
                    <StockBadge qty={detail.stockQuantity} />
                  </div>
                </div>
                <div>
                  <div className="text-muted text-sm">Cost Price</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{formatCurrency(detail.costPrice)}</div>
                </div>
                <div>
                  <div className="text-muted text-sm">Sale Price</div>
                  <div style={{ fontWeight: 700, marginTop: 2, color: 'var(--color-success)' }}>
                    {formatCurrency(detail.salePrice)}
                  </div>
                </div>
              </div>

              {/* Adjust stock button */}
              <button
                className="btn btn-primary"
                style={{ marginBottom: 20 }}
                onClick={() => setShowAdjust(true)}
              >
                📦 Adjust Stock
              </button>

              {/* Inventory history */}
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10 }}>
                Adjustment History (last 20)
              </h3>

              {detail.history.length === 0 ? (
                <p className="text-muted text-sm">No adjustments recorded yet.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>By</th>
                        <th>Change</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.history.map((h, idx) => (
                        <tr key={idx}>
                          <td className="text-sm">{formatDateTime(h.adjustedAt)}</td>
                          <td>{h.empName}</td>
                          <td>
                            {/* LEARNING NOTE — Conditional styling:
                                We change color based on whether the
                                adjustment was positive or negative. */}
                            <span style={{
                              color: h.adjustedQty > 0
                                ? 'var(--color-success)'
                                : 'var(--color-danger)',
                              fontWeight: 700
                            }}>
                              {h.adjustedQty > 0 ? '+' : ''}{h.adjustedQty}
                            </span>
                          </td>
                          <td className="text-muted text-sm">
                            {h.reason || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Adjust modal renders ON TOP of detail modal */}
      {showAdjust && detail && (
        <AdjustModal
          product={detail}
          onClose={() => setShowAdjust(false)}
          onSaved={handleStockSaved}
        />
      )}
    </>
  );
}


// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function Inventory() {
  const [products,       setProducts]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [selectedProdID, setSelectedProdID] = useState(null); // which product's modal is open
  const [search,         setSearch]         = useState('');

  // Load inventory list
  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await fetchInventory();
      setProducts(data);
    } catch (err) {
      setError('Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Filter by search
  const filtered = products.filter(p =>
    p.prodName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inventory</h1>
        <p className="page-subtitle">
          Click any product row to view details and adjust stock
        </p>
      </div>

      {/* Search bar */}
      <input
        className="input"
        placeholder="🔍 Search products..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 360 }}
      />

      {/* Table */}
      <div className="card">
        {loading && <div className="state-box"><p>Loading inventory...</p></div>}
        {error   && <div className="state-box"><p style={{ color: 'var(--color-danger)' }}>{error}</p></div>}

        {!loading && !error && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Cost Price</th>
                  <th>Sale Price</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  // LEARNING NOTE — onClick on a <tr>:
                  // You can attach events to any element, not just buttons.
                  // Clicking the row opens the detail modal for that product.
                  <tr
                    key={p.prodID}
                    className="clickable"
                    onClick={() => setSelectedProdID(p.prodID)}
                  >
                    <td className="text-muted text-sm">{p.prodID}</td>
                    <td style={{ fontWeight: 600 }}>{p.prodName}</td>
                    <td><StockBadge qty={p.stockQuantity} /></td>
                    <td>Rs. {parseFloat(p.costPrice).toLocaleString()}</td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                      Rs. {parseFloat(p.salePrice).toLocaleString()}
                    </td>
                    <td>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        {parseFloat(p.marginPercent).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="state-box"><p>No products found.</p></div>
            )}
          </div>
        )}
      </div>

      {/* Detail modal — only renders when a product is selected */}
      {selectedProdID && (
        <ProductDetailModal
          prodID={selectedProdID}
          onClose={() => setSelectedProdID(null)}
          onStockChanged={loadInventory}  // refresh table after adjustment
        />
      )}
    </div>
  );
}