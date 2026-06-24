// ============================================================
//  App.jsx — Application Root & Router
// ============================================================
// LEARNING NOTE — What is React Router?
// React is a Single Page Application (SPA) framework.
// In a traditional website, clicking "About" loads about.html.
// In React, there's only ONE HTML page (index.html). React Router
// intercepts URL changes and swaps which Component is shown
// WITHOUT reloading the page. This is much faster for the user.
//
// Key components from react-router-dom:
//   <BrowserRouter> — sets up routing using the browser's URL bar
//   <Routes>        — a container that looks at the current URL
//   <Route>         — maps a URL path to a component
//   <Navigate>      — redirects to another URL
//   <NavLink>       — like <a> but knows if its route is "active"
//
// Install React Router: npm install react-router-dom
// ============================================================

import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard    from './pages/Dashboard.jsx';
import Transaction  from './pages/Transaction.jsx';
import Inventory    from './pages/Inventory.jsx';
import Products     from './pages/Products.jsx';
import SalesHistory from './pages/SalesHistory.jsx';

// ============================================================
// SIDEBAR COMPONENT
// ============================================================
// Defined here because it's tightly coupled to the app shell.
// For larger apps, move this to components/Sidebar.jsx.
//
// LEARNING NOTE — NavLink vs Link:
// NavLink adds an "active" CSS class automatically when you're
// on its route. We use this to highlight the current page in
// the sidebar. Regular <Link> doesn't do this.
// ============================================================
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        Tech<span>Shop</span> POS
      </div>
      <nav className="sidebar-nav">
        {/* NavLink's className can be a function that receives {isActive} */}
        <NavLink to="/"            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end>
          Dashboard
        </NavLink>
        <NavLink to="/transaction" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          New Sale
        </NavLink>
        <NavLink to="/sales"       className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          Sales History
        </NavLink>
        <NavLink to="/inventory"   className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          Inventory
        </NavLink>
        <NavLink to="/products"    className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          Products
        </NavLink>
      </nav>
    </aside>
  );
}


// ============================================================
// APP COMPONENT — Main export
// ============================================================
// LEARNING NOTE — Component structure:
// App renders the outer shell (sidebar + main area).
// <Routes> renders the correct page inside main-content.
//
// "end" on the Dashboard NavLink means: only mark as active
// when the path is EXACTLY "/", not any path starting with "/".
// Without "end", the Dashboard would always appear active.
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/transaction" element={<Transaction />} />
            <Route path="/sales"       element={<SalesHistory />} />
            <Route path="/inventory"   element={<Inventory />} />
            <Route path="/products"    element={<Products />} />
            {/* Catch-all: unknown URLs redirect to home */}
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}