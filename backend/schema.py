# ============================================================
#  schema.py — Pydantic Data Validation Models
# ============================================================
# LEARNING NOTE:
# Pydantic is a Python library that validates data using type hints.
# FastAPI uses it automatically for request bodies and responses.
#
# Think of schemas as "contracts":
#   - REQUEST schemas: what data the frontend MUST send us
#   - RESPONSE schemas: what data we PROMISE to send back
#
# If the frontend sends the wrong type (e.g., a string where an
# int is expected), Pydantic rejects it with a clear error BEFORE
# it even reaches our database code. This is safety layer #1.
#
# Without Pydantic, you'd have to manually validate every field:
#   if not isinstance(data["qty"], int): raise ValueError(...)
# Pydantic does this automatically from type hints.
# ============================================================

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ============================================================
# REQUEST SCHEMAS — Data coming IN (from frontend to backend)
# ============================================================

class CartItemSchema(BaseModel):
    """
    One item in a shopping cart.
    LEARNING NOTE:
    Field(...) means the field is REQUIRED (no default).
    Field(gt=0) means "greater than 0" — a validation rule.
    If qty=0 is sent, Pydantic rejects it before our code runs.
    """
    prodID:    int                   = Field(..., gt=0,   description="Product ID")
    qty:       int                   = Field(..., gt=0,   description="Quantity must be positive")
    unitPrice: Decimal               = Field(..., gt=0,   description="Price at time of sale")

    class Config:
        # Allow Decimal types to be serialized properly to JSON
        json_encoders = {Decimal: str}


class CreateSaleSchema(BaseModel):
    """
    A complete sale request: who's selling, and what's in the cart.
    """
    empID: int                       = Field(..., gt=0)
    cart:  list[CartItemSchema]      = Field(..., min_items=1,
                                            description="Must have at least 1 item")


class InventoryAdjustSchema(BaseModel):
    """
    A manual stock adjustment (add or remove stock).
    adjustedQty can be negative (removing stock) or positive (adding).
    We only block zero — that would be a pointless adjustment.
    """
    prodID:      int            = Field(..., gt=0)
    empID:       int            = Field(..., gt=0)
    adjustedQty: int            = Field(..., ne=0, description="Cannot be zero")
    reason:      Optional[str]  = Field(None, max_length=300)

    @validator("adjustedQty")
    def qty_not_zero(cls, v):
        # LEARNING NOTE: @validator lets you write custom validation
        # logic beyond what Field() supports.
        if v == 0:
            raise ValueError("adjustedQty cannot be zero")
        return v


# ============================================================
# RESPONSE SCHEMAS — Data going OUT (from backend to frontend)
# ============================================================
# LEARNING NOTE:
# These aren't strictly required — FastAPI can return plain dicts.
# But defining them:
#  1. Documents exactly what each endpoint returns
#  2. Lets FastAPI auto-generate API docs (at /docs)
#  3. Strips out any extra database fields you don't want exposed
# ============================================================

class ProductListItemSchema(BaseModel):
    """Product as shown on the transaction/POS screen."""
    prodID:        int
    prodName:      str
    prodImage:     Optional[str]
    stockQuantity: int
    salePrice:     Decimal

    class Config:
        from_attributes = True   # allows creating from ORM/dict


class InventoryProductSchema(BaseModel):
    """Product as shown on the inventory page (includes cost & margin)."""
    prodID:        int
    prodName:      str
    prodImage:     Optional[str]
    stockQuantity: int
    costPrice:     Decimal
    salePrice:     Decimal
    marginPercent: Decimal

    class Config:
        from_attributes = True


class InvoiceHeaderSchema(BaseModel):
    """The top portion of an invoice."""
    invoiceID:       int
    invoiceDateTime: datetime
    totalAmount:     Decimal
    empName:         str

    class Config:
        from_attributes = True


class InvoiceLineSchema(BaseModel):
    """One line item on an invoice."""
    saleID:       Optional[int] = None
    prodID:       Optional[int] = None
    prodName:     str
    quantitySold: int
    unitPrice:    Decimal
    subTotal:     Decimal

    class Config:
        from_attributes = True


class InvoiceFullSchema(BaseModel):
    """Complete invoice: header + all line items."""
    header:     InvoiceHeaderSchema
    lines:      list[InvoiceLineSchema]


class SaleCreatedSchema(BaseModel):
    """Response after successfully creating a sale."""
    invoiceID:   int
    totalAmount: Decimal


class InventoryAdjustResultSchema(BaseModel):
    """Response after adjusting stock."""
    prodID:           int
    newStockQuantity: int


class InventoryLogSchema(BaseModel):
    """One row of inventory adjustment history."""
    adjustedQty: int
    reason:      Optional[str]
    adjustedAt:  datetime
    empName:     str

    class Config:
        from_attributes = True


class ProductDetailSchema(BaseModel):
    """Full product detail + history."""
    prodID:        int
    prodName:      str
    prodImage:     Optional[str]
    stockQuantity: int
    costPrice:     Decimal
    salePrice:     Decimal
    history:       list[InventoryLogSchema]

    class Config:
        from_attributes = True


# ============================================================
# EMPLOYEE SCHEMA
# ============================================================

class EmployeeSchema(BaseModel):
    """Employee/cashier information."""
    empID:   int
    empName: str

    class Config:
        from_attributes = True


# ============================================================
# RETURN/EXCHANGE SCHEMA
# ============================================================

class ReturnItemSchema(BaseModel):
    """One product line to return (partial return)."""
    prodID: int = Field(..., gt=0)
    qty:    int = Field(..., gt=0, description="Quantity to return (must not exceed quantity sold)")


class ReturnSaleSchema(BaseModel):
    """Request to return/exchange a sale (refund items to inventory)."""
    reason: Optional[str] = Field(None, max_length=500, description="Reason for return")
    items:  Optional[list[ReturnItemSchema]] = Field(
        None,
        min_length=1,
        description="Specific products to return. Omit to return the entire invoice.",
    )


class ReturnSaleResultSchema(BaseModel):
    """Response after successfully returning a sale."""
    invoiceID:     int
    message:       str
    itemsReturned: int
    unitsReturned: Optional[int] = None

