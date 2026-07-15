// ============================================================
//  api.js — API Communication Layer (Axios)
// ============================================================
// LEARNING NOTE:
// Axios is an HTTP client library — it lets JavaScript send
// HTTP requests to your FastAPI backend and receive responses.
//
// Why Axios instead of the built-in fetch()?
//  - Automatically parses JSON (fetch() needs .json() call)
//  - Easier error handling (throws on 4xx/5xx, fetch() doesn't)
//  - Cleaner syntax for request config (headers, base URL, etc.)
//  - Interceptors: run code before every request or after every response
//
// This file has TWO sections:
//  1. Axios INSTANCE — configured with your base URL
//  2. API FUNCTIONS — one function per backend endpoint
//
// Your React components import these functions, not Axios directly.
// This is the "separation of concerns" principle: components handle
// UI, api.js handles data fetching.
// ============================================================

import axios from 'axios';

// ============================================================
// AXIOS INSTANCE
// ============================================================
// baseURL: every request will be prefixed with this URL.
// So api.get('/products') actually calls http://localhost:8000/products
//
// import.meta.env.VITE_API_URL reads from your .env file.
// If not set, defaults to http://localhost:8000
// ============================================================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 seconds — fail if server takes too long
});

// ============================================================
// INTERCEPTORS
// ============================================================
// LEARNING NOTE:
// Interceptors are "middleware" for HTTP requests.
//
// Request interceptor: runs BEFORE every request is sent.
// Useful for: adding auth tokens, logging.
//
// Response interceptor: runs AFTER every response is received.
// Useful for: standardizing errors, refreshing tokens.
// ============================================================

