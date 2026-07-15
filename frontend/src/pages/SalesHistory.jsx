// ============================================================
//  pages/SalesHistory.jsx — Sales History / Invoices Page
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSalesHistory, getInvoiceDetails } from '../api.js';

export default function SalesHistory() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  useEffect(() => {
    async function loadSalesHistory() {
      try {
        const data = await getSalesHistory();
        setSales(data);
      } catch {
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
    } catch {
      setDetailsError('Failed to load invoice details.');
    } finally {
      setLoadingDetails(false);
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="page-subtitle">All invoices and transactions</p>
        </div>
        <Link to="/sales/return" className="btn btn-warning" style={{ textDecoration: 'none' }}>
          Process Return
        </Link>
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
                        onClick={() => navigate(`/sales/return/${sale.invoiceID}`)}
                        style={{
                          background: 'var(--color-warning)',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                        }}
                        title="Open return page for this invoice"
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
    </div>
  );
}
