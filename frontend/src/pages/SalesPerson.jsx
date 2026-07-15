import { useState, useEffect } from 'react';
import { fetchSalesPersons, createSalesPerson, deleteSalesPerson } from '../api.js';

export default function SalesPersonPage() {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ empName: '', empEmail: '', empPhone: '', salary: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    try {
      const data = await fetchSalesPersons();
      setPersons(data);
    } catch {
      setError('Failed to load sales persons.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.empName.trim()) {
      setMessage('Name is required.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      await createSalesPerson({
        empName: form.empName.trim(),
        empEmail: form.empEmail.trim() || null,
        empPhone: form.empPhone.trim() || null,
        salary: form.salary ? parseFloat(form.salary) : null,
      });
      setForm({ empName: '', empEmail: '', empPhone: '', salary: '' });
      setShowForm(false);
      setMessage('Sales person added successfully.');
      await loadData();
    } catch (err) {
      setMessage(err.friendlyMessage || 'Failed to add sales person.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (empID, empName) => {
    if (!window.confirm(`Remove ${empName} from sales staff?`)) return;
    try {
      await deleteSalesPerson(empID);
      setMessage(`${empName} removed.`);
      await loadData();
    } catch (err) {
      setMessage(err.friendlyMessage || 'Failed to remove sales person.');
    }
  };

  const totalPayroll = persons.reduce((sum, p) => sum + (parseFloat(p.salary) || 0), 0);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Sales Persons</h1>
          <p className="page-subtitle">Manage sales staff and their salaries</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setMessage(''); }}>
          + Add Sales Person
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Active Staff</div>
          <div className="stat-value">{persons.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Monthly Salary</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalPayroll)}</div>
        </div>
      </div>

      {message && (
        <p style={{ marginBottom: 16, padding: 10, borderRadius: 6, background: 'var(--color-surface-2)' }}>
          {message}
        </p>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>New Sales Person</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="text-sm text-muted">Full Name *</label>
                <input
                  className="input"
                  value={form.empName}
                  onChange={(e) => setForm({ ...form, empName: e.target.value })}
                  placeholder="e.g. Fatima Ali"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Monthly Salary (Rs.)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="e.g. 45000"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.empEmail}
                  onChange={(e) => setForm({ ...form, empEmail: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="text-sm text-muted">Phone</label>
                <input
                  className="input"
                  value={form.empPhone}
                  onChange={(e) => setForm({ ...form, empPhone: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Sales Person'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="state-box"><p>Loading...</p></div>}
      {error && <div className="state-box"><p style={{ color: 'var(--color-danger)' }}>{error}</p></div>}

      {!loading && !error && (
        <div className="card">
          {persons.length === 0 ? (
            <p className="text-muted">No sales persons yet.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Salary</th>
                    <th>Hire Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p) => (
                    <tr key={p.empID}>
                      <td>#{p.empID}</td>
                      <td><strong>{p.empName}</strong></td>
                      <td>{p.empEmail || '—'}</td>
                      <td>{p.empPhone || '—'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                        {formatCurrency(p.salary)}
                      </td>
                      <td>
                        {p.hireDate
                          ? new Date(p.hireDate).toLocaleDateString('en-PK')
                          : '—'}
                      </td>
                      <td>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(p.empID, p.empName)}
                        >
                          Remove
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
    </div>
  );
}