api.interceptors.request.use(
  (config) => {
    // For now, just log the request in development
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,   // success: pass through unchanged
  (error) => {
    // Extract the most useful error message
    const message =
      error.response?.data?.detail ||  // FastAPI error detail
      error.message ||                 // Axios error message
      'An unexpected error occurred';
    // Attach a clean message to the error object
    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);


// ============================================================
// API FUNCTIONS
// ============================================================
// LEARNING NOTE:
// Each function is "async" — it returns a Promise.
// Components call these with "await" inside a try/catch.
//
// Why return response.data?
// Axios wraps the server's JSON in: { data: {...}, status: 200, headers: {...} }
// We only care about the actual data, so we extract .data.
// ============================================================


// ------ PRODUCTS ------

/**
 * Fetch all in-stock products (for POS/transaction screen).
 * Calls: GET /products
 * Returns: [{prodID, prodName, prodImage, stockQuantity, salePrice}, ...]
 */
export async function fetchProducts() {
  const response = await api.get('/products');
  return response.data;
}


// ------ EMPLOYEES ------

/**
 * Fetch all employees/cashiers.
 * Calls: GET /employees
 * Returns: [{empID, empName}, ...]
 */
export async function fetchEmployees() {
  const response = await api.get('/employees');
  return response.data;
}


// ------ SALES ------

/**
 * Create a complete sale transaction.
 * Calls: POST /sales
 *
 * @param {number} empID - The employee making the sale
 * @param {Array}  cart  - [{prodID, qty, unitPrice}, ...]
 * @returns {{invoiceID: number, totalAmount: number}}
 */
export async function createSale(empID, cart) {
  const response = await api.post('/sales', { empID, cart });
  return response.data;
}


// ------ INVOICES ------

/**
 * Get a complete invoice (header + line items).
 * Calls: GET /invoices/{invoiceID}
 *
 * @param {number} invoiceID
 * @returns {{header: {...}, lines: [{...}, ...]}}
 */
export async function fetchInvoice(invoiceID) {
  const response = await api.get(`/invoices/${invoiceID}`);
  return response.data;
}


// ------ INVENTORY ------

/**
 * Fetch all products with cost, sale price, and margin.
 * Calls: GET /inventory
 * Returns: [{prodID, prodName, stockQuantity, costPrice, salePrice, marginPercent}, ...]
 */
export async function fetchInventory() {
  const response = await api.get('/inventory');
  return response.data;
}

/**
 * Get full details for one product (+ adjustment history).
 * Calls: GET /inventory/{prodID}
 *
 * @param {number} prodID
 * @returns {{ prodID, prodName, ..., history: [{adjustedQty, reason, ...}] }}
 */
export async function fetchProductDetail(prodID) {
  const response = await api.get(`/inventory/${prodID}`);
  return response.data;
}

/**
 * Manually adjust stock for a product.
 * Calls: POST /inventory/adjust
 *
 * @param {number} prodID
 * @param {number} empID
 * @param {number} adjustedQty - positive = add, negative = remove
 * @param {string} reason
 * @returns {{ prodID, newStockQuantity }}
 */
export async function adjustInventory(prodID, empID, adjustedQty, reason) {
  const response = await api.post('/inventory/adjust', {
    prodID,
    empID,
    adjustedQty,
    reason,
  });
  return response.data;
}


// ------ SALES HISTORY ------

/**
 * Fetch all invoices/sales ever recorded.
 * Calls: GET /sales
 * Returns: [{invoiceID, invoiceDateTime, totalAmount, empName}, ...]
 */
export async function getSalesHistory() {
  const response = await api.get('/sales');
  return response.data;
}

/**
 * Get all line items (products) for a single invoice.
 * Calls: GET /sales/{invoiceID}
 *
 * @param {number} invoiceID
 * @returns {{ header: {...}, lines: [{prodName, quantitySold, unitPrice, subTotal}, ...] }}
 */
export async function getInvoiceDetails(invoiceID) {
  const response = await api.get(`/sales/${invoiceID}`);
  return response.data;
}

/**
 * Process a return/exchange: add items back to inventory.
 * Calls: POST /sales/{invoiceID}/return
 *
 * @param {number} invoiceID
 * @param {string} reason - Reason for return (optional)
 * @param {Array|null} items - [{prodID, qty}, ...] for partial return; null/omit for full invoice return
 * @returns {{ invoiceID, message, itemsReturned, unitsReturned }}
 */
export async function returnSale(invoiceID, reason, items = null) {
  const body = { reason: reason || null };
  if (items && items.length > 0) {
    body.items = items;
  }
  const response = await api.post(`/sales/${invoiceID}/return`, body);
  return response.data;
}


// ------ PRODUCTS (CREATE) ------

/**
 * Create a new product.
 * Calls: POST /products
 */
export async function createProduct(product) {
  const response = await api.post('/products', product);
  return response.data;
}


// ------ SUPPLIERS ------

export async function fetchSuppliers() {
  const response = await api.get('/suppliers');
  return response.data;
}

export async function createSupplier(supplier) {
  const response = await api.post('/suppliers', supplier);
  return response.data;
}

export async function updateSupplier(supplierID, supplier) {
  const response = await api.put(`/suppliers/${supplierID}`, supplier);
  return response.data;
}

export async function deleteSupplier(supplierID) {
  const response = await api.delete(`/suppliers/${supplierID}`);
  return response.data;
}


// ------ SALES PERSONS ------

export async function fetchSalesPersons() {
  const response = await api.get('/sales-persons');
  return response.data;
}

export async function createSalesPerson(person) {
  const response = await api.post('/sales-persons', person);
  return response.data;
}

export async function deleteSalesPerson(empID) {
  const response = await api.delete(`/sales-persons/${empID}`);
  return response.data;
}


// ------ GRN (Goods Receipt Notes) ------

export async function fetchGRNs() {
  const response = await api.get('/grn');
  return response.data;
}

export async function fetchGRNDetail(grnID) {
  const response = await api.get(`/grn/${grnID}`);
  return response.data;
}

export async function createGRN(grn) {
  const response = await api.post('/grn', grn);
  return response.data;
}