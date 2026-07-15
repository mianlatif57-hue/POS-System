import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSalesHistory, getInvoiceDetails, returnSale } from '../api.js';

export default function SalesReturn() {
  const { invoiceId: invoiceIdParam } = useParams();
  const navigate = useNavigate();
  const initialInvoiceId = invoiceIdParam ? parseInt(invoiceIdParam, 10) : null;

  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoiceId);
  const [returnLines, setReturnLines] = useState([]);
  const [returnSelections, setReturnSelections] = useState({});
  const [returnMode, setReturnMode] = useState('partial');
  const [returnReason, setReturnReason] = useState('');
  const [loadingLines, setLoadingLines] = useState(false);
  const [linesError, setLinesError] = useState('');
  const [returning, setReturning] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getSalesHistory();
        setSales(data);
      } catch {
        setLinesError('Failed to load sales list.');
      } finally {
        setLoadingSales(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedInvoiceId) {
      setReturnLines([]);
      setReturnSelections({});
      return;
    }

    async function loadInvoice() {
      setLoadingLines(true);
      setLinesError('');
      setMessage('');
      try {
        const data = await getInvoiceDetails(selectedInvoiceId);
        const lines = data.lines || [];

        if (lines.length === 0) {
          setLinesError('This invoice has no products to return.');
          setReturnLines([]);
          return;
        }

        const missingProdId = lines.some((line) => line.prodID == null);
        if (missingProdId) {
          setLinesError(
            'Invoice lines are missing prodID. Run backend/sql/usp_GetInvoice_add_prodID.sql on your database.'
          );
          return;
        }

        setReturnLines(lines);
        const initial = {};
        lines.forEach((line) => {
          initial[line.prodID] = { selected: false, qty: line.quantitySold };
        });
        setReturnSelections(initial);
      } catch {
        setLinesError('Failed to load invoice products.');
      } finally {
        setLoadingLines(false);
      }
    }

    loadInvoice();
    navigate(`/sales/return/${selectedInvoiceId}`, { replace: true });
  }, [selectedInvoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const toggleLineSelected = (prodID) => {
    setReturnSelections((prev) => ({
      ...prev,
      [prodID]: { ...prev[prodID], selected: !prev[prodID]?.selected },
    }));
  };

  const updateLineQty = (prodID, qty, maxQty) => {
    const parsed = parseInt(qty, 10);
    const safeQty = Number.isNaN(parsed) ? 1 : Math.min(Math.max(1, parsed), maxQty);
    setReturnSelections((prev) => ({
      ...prev,
      [prodID]: { ...prev[prodID], qty: safeQty, selected: true },
    }));
  };

  const selectAllLines = () => {
    const next = {};
    returnLines.forEach((line) => {
      next[line.prodID] = { selected: true, qty: line.quantitySold };
    });
    setReturnSelections(next);
  };

  const handleReturn = async () => {
    if (!selectedInvoiceId) return;

    let items = null;
    if (returnMode === 'partial') {
      items = returnLines
        .filter((line) => returnSelections[line.prodID]?.selected)
        .map((line) => ({
          prodID: line.prodID,
          qty: returnSelections[line.prodID].qty,
        }));

      if (items.length === 0) {
        setMessage('Select at least one product, or switch to "Return entire invoice".');
        return;
      }
    }

    setReturning(true);
    setMessage('');
    try {
      const result = await returnSale(selectedInvoiceId, returnReason, items);
      const units = result.unitsReturned ?? result.itemsReturned;
      setMessage(`Success: ${result.message} — ${units} unit(s) returned to inventory.`);
      setTimeout(() => navigate('/sales'), 2000);
    } catch (err) {
      setMessage(`Failed: ${err.friendlyMessage || 'Return processing failed'}`);
    } finally {
      setReturning(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/sales" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
            ← Back to Sales
          </Link>
          <div>
            <h1 className="page-title">Process Return</h1>
            <p className="page-subtitle">Select an invoice and return specific products or the full order</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 12, fontSize: '1rem', fontWeight: 700 }}>1. Select Invoice</h2>
        {loadingSales ? (
          <p>Loading invoices...</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr
                    key={sale.invoiceID}
                    style={{
                      background:
                        selectedInvoiceId === sale.invoiceID
                          ? 'rgba(79, 110, 247, 0.12)'
                          : 'transparent',
                    }}
                  >
                    <td><strong>#{sale.invoiceID}</strong></td>
                    <td>{formatDateTime(sale.invoiceDateTime)}</td>
                    <td>{sale.empName}</td>
                    <td>{formatCurrency(sale.totalAmount)}</td>
                    <td>
                      <button
                        className={`btn btn-small ${selectedInvoiceId === sale.invoiceID ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setSelectedInvoiceId(sale.invoiceID)}
                      >
                        {selectedInvoiceId === sale.invoiceID ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInvoiceId && (
        <div className="card">
          <h2 style={{ marginBottom: 12, fontSize: '1rem', fontWeight: 700 }}>
            2. Return Items — Invoice #{selectedInvoiceId}
          </h2>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setReturnMode('partial')}
              disabled={returning || !!linesError}
              className={`btn ${returnMode === 'partial' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1 }}
            >
              Return selected products
            </button>
            <button
              type="button"
              onClick={() => setReturnMode('full')}
              disabled={returning || !!linesError}
              className={`btn ${returnMode === 'full' ? 'btn-danger' : 'btn-ghost'}`}
              style={{ flex: 1 }}
            >
              Return entire invoice
            </button>
          </div>

          {loadingLines && <p>Loading products...</p>}
          {linesError && <p style={{ color: 'var(--color-danger)' }}>{linesError}</p>}

          {!loadingLines && !linesError && returnMode === 'partial' && returnLines.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Products on this invoice</span>
                <button type="button" onClick={selectAllLines} disabled={returning} className="btn btn-ghost btn-small">
                  Select all
                </button>
              </div>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 6 }}>
                {returnLines.map((line) => (
                  <div
                    key={line.prodID}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!returnSelections[line.prodID]?.selected}
                      onChange={() => toggleLineSelected(line.prodID)}
                      disabled={returning}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{line.prodName}</div>
                      <div className="text-muted text-sm">
                        Sold: {line.quantitySold} × {formatCurrency(line.unitPrice)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label className="text-muted text-sm">Qty</label>
                      <input
                        type="number"
                        className="input"
                        min={1}
                        max={line.quantitySold}
                        value={returnSelections[line.prodID]?.qty ?? line.quantitySold}
                        onChange={(e) => updateLineQty(line.prodID, e.target.value, line.quantitySold)}
                        disabled={returning}
                        style={{ width: 64, padding: '4px 8px', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loadingLines && !linesError && returnMode === 'full' && (
            <p
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-danger)',
              }}
            >
              All {returnLines.length} product line(s) on this invoice will be returned to inventory.
            </p>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Reason for return (optional)
            </label>
            <textarea
              className="input"
              placeholder="e.g., Customer changed mind, damaged item..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              disabled={returning}
              style={{ minHeight: 70, width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          {message && (
            <p
              style={{
                marginBottom: 16,
                padding: 10,
                borderRadius: 4,
                background: message.startsWith('Success') ? 'var(--color-success)' : 'var(--color-danger)',
                color: '#fff',
              }}
            >
              {message}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-danger"
              onClick={handleReturn}
              disabled={returning || loadingLines || !!linesError}
              style={{ flex: 1 }}
            >
              {returning ? 'Processing...' : returnMode === 'full' ? 'Confirm Full Return' : 'Confirm Return'}
            </button>
            <Link to="/sales" className="btn btn-ghost" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
              Cancel
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
