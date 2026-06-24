// ============================================================
//  components/InvoiceModal.jsx — Printable Invoice Modal
// ============================================================
// LEARNING NOTE — What is a "component"?
// A component is a reusable piece of UI. Instead of writing the
// invoice HTML in every page that needs it, we write it once here
// and import it wherever needed.
//
// This component:
//  - Receives props: invoiceID (which invoice to fetch) + onClose
//  - Fetches the invoice data from the backend
//  - Renders a formatted, printable invoice
//  - Has a "Print" button that triggers the browser's print dialog
//
// LEARNING NOTE — Props:
// Props (properties) are how parent components pass data to children.
// Like function arguments: <InvoiceModal invoiceID={7} onClose={...} />
// Inside InvoiceModal, we access them as: props.invoiceID (or destructured)
// ============================================================

import { useState, useEffect } from 'react';
import { fetchInvoice } from '../../api.js';

// ============================================================
// COMPONENT
// ============================================================
// We destructure props directly: { invoiceID, onClose }
// This is cleaner than writing: function InvoiceModal(props)
// and then using props.invoiceID, props.onClose everywhere.
// ============================================================
export default function InvoiceModal({ invoiceID, onClose }) {
  // ============================================================
  // STATE
  // ============================================================
  // LEARNING NOTE — useState:
  // useState(initialValue) returns [currentValue, setterFunction].
  // When you call the setter, React re-renders the component
  // with the new value. This is how React updates the UI.
  //
  // We need 3 pieces of state:
  //  - invoice: the data from the backend (null until loaded)
  //  - loading: show a spinner while fetching
  //  - error:   show an error message if fetch fails
  // ============================================================
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // ============================================================
  // EFFECT — Fetch invoice when component mounts
  // ============================================================
  // LEARNING NOTE — useEffect:
  // useEffect(callback, dependencies) runs AFTER the component
  // renders. The dependency array [invoiceID] means:
  // "run this effect when invoiceID changes."
  // With an empty array [], it runs only once (on mount).
  //
  // Why not fetch directly in the function body?
  // Because the component function runs on every render.
  // useEffect lets us run async code once, not on every render.
  // ============================================================
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchInvoice(invoiceID);
        setInvoice(data);
      } catch (err) {
        setError(err.friendlyMessage || 'Failed to load invoice');
      } finally {
        // "finally" runs whether the try succeeded or the catch caught
        setLoading(false);
      }
    }
    load();
  }, [invoiceID]); // re-run if invoiceID changes

  // ============================================================
  // PRINT HANDLER
  // ============================================================
  // window.print() triggers the browser's native print dialog.
  // Our CSS @media print rules hide the sidebar and buttons
  // so only the invoice content prints.
  // ============================================================
  const handlePrint = () => window.print();

  // Format a number as Pakistani Rupees
  const formatCurrency = (val) =>
    `Rs. ${parseFloat(val).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

  // Format a datetime string as a readable date+time
  const formatDateTime = (str) =>
    new Date(str).toLocaleString('en-PK', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  // ============================================================
  // RENDER
  // ============================================================
  // LEARNING NOTE — Conditional rendering:
  // React renders what you return. We use ternary operators
  // and logical && to conditionally show different content.
  //   condition ? ifTrue : ifFalse
  //   condition && <SomeThing />   (only renders if condition is true)
  // ============================================================
  return (
    // The overlay dims the background. Clicking it closes the modal.
    <div className="modal-overlay" onClick={onClose}>
      {/* stopPropagation prevents clicks INSIDE the modal from closing it */}
      <div className="modal invoice-print" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title">Invoice #{invoiceID}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="state-box">
            <p>Loading invoice...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="state-box">
            <p style={{ color: 'var(--color-danger)' }}>{error}</p>
          </div>
        )}

        {/* Invoice content */}
        {invoice && (
          <>
            {/* Header section */}
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>
                🛒 TechShop POS
              </h3>
              <div className="text-sm text-muted">
                <p>Date: {formatDateTime(invoice.header.invoiceDateTime)}</p>
                <p>Cashier: {invoice.header.empName}</p>
                <p>Invoice #: {invoice.header.invoiceID}</p>
              </div>
            </div>

            {/* Line items table */}
            <div className="table-wrapper" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {/* LEARNING NOTE — .map():
                      Array.map() transforms each item into a JSX element.
                      The "key" prop helps React efficiently update the list
                      when items change. Always use a unique, stable value.
                      Never use the array index as key for dynamic lists. */}
                  {invoice.lines.map((line, idx) => (
                    <tr key={idx}>
                      <td>{line.prodName}</td>
                      <td style={{ textAlign: 'right' }}>{line.quantitySold}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(line.unitPrice)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(line.subTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', borderTop: '2px solid var(--color-border)',
              fontWeight: 700, fontSize: '1.05rem'
            }}>
              <span>Total</span>
              <span style={{ color: 'var(--color-success)' }}>
                {formatCurrency(invoice.header.totalAmount)}
              </span>
            </div>

            {/* Footer */}
            <p className="text-sm text-muted" style={{ marginTop: 16, textAlign: 'center' }}>
              Thank you for shopping at TechShop! 
            </p>

            {/* Actions */}
            <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost"    onClick={onClose}>Close</button>
              <button className="btn btn-primary"  onClick={handlePrint}>🖨️ Print Invoice</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}