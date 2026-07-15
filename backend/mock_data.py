# Simple in-memory mock data backend used for development when a real
# SQL Server is not available. Toggle by setting environment variable
# `USE_MOCK=1` before running the FastAPI app.

from contextlib import contextmanager
import copy
from datetime import datetime, timedelta

# Sample products
PRODUCTS = [
    {"prodID": 1, "prodName": "USB Cable", "prodImage": "", "stockQuantity": 25, "salePrice": 250.0, "prodDescription": "Durable USB cable", "costPrice": 120.0, "marginPercent": 108.33},
    {"prodID": 2, "prodName": "Wireless Mouse", "prodImage": "", "stockQuantity": 8, "salePrice": 1200.0, "prodDescription": "Ergonomic wireless mouse", "costPrice": 600.0, "marginPercent": 100.0},
    {"prodID": 3, "prodName": "HDMI Cable", "prodImage": "", "stockQuantity": 0, "salePrice": 450.0, "prodDescription": "High-speed HDMI", "costPrice": 200.0, "marginPercent": 125.0},
]

EMPLOYEES = [
    {"empID": 1, "empName": "Aisha", "empEmail": "aisha@techshop.pk", "empPhone": "03001234567", "salary": 50000.0, "hireDate": "2024-01-01T00:00:00", "isActive": 1},
    {"empID": 2, "empName": "Bilal", "empEmail": "bilal@techshop.pk", "empPhone": "03009876543", "salary": 45000.0, "hireDate": "2024-02-15T00:00:00", "isActive": 1},
    {"empID": 3, "empName": "Fatima", "empEmail": "fatima@techshop.pk", "empPhone": "03005551234", "salary": 48000.0, "hireDate": "2024-03-01T00:00:00", "isActive": 1},
]

SUPPLIERS = [
    {"supplierID": 1, "supplierName": "Ahmed Khan", "companyName": "Tech Distributors Ltd", "phone": "02135671234", "email": "sales@techdist.pk", "isActive": 1, "createdAt": "2024-01-10T00:00:00", "products": [{"prodID": 1, "prodName": "USB Cable"}, {"prodID": 3, "prodName": "HDMI Cable"}]},
    {"supplierID": 2, "supplierName": "Hassan Ali", "companyName": "Electronics Wholesale", "phone": "02138889999", "email": "info@elecwhole.pk", "isActive": 1, "createdAt": "2024-02-01T00:00:00", "products": [{"prodID": 2, "prodName": "Wireless Mouse"}]},
]

GRNS = [
    {"grnID": 1, "supplierID": 1, "empID": 1, "receivedDate": "2026-06-20T10:00:00", "notes": "Initial stock shipment", "companyName": "Tech Distributors Ltd", "supplierName": "Ahmed Khan", "empName": "Aisha", "lineCount": 2, "totalUnits": 30},
    {"grnID": 2, "supplierID": 2, "empID": 2, "receivedDate": "2026-07-05T14:30:00", "notes": "Restock order", "companyName": "Electronics Wholesale", "supplierName": "Hassan Ali", "empName": "Bilal", "lineCount": 1, "totalUnits": 10},
]

GRN_DETAILS = {
    1: [
        {"grnDetailID": 1, "grnID": 1, "prodID": 1, "quantityReceived": 20, "unitCost": 120.0, "prodName": "USB Cable"},
        {"grnDetailID": 2, "grnID": 1, "prodID": 3, "quantityReceived": 10, "unitCost": 200.0, "prodName": "HDMI Cable"},
    ],
    2: [
        {"grnDetailID": 3, "grnID": 2, "prodID": 2, "quantityReceived": 10, "unitCost": 600.0, "prodName": "Wireless Mouse"},
    ],
}

# Mock counters for create operations
MOCK_COUNTERS = {
    "prodID": 3,
    "supplierID": 2,
    "empID": 3,
    "grnID": 2,
    "invoiceID": 101,
}

# Helper function to get the next ID
def get_next_id(entity_type):
    MOCK_COUNTERS[entity_type] += 1
    return MOCK_COUNTERS[entity_type]

