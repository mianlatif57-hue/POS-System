// ============================================================
//  pages/Dashboard.jsx — Home / Overview Page
// ============================================================
// LEARNING NOTE:
// This is the first page users see. It shows summary stats
// pulled from the inventory: total products, low stock alerts,
// and total inventory value.
//
// This page demonstrates a complete data-fetching pattern using
// useState + useEffect — the foundation of React data loading.
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchInventory } from '../api.js';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchInventory();
        setProducts(data);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // Empty array = run once when the component first appears

  // ============================================================
  // DERIVED STATE
  // ============================================================
  // LEARNING NOTE:
  // Don't store things in state that you can calculate from state.
  // These values are computed every render — that's fine because
  // renders are fast. Storing them in state would mean manually
  // keeping them in sync, which causes bugs.
  // ============================================================
  const totalProducts    = products.length;
  const lowStockItems    = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 5);
  const outOfStockItems  = products.filter(p => p.stockQuantity === 0);
  const totalValue       = products.reduce(
    (sum, p) => sum + (parseFloat(p.salePrice) * p.stockQuantity), 0
  );

  const formatCurrency = (val) =>
    `Rs. ${val.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

  if (loading) return <div className="state-box"><p>Loading dashboard...</p></div>;
  if (error)   return <div className="state-box"><p style={{ color: 'var(--color-danger)' }}>{error}</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your shop's current status</p>
      </div>

      {/* Quick Action: View Sales History */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate('/sales')}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => (e.target.style.transform = 'translateY(-2px)')}
          onMouseOut={(e) => (e.target.style.transform = 'translateY(0)')}
        >
          View Sales History
        </button>
      </div>

      

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{totalProducts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inventory Value (Sale Price)</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>
            {formatCurrency(totalValue)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock (≤ 5 units)</div>
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
            {lowStockItems.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Out of Stock</div>
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
            {outOfStockItems.length}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 12, fontSize: '1rem', fontWeight: 700 }}>
            Low Stock Alerts
          </h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Remaining Stock</th>
                  <th>Sale Price</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map(p => (
                  <tr key={p.prodID}>
                    <td>{p.prodName}</td>
                    <td>
                      <span className="badge badge-warning">{p.stockQuantity} left</span>
                    </td>
                    <td>Rs. {parseFloat(p.salePrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Out of Stock */}
      {outOfStockItems.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 12, fontSize: '1rem', fontWeight: 700 }}>
             Out of Stock
          </h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Product</th><th>Status</th></tr>
              </thead>
              <tbody>
                {outOfStockItems.map(p => (
                  <tr key={p.prodID}>
                    <td>{p.prodName}</td>
                    <td><span className="badge badge-danger">Out of Stock</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
        <div className="card state-box">
          <p style={{ color: 'var(--color-success)' }}> All products are well-stocked!</p>
        </div>
      )}
    </div>
  );
}