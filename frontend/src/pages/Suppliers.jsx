import { useState, useEffect } from 'react';
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  fetchInventory,
} from '../api.js';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    supplierName: '',
    companyName: '',
    phone: '',
    email: '',
    productIDs: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    try {
      const [supplierData, productData] = await Promise.all([
        fetchSuppliers(),
        fetchInventory(),
      ]);
      setSuppliers(supplierData);
      setProducts(productData);
    } catch {
      setError('Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm({ supplierName: '', companyName: '', phone: '', email: '', productIDs: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (supplier) => {
    setEditingId(supplier.supplierID);
    setForm({
      supplierName: supplier.supplierName,
      companyName: supplier.companyName,
      phone: supplier.phone || '',
      email: supplier.email || '',
      productIDs: (supplier.products || []).map((p) => p.prodID),
    });
    setShowForm(true);
    setMessage('');
  };

  const toggleProduct = (prodID) => {
    setForm((prev) => ({
      ...prev,
      productIDs: prev.productIDs.includes(prodID)
        ? prev.productIDs.filter((id) => id !== prodID)
        : [...prev.productIDs, prodID],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplierName.trim() || !form.companyName.trim()) {
      setMessage('Supplier name and company name are required.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const payload = {
        supplierName: form.supplierName.trim(),
        companyName: form.companyName.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        productIDs: form.productIDs,
      };

      if (editingId) {
        await updateSupplier(editingId, payload);
        setMessage('Supplier updated successfully.');
      } else {
        await createSupplier(payload);
        setMessage('Supplier added successfully.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      setMessage(err.friendlyMessage || 'Failed to save supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (supplierID) => {
    if (!window.confirm('Remove this supplier?')) return;
    try {
      await deleteSupplier(supplierID);
      setMessage('Supplier removed.');
      await loadData();
    } catch (err) {
      setMessage(err.friendlyMessage || 'Failed to remove supplier.');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage suppliers and the products they supply</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); setMessage(''); }}>
          + Add Supplier
        </button>
      </div>

      {message && (
        <p style={{ marginBottom: 16, padding: 10, borderRadius: 6, background: 'var(--color-surface-2)' }}>
          {message}
        </p>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>
            {editingId ? 'Edit Supplier' : 'New Supplier'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="text-sm text-muted">Contact Name *</label>
                <input
                  className="input"
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  placeholder="e.g. Ahmed Khan"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Company Name *</label>
                <input
                  className="input"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="e.g. Tech Distributors Ltd"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="text-sm text-muted" style={{ display: 'block', marginBottom: 8 }}>
                Products supplied
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 8,
                  maxHeight: 160,
                  overflowY: 'auto',
                  padding: 12,
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                }}
              >
                {products.map((p) => (
                  <label key={p.prodID} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.productIDs.includes(p.prodID)}
                      onChange={() => toggleProduct(p.prodID)}
                    />
                    <span className="text-sm">{p.prodName}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Update Supplier' : 'Add Supplier'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="state-box"><p>Loading suppliers...</p></div>}
      {error && <div className="state-box"><p style={{ color: 'var(--color-danger)' }}>{error}</p></div>}

      {!loading && !error && (
        <div className="card">
          {suppliers.length === 0 ? (
            <p className="text-muted">No suppliers yet. Add your first supplier above.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Contact Name</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Products Supplied</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.supplierID}>
                      <td>#{s.supplierID}</td>
                      <td><strong>{s.supplierName}</strong></td>
                      <td>{s.companyName}</td>
                      <td>{s.phone || '—'}</td>
                      <td>
                        {(s.products || []).length === 0 ? (
                          <span className="text-muted">None linked</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {s.products.map((p) => (
                              <span key={p.prodID} className="badge badge-success">{p.prodName}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-small btn-ghost" onClick={() => openEdit(s)}>Edit</button>
                          <button className="btn btn-small btn-danger" onClick={() => handleDelete(s.supplierID)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