# Minimal sample data to make the frontend pages functional
# NOTE: We use references to the live lists (PRODUCTS, SUPPLIERS, etc.) so that
# create/update/delete operations modify them and subsequent reads reflect the changes
def get_mock_results():
    return {
        "usp_GetAllProducts": PRODUCTS,
        "usp_GetInventory": PRODUCTS,
        "usp_GetProductDetail": [{"prodID": 1, "prodName": "USB Cable", "stockQuantity": 25, "costPrice": 120.0, "salePrice": 250.0}],
        "usp_GetAllEmployees": EMPLOYEES,
        "usp_CreateSale": [{"invoiceID": 101, "totalAmount": 1234.56}],
        "usp_GetInvoice": [],
        "usp_GetSalesHistory": [
            {"invoiceID": 101, "invoiceDateTime": "2026-07-01T12:00:00", "totalAmount": 1234.56, "empName": "Aisha"}
        ],
        "usp_GetAllSuppliers": SUPPLIERS,
        "usp_CreateSupplier": [{"supplierID": 3}],
        "usp_UpdateSupplier": [{"supplierID": 1}],
        "usp_DeleteSupplier": [{"supplierID": 1}],
        "usp_GetAllSalesPersons": EMPLOYEES,
        "usp_CreateSalesPerson": [{"empID": 4, "empName": "New Person", "empEmail": None, "empPhone": None, "salary": None}],
        "usp_DeleteSalesPerson": [{"empID": 1}],
        "usp_GetAllGRNs": GRNS,
        "usp_GetGRNDetail": [{"grnID": 1, "supplierID": 1, "empID": 1, "receivedDate": "2026-06-20T10:00:00", "notes": "Initial stock", "companyName": "Tech Distributors Ltd", "supplierName": "Ahmed Khan", "empName": "Aisha"}],
    }

MOCK_PRODUCT_HISTORY = [
    {"adjustedAt": "2026-06-20T09:00:00", "empName": "Aisha", "adjustedQty": 20, "reason": "Initial stock"},
    {"adjustedAt": "2026-07-02T15:10:00", "empName": "Bilal", "adjustedQty": 5, "reason": "Restock"}
]

# A mapping from procedure name to lists of dict rows (generated dynamically)
MOCK_RESULTS = get_mock_results()

