# TechShop POS - Quick Start Guide

## Prerequisites

- **Python 3.9+** (download from [python.org](https://www.python.org/downloads/))
- **Node.js 18+** (download from [nodejs.org](https://nodejs.org))
- A modern web browser (Chrome, Firefox, Edge)

## Setup (First Time Only)

### 1. Backend Setup

```powershell
cd backend

# Create virtual environment
py -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup

```powershell
cd frontend

# Install npm dependencies
npm install
```

---

## Running the Application

You need **two terminal windows/tabs** open at the same time:

### Terminal 1: Start Backend

```powershell
cd backend

# Activate virtual environment (if not already active)
venv\Scripts\activate

# Start the API server with mock data
# Option A: Windows Batch Script
run.bat

# Option B: PowerShell Script
.\run.ps1

# Option C: Manual command
$env:USE_MOCK = "1"
py -m uvicorn main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

Visit **http://localhost:8000/docs** to see the interactive API documentation.

### Terminal 2: Start Frontend

```powershell
cd frontend

# Start the development server
npm run dev
```

**Expected output:**
```
  ➜  Local:   http://localhost:5173/
```

---

## Access the Application

Open your browser and go to: **http://localhost:5173**

---

## What's Included (Mock Data)

The system runs with **in-memory mock data** for development. You can:

✅ View all pages and data
✅ Create new products, suppliers, and sales persons
✅ Process sales and returns
✅ View inventory and adjust stock
✅ Record GRNs (Goods Receipt Notes)
✅ All data persists during the session

**Data resets when you restart the backend.**

---

## Troubleshooting

### "Python was not found"
- Ensure Python is installed and in your PATH
- Try `py --version` instead of `python --version`
- Restart your terminal after installing Python

### "Cannot find module 'fastapi'"
- Make sure you activated the virtual environment first: `venv\Scripts\activate`
- Then install: `pip install -r requirements.txt`

### "Port 8000 already in use"
- Another process is using port 8000
- Kill it or use a different port: `python -m uvicorn main:app --reload --port 8001`
- Then update frontend `.env.local` to use port 8001

### "Module not found: axios"
- Run `npm install` in the frontend directory

### "Network error" on frontend
- Verify backend is running on http://localhost:8000
- Check browser console (F12) for detailed error messages
- Ensure both servers are running in separate terminals

### "Returns page still showing on sidebar" or cached content
- **Hard refresh your browser:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache in DevTools: F12 → Application → Clear Storage → Clear All
- Restart frontend dev server: Stop with `Ctrl+C`, then run `npm run dev` again

---

## Pages & Features

| Page | URL | Features |
|------|-----|----------|
| Dashboard | `/` | Overview and stats |
| New Sale | `/transaction` | Create invoices and sell products |
| Sales History | `/sales` | View invoices, expand details, return items |
| Returns | `/sales/return` | Process returns (accessed from Sales History) |
| Inventory | `/inventory` | View stock, adjust quantities, see history |
| Products | `/products` | View all products, create new ones |
| Suppliers | `/suppliers` | Manage suppliers and their products |
| Sales Persons | `/sales-persons` | Manage employees and salaries |
| GRN | `/grn` | Record goods receipt notes from suppliers |

---

## When You Have a SQL Server Database

Replace the mock backend with your real database:

1. **Remove the `USE_MOCK=1` environment variable**
2. **Ensure your SQL Server is running**
3. **Update `backend/database.py`** with your server details:
   ```python
   CONNECTION_STRING = (
       "DRIVER={ODBC Driver 17 for SQL Server};"
       "SERVER=YOUR_SERVER_NAME;"
       "DATABASE=TechShopPOS;"
       "Trusted_Connection=yes;"
   )
   ```
4. **Run the SQL files** from `backend/sql/` on your database:
   - `001_schema_extensions.sql` (creates tables)
   - All `usp_*.sql` files (creates stored procedures)

Then start the backend normally (without `USE_MOCK=1`).

---

## Development Notes

- **Frontend hot reload:** Changes to React files automatically refresh the page
- **Backend auto-reload:** Changes to Python files restart the server (when `--reload` is used)
- **Mock data:** Defined in `backend/mock_data.py` — modify to test different scenarios
- **API Documentation:** Visit `http://localhost:8000/docs` for Swagger UI

---

## Need Help?

Check the browser console (F12) for error details, or look at the backend terminal output for API errors.
