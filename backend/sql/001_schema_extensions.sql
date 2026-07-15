-- ============================================================
-- 001_schema_extensions.sql
-- Run once on TechShopPOS to add tables/columns for:
--   - Product description
--   - Suppliers & supplier-product links
--   - Employee salary (sales persons)
--   - GRN (Goods Receipt Notes)
-- ============================================================

-- Product: add description column
IF COL_LENGTH('Product', 'prodDescription') IS NULL
BEGIN
    ALTER TABLE Product ADD prodDescription NVARCHAR(MAX) NULL;
END
GO

-- Employee: ensure optional columns exist for sales person management
IF COL_LENGTH('Employee', 'empEmail') IS NULL
    ALTER TABLE Employee ADD empEmail NVARCHAR(100) NULL;
IF COL_LENGTH('Employee', 'empPhone') IS NULL
    ALTER TABLE Employee ADD empPhone NVARCHAR(30) NULL;
IF COL_LENGTH('Employee', 'hireDate') IS NULL
    ALTER TABLE Employee ADD hireDate DATETIME NULL;
IF COL_LENGTH('Employee', 'isActive') IS NULL
    ALTER TABLE Employee ADD isActive BIT NOT NULL DEFAULT 1;
IF COL_LENGTH('Employee', 'salary') IS NULL
    ALTER TABLE Employee ADD salary DECIMAL(12, 2) NULL;
GO

-- Supplier table
IF OBJECT_ID('Supplier', 'U') IS NULL
BEGIN
    CREATE TABLE Supplier (
        supplierID   INT IDENTITY(1,1) PRIMARY KEY,
        supplierName NVARCHAR(100) NOT NULL,
        companyName  NVARCHAR(200) NOT NULL,
        phone        NVARCHAR(30)  NULL,
        email        NVARCHAR(100) NULL,
        isActive     BIT NOT NULL DEFAULT 1,
        createdAt    DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

-- Which products each supplier supplies
IF OBJECT_ID('SupplierProduct', 'U') IS NULL
BEGIN
    CREATE TABLE SupplierProduct (
        supplierID INT NOT NULL,
        prodID     INT NOT NULL,
        CONSTRAINT PK_SupplierProduct PRIMARY KEY (supplierID, prodID),
        CONSTRAINT FK_SupplierProduct_Supplier FOREIGN KEY (supplierID) REFERENCES Supplier(supplierID),
        CONSTRAINT FK_SupplierProduct_Product  FOREIGN KEY (prodID)     REFERENCES Product(prodID)
    );
END
GO

-- GRN header (Goods Receipt Note)
IF OBJECT_ID('GRN', 'U') IS NULL
BEGIN
    CREATE TABLE GRN (
        grnID         INT IDENTITY(1,1) PRIMARY KEY,
        supplierID    INT NOT NULL,
        empID         INT NOT NULL,
        receivedDate  DATETIME NOT NULL DEFAULT GETDATE(),
        notes         NVARCHAR(500) NULL,
        CONSTRAINT FK_GRN_Supplier FOREIGN KEY (supplierID) REFERENCES Supplier(supplierID),
        CONSTRAINT FK_GRN_Employee FOREIGN KEY (empID)     REFERENCES Employee(empID)
    );
END
GO

-- GRN line items
IF OBJECT_ID('GRNDetail', 'U') IS NULL
BEGIN
    CREATE TABLE GRNDetail (
        grnDetailID      INT IDENTITY(1,1) PRIMARY KEY,
        grnID            INT NOT NULL,
        prodID           INT NOT NULL,
        quantityReceived INT NOT NULL,
        unitCost         DECIMAL(12, 2) NULL,
        CONSTRAINT FK_GRNDetail_GRN     FOREIGN KEY (grnID)  REFERENCES GRN(grnID) ON DELETE CASCADE,
        CONSTRAINT FK_GRNDetail_Product FOREIGN KEY (prodID) REFERENCES Product(prodID),
        CONSTRAINT CK_GRNDetail_Qty CHECK (quantityReceived > 0)
    );
END
GO
