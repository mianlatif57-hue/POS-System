# ============================================================
#  main.py — FastAPI Application (Backend Entry Point)
# ============================================================
# LEARNING NOTE:
# FastAPI is a modern Python web framework. It:
#  - Receives HTTP requests from your React frontend
#  - Validates request data using Pydantic schemas
#  - Calls stored procedures in SQL Server
#  - Returns JSON responses
#
# Think of it as the "waiter" between the frontend (customer)
# and the database (kitchen). It takes orders, validates them,
# passes them to the kitchen, and brings back the result.
#
# To run this file:
#   uvicorn main:app --reload --port 8000
#
# "main" = the filename (main.py)
# "app"  = the FastAPI() instance below
# "--reload" = restart automatically when you save changes (dev only)
#
# Your API docs are auto-generated at: http://localhost:8000/docs
# ============================================================

import json
import os
from decimal import Decimal
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

# Use a mock backend when developing without a configured SQL Server.
USE_MOCK = os.getenv("USE_MOCK", "0") == "1"
if USE_MOCK:
    from mock_data import get_db, call_procedure, rows_to_dicts
else:
    from database import get_db, call_procedure, rows_to_dicts
from schema import (
    CreateSaleSchema, InventoryAdjustSchema, ReturnSaleSchema,
    ProductListItemSchema, InventoryProductSchema, EmployeeSchema,
    InvoiceHeaderSchema, InvoiceFullSchema, SaleCreatedSchema, ProductDetailSchema, ReturnSaleResultSchema,
    CreateProductSchema, CreateProductResultSchema,
    SupplierSchema, CreateSupplierSchema, UpdateSupplierSchema,
    SalesPersonSchema, CreateSalesPersonSchema,
    CreateGRNSchema, GRNListItemSchema, GRNDetailSchema,
)

# ============================================================
# APP INSTANCE
# ============================================================
# FastAPI() creates your application object. All routes are
# registered on this object using decorators like @app.get()
# ============================================================
app = FastAPI(
    title="Tech Shop POS API",
    description="Point of Sale backend for TechShopPOS",
    version="1.0.0"
)

# ============================================================
# CORS MIDDLEWARE
# ============================================================
# LEARNING NOTE — What is CORS?
# CORS = Cross-Origin Resource Sharing.
# Browsers have a security rule: JavaScript from one domain
# cannot talk to an API on a different domain UNLESS the API
# explicitly allows it.
#
# Your React app runs at: http://localhost:5173  (Vite dev server)
# Your FastAPI runs at:   http://localhost:8000
#
# These are different "origins" (different ports = different origin).
# Without this middleware, the browser would BLOCK all requests
# from React to FastAPI with a CORS error.
#
# allow_origins=["http://localhost:5173"] means:
# "I allow requests from this specific origin."
#
# In production, change this to your actual frontend domain.
# NEVER use allow_origins=["*"] in production — that allows
# ANY website to call your API, which is a security risk.
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],      # allow GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],      # allow any HTTP headers
)


# ============================================================
# HELPER: Convert Decimal to float for JSON
# ============================================================
# LEARNING NOTE:
# Python's Decimal type and JavaScript's JSON don't mix well.
# We convert all Decimal values to float before sending.
# ============================================================
def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


# ============================================================
# ROUTE 1: GET /products
# ============================================================
# LEARNING NOTE — HTTP Methods:
#   GET    = read/fetch data (no body)
#   POST   = create new data (has a body)
#   PUT    = update existing data (has a body)
#   DELETE = delete data
#
# @app.get("/products") means:
# "When the frontend sends a GET request to /products, run this function."
#
# response_model tells FastAPI to validate the output against
# our Pydantic schema and show it in the /docs page.
# ============================================================

@app.get("/products", response_model=list[ProductListItemSchema])
def get_all_products():
    """
    Returns all in-stock products for the POS/transaction screen.
    Calls stored procedure: usp_GetAllProducts
    """
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetAllProducts")
        products = rows_to_dicts(cursor)
    return products


@app.post("/products", response_model=CreateProductResultSchema, status_code=201)
def create_product(data: CreateProductSchema):
    """Create a new product with name, description, image, and pricing."""
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(
            cursor,
            "usp_CreateProduct",
            (
                data.prodName,
                data.prodDescription,
                data.prodImage,
                float(data.costPrice),
                float(data.salePrice),
                data.stockQuantity,
            ),
        )
        result = rows_to_dicts(cursor)

    if not result:
        raise HTTPException(status_code=500, detail="Product creation failed")

    return result[0]


