// ============================================================
//  main.jsx — React Entry Point
// ============================================================
// LEARNING NOTE:
// This is the first JavaScript file that runs.
// Its only job: find the #root div in index.html and mount React.
//
// createRoot() tells React: "manage this DOM node".
// .render() puts our App component inside it.
// <React.StrictMode> is a development tool — it intentionally
// renders components twice to help you catch bugs. It has NO
// effect in production builds.
// ============================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)