# Helper cursor-like object
class FakeCursor:
    def __init__(self):
        self._rows = []
        self.description = None
        self._multi = []
        self._next_idx = 0

    def execute(self, sql, params=()):
        # sql is like "{CALL proc_name (?,?,?)}" — extract the proc name if possible
        proc = None
        try:
            proc = sql.split('{CALL')[1].split('(')[0].strip()  # crude but works for our usage
        except Exception:
            proc = None
        if not proc:
            self._rows = []
            self.description = None
            return self

        # Handle CREATE operations
        if proc == 'usp_CreateProduct':
            # params: (prodName, prodDescription, prodImage, costPrice, salePrice, stockQuantity)
            prod_id = get_next_id("prodID")
            prod = {
                "prodID": prod_id,
                "prodName": params[0],
                "prodDescription": params[1],
                "prodImage": params[2],
                "costPrice": params[3],
                "salePrice": params[4],
                "stockQuantity": params[5],
                "marginPercent": ((params[4] - params[3]) / params[3] * 100) if params[3] > 0 else 0
            }
            PRODUCTS.append(prod)
            self._rows = [prod]
            self.description = [(k,) for k in prod.keys()]
            return self

        if proc == 'usp_CreateSupplier':
            # params: (supplierName, companyName, phone, email, productIDsJson)
            supplier_id = get_next_id("supplierID")
            supplier = {
                "supplierID": supplier_id,
                "supplierName": params[0],
                "companyName": params[1],
                "phone": params[2],
                "email": params[3],
                "isActive": 1,
                "createdAt": datetime.now().isoformat(),
                "products": []
            }
            SUPPLIERS.append(supplier)
            self._rows = [{"supplierID": supplier_id}]
            self.description = [("supplierID",)]
            return self

        if proc == 'usp_UpdateSupplier':
            # params: (supplier_id, supplierName, companyName, phone, email, productIDsJson)
            supplier_id = params[0]
            for s in SUPPLIERS:
                if s["supplierID"] == supplier_id:
                    s["supplierName"] = params[1]
                    s["companyName"] = params[2]
                    s["phone"] = params[3]
                    s["email"] = params[4]
            self._rows = [{"supplierID": supplier_id}]
            self.description = [("supplierID",)]
            return self

        if proc == 'usp_DeleteSupplier':
            # params: (supplier_id,)
            supplier_id = params[0]
            SUPPLIERS[:] = [s for s in SUPPLIERS if s["supplierID"] != supplier_id]
            self._rows = [{"supplierID": supplier_id, "message": "Deleted"}]
            self.description = [("supplierID",), ("message",)]
            return self

        if proc == 'usp_CreateSalesPerson':
            # params: (empName, empEmail, empPhone, salary)
            emp_id = get_next_id("empID")
            emp = {
                "empID": emp_id,
                "empName": params[0],
                "empEmail": params[1],
                "empPhone": params[2],
                "salary": params[3],
                "hireDate": datetime.now().isoformat(),
                "isActive": 1
            }
            EMPLOYEES.append(emp)
            self._rows = [emp]
            self.description = [(k,) for k in emp.keys()]
            return self

        if proc == 'usp_DeleteSalesPerson':
            # params: (emp_id,)
            emp_id = params[0]
            EMPLOYEES[:] = [e for e in EMPLOYEES if e["empID"] != emp_id]
            self._rows = [{"empID": emp_id, "message": "Deleted"}]
            self.description = [("empID",), ("message",)]
            return self

        if proc == 'usp_CreateGRN':
            # params: (supplierID, empID, notes, itemsJson)
            grn_id = get_next_id("grnID")
            grn = {
                "grnID": grn_id,
                "supplierID": params[0],
                "empID": params[1],
                "receivedDate": datetime.now().isoformat(),
                "notes": params[2],
            }
            # Find supplier and employee info
            for s in SUPPLIERS:
                if s["supplierID"] == params[0]:
                    grn["companyName"] = s["companyName"]
                    grn["supplierName"] = s["supplierName"]
            for e in EMPLOYEES:
                if e["empID"] == params[1]:
                    grn["empName"] = e["empName"]
            grn["lineCount"] = 1
            grn["totalUnits"] = 1
            GRNS.append(grn)
            self._rows = [{"grnID": grn_id}]
            self.description = [("grnID",)]
            return self

        # Special-case: if proc requests a product detail with an id, return header+history
        if proc == 'usp_GetProductDetail':
            mock_results = get_mock_results()
            self._multi = [mock_results.get('usp_GetProductDetail', []), MOCK_PRODUCT_HISTORY]
            self._next_idx = 0
            self._rows = self._multi[self._next_idx]
            self.description = [(k,) for k in (self._rows[0].keys())] if self._rows else None
            return self

        # Special-case: GRN detail returns header + lines
        if proc == 'usp_GetGRNDetail':
            grn_id = params[0] if params else 1
            mock_results = get_mock_results()
            grn_header = mock_results.get('usp_GetGRNDetail', [])
            grn_lines = GRN_DETAILS.get(grn_id, [])
            self._multi = [grn_header, grn_lines]
            self._next_idx = 0
            self._rows = self._multi[self._next_idx]
            self.description = [(k,) for k in (self._rows[0].keys())] if self._rows else None
            return self

        # Special-case: GetAllSuppliers returns header + product links
        if proc == 'usp_GetAllSuppliers':
            # First result set: current suppliers
            supplier_rows = SUPPLIERS
            # Second result set: product links (flatten supplier.products)
            product_links = []
            for s in SUPPLIERS:
                for p in s.get('products', []):
                    product_links.append({"supplierID": s["supplierID"], "prodID": p["prodID"], "prodName": p["prodName"]})
            self._multi = [supplier_rows, product_links]
            self._next_idx = 0
            self._rows = self._multi[self._next_idx]
            self.description = [(k,) for k in (self._rows[0].keys())] if self._rows else None
            return self

        # Special-case: GetInvoice returns header + lines
        if proc == 'usp_GetInvoice':
            # Mock invoice header + detail rows
            header = [{"invoiceID": 101, "totalAmount": 1234.56}]
            lines = [
                {"invoiceID": 101, "prodID": 1, "prodName": "USB Cable", "quantitySold": 2, "unitPrice": 250.0, "subTotal": 500.0},
                {"invoiceID": 101, "prodID": 2, "prodName": "Wireless Mouse", "quantitySold": 1, "unitPrice": 1200.0, "subTotal": 1200.0},
            ]
            self._multi = [header, lines]
            self._next_idx = 0
            self._rows = self._multi[self._next_idx]
            self.description = [(k,) for k in (self._rows[0].keys())] if self._rows else None
            return self

        # Normal single-result procedures
        mock_results = get_mock_results()
        rows = mock_results.get(proc, [])
        self._rows = rows
        self.description = [(k,) for k in (rows[0].keys())] if rows else None
        return self

    def fetchall(self):
        return [tuple(d.values()) for d in self._rows]

    def nextset(self):
        # Move to next result set if available
        self._next_idx += 1
        if self._next_idx < len(self._multi):
            self._rows = self._multi[self._next_idx]
            self.description = [(k,) for k in (self._rows[0].keys())] if self._rows else None
            return True
        return False


class FakeConnection:
    def cursor(self):
        return FakeCursor()


@contextmanager
def get_db():
    # yield a fake connection object compatible with the code in main.py
    conn = FakeConnection()
    try:
        yield conn
    finally:
        pass


# call_procedure mirrors the database.call_procedure signature
def call_procedure(cursor, proc_name, params=()):
    # store the last proc name so rows_to_dicts can use it
    # For compatibility with the main code, we accept either a cursor or cursor-like
    sql = f"{{CALL {proc_name} ({','.join(['?' for _ in params])})}}"
    return cursor.execute(sql, params)


# rows_to_dicts converts the fake cursor into a list of dicts
def rows_to_dicts(cursor):
    if cursor.description is None:
        return []
    cols = [col[0] for col in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]