# ============================================================
# ROUTE 1B: GET /employees
# ============================================================
# LEARNING NOTE:
# This endpoint returns all employees/cashiers in the system.
# Used by the Transaction page to let users select who is making the sale.
# Calls stored procedure: usp_GetAllEmployees
# ============================================================

@app.get("/employees", response_model=list[EmployeeSchema])
def get_all_employees():
    """
    Returns all employees/cashiers available for making sales.
    Returns: [{empID, empName}, ...]
    """
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetAllEmployees")
        employees = rows_to_dicts(cursor)
    return employees


# ============================================================
# ROUTE 2: POST /sales
# ============================================================
# This is the most important route — it creates a complete sale.
#
# LEARNING NOTE — Request Body:
# When the frontend POSTs to /sales, it sends JSON like:
# {
#   "empID": 1,
#   "cart": [
#     {"prodID": 1, "qty": 2, "unitPrice": 62000},
#     {"prodID": 3, "qty": 1, "unitPrice": 11000}
#   ]
# }
# FastAPI reads the body and validates it against CreateSaleSchema.
# If empID is missing or cart is empty, it returns a 422 error
# automatically — before our code even runs.
# ============================================================

@app.post("/sales", response_model=SaleCreatedSchema, status_code=201)
def create_sale(sale: CreateSaleSchema):
    """
    Creates a complete sale transaction.
    Calls stored procedure: usp_CreateSale

    The cart is serialized to JSON and passed to the SP.
    SQL Server's OPENJSON() parses it back into rows.
    """
    # Convert cart items to JSON string for the stored procedure
    # LEARNING NOTE on custom=decimal_to_float:
    # json.dumps needs to know how to serialize Decimal objects.
    cart_data = [
        {
            "prodID":    item.prodID,
            "qty":       item.qty,
            "unitPrice": float(item.unitPrice)
        }
        for item in sale.cart
    ]
    cart_json = json.dumps(cart_data)

    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_CreateSale", (sale.empID, cart_json))
        result = rows_to_dicts(cursor)

    if not result:
        raise HTTPException(status_code=500, detail="Sale creation failed")

    return result[0]   # {"invoiceID": 7, "totalAmount": 135000.00}


# ============================================================
# ROUTE 3: GET /invoices/{invoice_id}
# ============================================================
# LEARNING NOTE — Path Parameters:
# The {invoice_id} in the URL is a path parameter.
# If you request GET /invoices/5, then invoice_id = 5.
# FastAPI automatically extracts it and passes it to the function.
#
# This route returns TWO result sets from the stored procedure
# (header + line items). We use cursor.nextset() to move between
# result sets — this is specific to pyodbc's multi-result handling.
# ============================================================

@app.get("/invoices/{invoice_id}", response_model=InvoiceFullSchema)
def get_invoice(invoice_id: int):
    """
    Returns a complete invoice with header and line items.
    Calls stored procedure: usp_GetInvoice

    Used for printing invoices after a sale, or looking up past sales.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetInvoice", (invoice_id,))

        # First result set: invoice header
        headers = rows_to_dicts(cursor)
        if not headers:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")

        # Move to second result set: line items
        # cursor.nextset() returns True if another result set exists
        cursor.nextset()
        lines = rows_to_dicts(cursor)

    return {
        "header": headers[0],
        "lines":  lines
    }


# ============================================================
# ROUTE 4: GET /inventory
# ============================================================

@app.get("/inventory", response_model=list[InventoryProductSchema])
def get_inventory():
    """
    Returns all products with cost, sale price, and margin %.
    Calls stored procedure: usp_GetInventory

    Used by the Inventory page to show the complete product list.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetInventory")
        products = rows_to_dicts(cursor)
    return products


# ============================================================
# ROUTE 5: GET /inventory/{prod_id}
# ============================================================

@app.get("/inventory/{prod_id}", response_model=ProductDetailSchema)
def get_product_detail(prod_id: int):
    """
    Returns full detail for one product + its adjustment history.
    Calls stored procedure: usp_GetProductDetail

    Triggered when user clicks a product in the Inventory page.
    Returns TWO result sets (product info + history log).
    """
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetProductDetail", (prod_id,))

        # First result set: product info
        products = rows_to_dicts(cursor)
        if not products:
            raise HTTPException(status_code=404, detail=f"Product {prod_id} not found")

        # Second result set: inventory history
        cursor.nextset()
        history = rows_to_dicts(cursor)

    product = products[0]
    product["history"] = history
    return product


