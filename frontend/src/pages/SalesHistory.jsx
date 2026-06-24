// ============================================================
//  pages/SalesHistory.jsx — Sales History / Invoices Page
// ============================================================

import { useState, useEffect } from 'react';
import { getSalesHistory, getInvoiceDetails, returnSale } from '../api.js';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  // Return modal state
  const [returnInvoiceId, setReturnInvoiceId] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnMode, setReturnMode] = useState('partial'); // 'partial' | 'full'
  const [returnLines, setReturnLines] = useState([]); // invoice lines for return modal
  const [returnSelections, setReturnSelections] = useState({}); // prodID -> { selected, qty }
  const [loadingReturnModal, setLoadingReturnModal] = useState(false);
  const [returnModalError, setReturnModalError] = useState('');
  const [returningInvoice, setReturningInvoice] = useState(false);
  const [returnMessage, setReturnMessage] = useState('');

  useEffect(() => {
    async function loadSalesHistory() {
      try {
        const data = await getSalesHistory();
        setSales(data);
      } catch (err) {
        setError('Failed to load sales history.');
      } finally {
        setLoading(false);
      }
    }
    loadSalesHistory();
  }, []);

  const handleExpandInvoice = async (invoiceId) => {
    if (expandedInvoiceId === invoiceId) {
      setExpandedInvoiceId(null);
      setInvoiceDetails(null);
      return;
    }

    setLoadingDetails(true);
    setDetailsError('');
    try {
      const data = await getInvoiceDetails(invoiceId);
      setInvoiceDetails(data);
      setExpandedInvoiceId(invoiceId);
    } catch (err) {
      setDetailsError('Failed to load invoice details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openReturnModal = async (invoiceId) => {
    setReturnInvoiceId(invoiceId);
    setReturnReason('');
    setReturnMode('partial');
    setReturnMessage('');
    setReturnModalError('');
    setReturnSelections({});
    setReturnLines([]);
    setLoadingReturnModal(true);

    try {
      const data = await getInvoiceDetails(invoiceId);
      const lines = data.lines || [];

      if (lines.length === 0) {
        setReturnModalError('This invoice has no products to return.');
        return;
      }

      const missingProdId = lines.some((line) => line.prodID == null);
      if (missingProdId) {
        setReturnModalError(
          'Invoice line items are missing prodID. Update usp_GetInvoice to include D.prodID in the line-item SELECT (see backend/sql/usp_GetInvoice_add_prodID.sql).'
        );
        return;
      }

      setReturnLines(lines);
      const initial = {};
      lines.forEach((line) => {
        initial[line.prodID] = { selected: false, qty: line.quantitySold };
      });
      setReturnSelections(initial);
    } catch (err) {
      setReturnModalError('Failed to load invoice products for return.');
    } finally {
      setLoadingReturnModal(false);
    }
  };

  const closeReturnModal = () => {
    if (returningInvoice) return;
    setReturnInvoiceId(null);
    setReturnReason('');
    setReturnMode('partial');
    setReturnLines([]);
    setReturnSelections({});
    setReturnModalError('');
    setReturnMessage('');
  };

  const toggleLineSelected = (prodID) => {
    setReturnSelections((prev) => ({
      ...prev,
      [prodID]: {
        ...prev[prodID],
        selected: !prev[prodID]?.selected,
      },
    }));
  };

  const updateLineQty = (prodID, qty, maxQty) => {
    const parsed = parseInt(qty, 10);
    const safeQty = Number.isNaN(parsed) ? 1 : Math.min(Math.max(1, parsed), maxQty);
    setReturnSelections((prev) => ({
      ...prev,
      [prodID]: {
        ...prev[prodID],
        qty: safeQty,
        selected: true,
      },
    }));
  };

  const selectAllLines = () => {
    const next = {};
    returnLines.forEach((line) => {
      next[line.prodID] = { selected: true, qty: line.quantitySold };
    });
    setReturnSelections(next);
  };

  const handleReturnInvoice = async () => {
    if (!returnInvoiceId) return;

    let items = null;
    if (returnMode === 'partial') {
      items = returnLines
        .filter((line) => returnSelections[line.prodID]?.selected)
        .map((line) => ({
          prodID: line.prodID,
          qty: returnSelections[line.prodID].qty,
        }));

      if (items.length === 0) {
        setReturnMessage('Select at least one product to return, or switch to "Return entire invoice".');
        return;
      }
    }

    setReturningInvoice(true);
    setReturnMessage('');
    try {
      const result = await returnSale(returnInvoiceId, returnReason, items);
      const units = result.unitsReturned ?? result.itemsReturned;
      setReturnMessage(`${result.message} — ${units} unit(s) returned to inventory`);

      const updatedSales = await getSalesHistory();
      setSales(updatedSales);

      if (expandedInvoiceId === returnInvoiceId) {
        const refreshed = await getInvoiceDetails(returnInvoiceId);
        setInvoiceDetails(refreshed);
      }

      setTimeout(closeReturnModal, 2000);
    } catch (err) {
      setReturnMessage(`Failed: ${err.friendlyMessage || 'Return processing failed'}`);
    } finally {
      setReturningInvoice(false);
    }
  };

  const formatCurrency = (val) =>
    `Rs. ${parseFloat(val).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Sales History</h1>
        </div>
        <div className="state-box">
          <p>Loading sales history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Sales History</h1>
        </div>
        <div className="state-box">
          <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Sales History</h1>
          <p className="page-subtitle">All invoices and transactions</p>
        </div>
        <div className="state-box">
          <p style={{ color: 'var(--color-muted)' }}>No sales recorded yet.</p>
        </div>
      </div>
    );
  }

  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sales History</h1>
        <p className="page-subtitle">All invoices and transactions</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Invoices</div>
          <div className="stat-value">{totalSales}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>
            {formatCurrency(totalRevenue)}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>
          All Sales
        </h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date & Time</th>
                <th>Employee</th>
                <th>Total Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.invoiceID}>
                  <td>
                    <strong>#{sale.invoiceID}</strong>
                  </td>
                  <td>{formatDateTime(sale.invoiceDateTime)}</td>
                  <td>{sale.empName}</td>
                  <td>{formatCurrency(sale.totalAmount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-small"
                        onClick={() => handleExpandInvoice(sale.invoiceID)}
                        style={{
                          background:
                            expandedInvoiceId === sale.invoiceID
                              ? 'var(--color-primary)'
                              : 'var(--color-secondary)',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                        }}
                      >
                        {expandedInvoiceId === sale.invoiceID ? '▼ Close' : '▶ View'}
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => openReturnModal(sale.invoiceID)}
                        style={{
                          background: 'var(--color-warning)',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                        }}
                        title="Return specific products or entire invoice"
                      >
                        Return
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {expandedInvoiceId && (
        <div className="card" style={{ marginTop: 20, borderLeft: '4px solid var(--color-primary)' }}>
          <h3 style={{ marginBottom: 12, fontSize: '0.95rem', fontWeight: 700 }}>
            📦 Invoice #{expandedInvoiceId} — Line Items
          </h3>

          {loadingDetails && <p>Loading invoice details...</p>}
          {detailsError && <p style={{ color: 'var(--color-danger)' }}>{detailsError}</p>}

          {invoiceDetails && invoiceDetails.lines && invoiceDetails.lines.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceDetails.lines.map((line, idx) => (
                    <tr key={idx}>
                      <td>{line.prodName}</td>
                      <td style={{ textAlign: 'center' }}>{line.quantitySold}</td>
                      <td>{formatCurrency(line.unitPrice)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(line.subTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    Total: {formatCurrency(invoiceDetails.header.totalAmount)}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>
                  {invoiceDetails.lines.length} item{invoiceDetails.lines.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          {invoiceDetails && invoiceDetails.lines && invoiceDetails.lines.length === 0 && (
            <p style={{ color: 'var(--color-muted)' }}>No items in this invoice.</p>
          )}
        </div>
      )}

      {returnInvoiceId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={closeReturnModal}
        >
          <div
            className="card"
            style={{
              width: '95%',
              maxWidth: 560,
              padding: 24,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 8, fontSize: '1.1rem', fontWeight: 700 }}>
               Return — Invoice #{returnInvoiceId}
            </h2>
            <p style={{ marginBottom: 16, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              Choose specific products or return the entire invoice. Stock is restored for returned items.
            </p>

            {/* Return mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setReturnMode('partial')}
                disabled={returningInvoice || !!returnModalError}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: returningInvoice ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  background: returnMode === 'partial' ? 'var(--color-primary)' : 'var(--color-border)',
                  color: returnMode === 'partial' ? '#fff' : 'var(--color-text)',
                }}
              >
                Return selected products
              </button>
              <button
                type="button"
                onClick={() => setReturnMode('full')}
                disabled={returningInvoice || !!returnModalError}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: returningInvoice ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  background: returnMode === 'full' ? 'var(--color-danger)' : 'var(--color-border)',
                  color: returnMode === 'full' ? '#fff' : 'var(--color-text)',
                }}
              >
                Return entire invoice
              </button>
            </div>

            {loadingReturnModal && <p>Loading products...</p>}

            {returnModalError && (
              <p style={{ color: 'var(--color-danger)', marginBottom: 16, fontSize: '0.9rem' }}>
                {returnModalError}
              </p>
            )}

            {!loadingReturnModal && !returnModalError && returnMode === 'partial' && returnLines.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Products on this invoice</span>
                  <button
                    type="button"
                    onClick={selectAllLines}
                    disabled={returningInvoice}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    Select all
                  </button>
                </div>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
                  {returnLines.map((line) => (
                    <div
                      key={line.prodID}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--color-border)',
                        background: returnSelections[line.prodID]?.selected
                          ? 'rgba(var(--color-primary-rgb, 59, 130, 246), 0.08)'
                          : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!returnSelections[line.prodID]?.selected}
                        onChange={() => toggleLineSelected(line.prodID)}
                        disabled={returningInvoice}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{line.prodName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                          Sold: {line.quantitySold} × {formatCurrency(line.unitPrice)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Qty</label>
                        <input
                          type="number"
                          className="input"
                          min={1}
                          max={line.quantitySold}
                          value={returnSelections[line.prodID]?.qty ?? line.quantitySold}
                          onChange={(e) => updateLineQty(line.prodID, e.target.value, line.quantitySold)}
                          disabled={returningInvoice}
                          style={{ width: 64, padding: '4px 8px', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loadingReturnModal && !returnModalError && returnMode === 'full' && (
              <p
                style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--color-danger)',
                  fontSize: '0.9rem',
                }}
              >
                All {returnLines.length} product line(s) on this invoice will be returned to inventory.
              </p>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.9rem' }}>
                Reason for return (optional):
              </label>
              <textarea
                className="input"
                placeholder="e.g., Customer changed mind, damaged item..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                disabled={returningInvoice}
                style={{ minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {returnMessage && (
              <p
                style={{
                  marginBottom: 16,
                  padding: 10,
                  borderRadius: 4,
                  background: returnMessage.includes('✅') ? 'var(--color-success)' : 'var(--color-danger)',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              >
                {returnMessage}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleReturnInvoice}
                disabled={returningInvoice || loadingReturnModal || !!returnModalError}
                style={{
                  flex: 1,
                  background:
                    returningInvoice || loadingReturnModal || returnModalError
                      ? 'var(--color-muted)'
                      : 'var(--color-danger)',
                  color: '#fff',
                  border: 'none',
                  padding: 10,
                  borderRadius: 6,
                  cursor: returningInvoice || returnModalError ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {returningInvoice ? 'Processing...' : returnMode === 'full' ? 'Confirm Full Return' : 'Confirm Return'}
              </button>
              <button
                onClick={closeReturnModal}
                disabled={returningInvoice}
                style={{
                  flex: 1,
                  background: 'var(--color-border)',
                  color: 'var(--color-text)',
                  border: 'none',
                  padding: 10,
                  borderRadius: 6,
                  cursor: returningInvoice ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
