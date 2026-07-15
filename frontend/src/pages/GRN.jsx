import { useState, useEffect } from 'react';
import {
  fetchGRNs,
  fetchGRNDetail,
  createGRN,
  fetchSuppliers,
  fetchInventory,
  fetchEmployees,
} from '../api.js';

const EMPTY_LINE = { prodID: '', qty: 1, unitCost: '' };

export default function GRNPage() {
  const [grns, setGrns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedGrnId, setExpandedGrnId] = useState(null);
  const [grnDetail, setGrnDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form, setForm] = useState({
    supplierID: '',
    empID: '',
    notes: '',
    items: [{ ...EMPTY_LINE }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    try {
      const [grnData, supplierData, productData, empData] = await Promise.all([
        fetchGRNs(),
        fetchSuppliers(),
        fetchInventory(),
        fetchEmployees(),
      ]);
      setGrns(grnData);
      setSuppliers(supplierData);
      setProducts(productData);
      setEmployees(empData);
    } catch {
      setError('Failed to load GRN data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val) => {
    if (val == null || val === '') return '—';
    return `Rs. ${parseFloat(val).toLocaleString('en-PK')}`;
  };

  const formatDateTime = (dateTimeStr) =>
    new Date(dateTimeStr).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleExpand = async (grnID) => {
    if (expandedGrnId === grnID) {
      setExpandedGrnId(null);
      setGrnDetail(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const detail = await fetchGRNDetail(grnID);
      setGrnDetail(detail);
      setExpandedGrnId(grnID);
    } catch {
      setMessage('Failed to load GRN details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const updateLine = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addLine = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_LINE }] }));
  };

  const removeLine = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplierID || !form.empID) {
      setMessage('Select a supplier and receiving employee.');
      return;
    }

    const items = form.items
      .filter((line) => line.prodID && parseInt(line.qty, 10) > 0)
      .map((line) => ({
        prodID: parseInt(line.prodID, 10),
        qty: parseInt(line.qty, 10),
        unitCost: line.unitCost ? parseFloat(line.unitCost) : null,
      }));

    if (items.length === 0) {
      setMessage('Add at least one product with quantity.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const result = await createGRN({
        supplierID: parseInt(form.supplierID, 10),
        empID: parseInt(form.empID, 10),
        notes: form.notes.trim() || null,
        items,
      });
      setMessage(`GRN #${result.grnID} created. Stock updated.`);
      setForm({ supplierID: '', empID: '', notes: '', items: [{ ...EMPTY_LINE }] });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setMessage(err.friendlyMessage || 'Failed to create GRN.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Goods Receipt Notes (GRN)</h1>
          <p className="page-subtitle">Record stock received from suppliers</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setMessage(''); }}>
          + New GRN
        </button>
      </div>

      {message && (
        <p style={{ marginBottom: 16, padding: 10, borderRadius: 6, background: 'var(--color-surface-2)' }}>
          {message}
        </p>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>Create GRN</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="text-sm text-muted">Supplier *</label>
                <select
                  className="input"
                  value={form.supplierID}
                  onChange={(e) => setForm({ ...form, supplierID: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.supplierID} value={s.supplierID}>
                      {s.companyName} — {s.supplierName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted">Received By *</label>
                <select
                  className="input"
                  value={form.empID}
                  onChange={(e) => setForm({ ...form, empID: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e.empID} value={e.empID}>{e.empName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="text-sm text-muted">Notes</label>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional delivery reference..."
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Products Received</span>
                <button type="button" className="btn btn-ghost btn-small" onClick={addLine}>+ Add line</button>
              </div>
              {form.items.map((line, index) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr auto',
                    gap: 8,
                    marginBottom: 8,
                    alignItems: 'end',
                  }}
                >
                  <div>
                    {index === 0 && <label className="text-sm text-muted">Product</label>}
                    <select
                      className="input"
                      value={line.prodID}
                      onChange={(e) => updateLine(index, 'prodID', e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.prodID} value={p.prodID}>{p.prodName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {index === 0 && <label className="text-sm text-muted">Quantity</label>}
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={line.qty}
                      onChange={(e) => updateLine(index, 'qty', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    {index === 0 && <label className="text-sm text-muted">Unit Cost</label>}
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={line.unitCost}
                      onChange={(e) => updateLine(index, 'unitCost', e.target.value)}
                      placeholder="Optional"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => removeLine(index)}
                    disabled={form.items.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create GRN'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="state-box"><p>Loading GRNs...</p></div>}
      {error && <div className="state-box"><p style={{ color: 'var(--color-danger)' }}>{error}</p></div>}

      {!loading && !error && (
        <div className="card">
          {grns.length === 0 ? (
            <p className="text-muted">No GRNs recorded yet.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>GRN ID</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Received By</th>
                    <th>Lines</th>
                    <th>Total Units</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.map((g) => (
                    <tr key={g.grnID}>
                      <td><strong>#{g.grnID}</strong></td>
                      <td>{formatDateTime(g.receivedDate)}</td>
                      <td>
                        <div>{g.companyName}</div>
                        <div className="text-muted text-sm">{g.supplierName}</div>
                      </td>
                      <td>{g.empName}</td>
                      <td>{g.lineCount ?? '—'}</td>
                      <td>{g.totalUnits ?? '—'}</td>
                      <td>
                        <button
                          className="btn btn-small btn-ghost"
                          onClick={() => handleExpand(g.grnID)}
                        >
                          {expandedGrnId === g.grnID ? '▼ Close' : '▶ View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {expandedGrnId && (
        <div className="card" style={{ marginTop: 20, borderLeft: '4px solid var(--color-primary)' }}>
          <h3 style={{ marginBottom: 12, fontWeight: 700 }}>GRN #{expandedGrnId} Details</h3>
          {loadingDetail && <p>Loading...</p>}
          {grnDetail && (
            <>
              <div style={{ marginBottom: 12, fontSize: '0.9rem' }}>
                <div><strong>Supplier:</strong> {grnDetail.companyName} ({grnDetail.supplierName})</div>
                <div><strong>Received by:</strong> {grnDetail.empName}</div>
                <div><strong>Date:</strong> {formatDateTime(grnDetail.receivedDate)}</div>
                {grnDetail.notes && <div><strong>Notes:</strong> {grnDetail.notes}</div>}
              </div>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {grnDetail.lines.map((line) => (
                    <tr key={line.grnDetailID}>
                      <td>{line.prodName}</td>
                      <td>{line.quantityReceived}</td>
                      <td>{formatCurrency(line.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