# ============================================================
# ROUTE 6: POST /inventory/adjust
# ============================================================

@app.post("/inventory/adjust", status_code=200)
def adjust_inventory(data: InventoryAdjustSchema):
    """
    Manually adjusts stock (positive = add, negative = remove).
    Calls stored procedure: usp_AdjustInventory

    Used by staff to record restocking or manual corrections.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(
            cursor,
            "usp_AdjustInventory",
            (data.prodID, data.empID, data.adjustedQty, data.reason)
        )
        result = rows_to_dicts(cursor)

    if not result:
        raise HTTPException(status_code=500, detail="Adjustment failed")

    return {
        "prodID": data.prodID,
        "newStockQuantity": result[0]["stockQuantity"]
    }


# ============================================================
# ROUTE 7: GET /sales
# ============================================================
# LEARNING NOTE:
# This endpoint returns a list of all invoices/sales ever recorded.
# Each invoice shows header info (ID, date, total, employee).
# Calls stored procedure: usp_GetSalesHistory
# ============================================================

@app.get("/sales", response_model=list[InvoiceHeaderSchema])
def get_all_sales():
    """
    Returns all invoices/sales ever recorded.
    Returns: [{invoiceID, invoiceDateTime, totalAmount, empName}, ...]
    """
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetSalesHistory")
        invoices = rows_to_dicts(cursor)
    return invoices


# ============================================================
# ROUTE 8: GET /sales/{invoice_id}
# ============================================================
# LEARNING NOTE:
# Returns all line items (products) for a single invoice.
# This is the detail view when user clicks an invoice to expand it.
# Calls stored procedure: usp_GetInvoice (same as /invoices/{id})
# Returns the complete invoice (header + lines in two result sets).
# ============================================================

@app.get("/sales/{invoice_id}", response_model=InvoiceFullSchema)
def get_sales_detail(invoice_id: int):
    """
    Returns complete invoice details (header + line items).
    Used for expanding an invoice row to see all products.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetInvoice", (invoice_id,))

        # First result set: invoice header
        headers = rows_to_dicts(cursor)
        if not headers:
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")

        # Move to second result set: line items
        cursor.nextset()
        lines = rows_to_dicts(cursor)

    return {
        "header": headers[0],
        "lines":  lines
    }


# ============================================================
# ROUTE 8B: POST /sales/{invoice_id}/return
# ============================================================
# LEARNING NOTE:
# This endpoint handles returns/exchanges of items.
# When a customer returns a product:
#  1. All items from the original invoice are returned to inventory
#  2. The invoice is marked as "returned"
#  3. A reason is recorded (damage, customer request, etc.)
# Calls stored procedure: usp_ReturnSale
# ============================================================

@app.post("/sales/{invoice_id}/return", response_model=ReturnSaleResultSchema, status_code=200)
def return_sale(invoice_id: int, data: ReturnSaleSchema):
    """
    Process a return/exchange: add items back to inventory.
    Pass `items` for a partial return, or omit `items` to return the whole invoice.
    Calls stored procedure: usp_ReturnSale
    """
    items_json = None
    if data.items:
        items_json = json.dumps([{"prodID": item.prodID, "qty": item.qty} for item in data.items])

    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(
            cursor,
            "usp_ReturnSale",
            (invoice_id, data.reason, items_json),
        )
        result = rows_to_dicts(cursor)

    if not result:
        raise HTTPException(status_code=500, detail="Return processing failed")

    row = result[0]
    units = row.get("unitsReturned", row.get("itemsReturned", 0))
    if data.items:
        message = f"Returned {units} unit(s) from invoice {invoice_id}"
    else:
        message = f"Invoice {invoice_id} fully returned"

    return {
        "invoiceID": invoice_id,
        "message": message,
        "itemsReturned": row.get("itemsReturned", 0),
        "unitsReturned": units,
    }


# ============================================================
# SUPPLIERS
# ============================================================

@app.get("/suppliers", response_model=list[SupplierSchema])
def get_suppliers():
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetAllSuppliers")
        suppliers = rows_to_dicts(cursor)
        cursor.nextset()
        product_links = rows_to_dicts(cursor)

    by_supplier = {}
    for link in product_links:
        sid = link["supplierID"]
        by_supplier.setdefault(sid, []).append({
            "prodID": link["prodID"],
            "prodName": link["prodName"],
        })

    for s in suppliers:
        s["products"] = by_supplier.get(s["supplierID"], [])

    return suppliers


@app.post("/suppliers", status_code=201)
def create_supplier(data: CreateSupplierSchema):
    product_ids_json = json.dumps(data.productIDs) if data.productIDs else None
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(
            cursor,
            "usp_CreateSupplier",
            (data.supplierName, data.companyName, data.phone, data.email, product_ids_json),
        )
        result = rows_to_dicts(cursor)

    if not result:
        raise HTTPException(status_code=500, detail="Supplier creation failed")

    return {"supplierID": result[0]["supplierID"], "message": "Supplier created"}


@app.put("/suppliers/{supplier_id}")
def update_supplier(supplier_id: int, data: UpdateSupplierSchema):
    product_ids_json = json.dumps(data.productIDs) if data.productIDs else None
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(
            cursor,
            "usp_UpdateSupplier",
            (supplier_id, data.supplierName, data.companyName, data.phone, data.email, product_ids_json),
        )
        result = rows_to_dicts(cursor)

    if not result:
        raise HTTPException(status_code=500, detail="Supplier update failed")

    return {"supplierID": result[0]["supplierID"], "message": "Supplier updated"}


@app.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_DeleteSupplier", (supplier_id,))
        result = rows_to_dicts(cursor)

    if not result:
        raise HTTPException(status_code=404, detail="Supplier not found")

    return result[0]


# ============================================================
# SALES PERSONS
# ============================================================

@app.get("/sales-persons", response_model=list[SalesPersonSchema])
def get_sales_persons():
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetAllSalesPersons")
        return rows_to_dicts(cursor)


@app.post("/sales-persons", response_model=SalesPersonSchema, status_code=201)
def create_sales_person(data: CreateSalesPersonSchema):
    salary = float(data.salary) if data.salary is not None else None
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(
            cursor,
            "usp_CreateSalesPerson",
            (data.empName, data.empEmail, data.empPhone, salary),
        )
        result = rows_to_dicts(cursor)

    if not result:
        raise HTTPException(status_code=500, detail="Sales person creation failed")

    return result[0]


@app.delete("/sales-persons/{emp_id}")
def delete_sales_person(emp_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_DeleteSalesPerson", (emp_id,))
        result = rows_to_dicts(cursor)

    if not result:
        raise HTTPException(status_code=404, detail="Sales person not found")

    return result[0]


# ============================================================
# GRN (Goods Receipt Notes)
# ============================================================

@app.get("/grn", response_model=list[GRNListItemSchema])
def get_all_grns():
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetAllGRNs")
        return rows_to_dicts(cursor)


@app.get("/grn/{grn_id}", response_model=GRNDetailSchema)
def get_grn_detail(grn_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetGRNDetail", (grn_id,))
        headers = rows_to_dicts(cursor)
        if not headers:
            raise HTTPException(status_code=404, detail=f"GRN {grn_id} not found")
        cursor.nextset()
        lines = rows_to_dicts(cursor)

    header = headers[0]
    return {
        **header,
        "lines": lines,
    }


@app.post("/grn", status_code=201)
def create_grn(data: CreateGRNSchema):
    items_json = json.dumps([
        {
            "prodID": item.prodID,
            "qty": item.qty,
            "unitCost": float(item.unitCost) if item.unitCost is not None else None,
        }
        for item in data.items
    ])

    with get_db() as conn:
        cursor = conn.cursor()
        call_procedure(
            cursor,
            "usp_CreateGRN",
            (data.supplierID, data.empID, data.notes, items_json),
        )
        result = rows_to_dicts(cursor)

    if not result:
        raise HTTPException(status_code=500, detail="GRN creation failed")

    return {"grnID": result[0]["grnID"], "message": "GRN created and stock updated"}


# ============================================================
# ROUTE 9: GET / — Health check
# ============================================================
# A simple route to verify the API is running.
# Useful for deployment health checks.
# ============================================================

@app.get("/")
def root():
    return {"status": "TechShop POS API is running", "docs": "/docs"}