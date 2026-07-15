-- ============================================================
-- usp_AdjustInventory — Add or remove stock with audit trail
-- ============================================================
CREATE OR ALTER PROCEDURE usp_AdjustInventory
    @ProdID INT,
    @EmpID INT,
    @AdjustedQty INT,
    @Reason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM Product WHERE prodID = @ProdID)
        THROW 50040, 'Product not found.', 1;

    IF NOT EXISTS (SELECT 1 FROM Employee WHERE empID = @EmpID)
        THROW 50041, 'Employee not found.', 1;

    BEGIN TRANSACTION;

    -- Update inventory
    UPDATE Product
    SET stockQuantity = stockQuantity + @AdjustedQty
    WHERE prodID = @ProdID;

    -- Log adjustment (if table exists)
    IF OBJECT_ID('InventoryAdjustment', 'U') IS NOT NULL
    BEGIN
        INSERT INTO InventoryAdjustment (prodID, empID, adjustedQty, reason, adjustedAt)
        VALUES (@ProdID, @EmpID, @AdjustedQty, @Reason, GETDATE());
    END

    COMMIT TRANSACTION;

    SELECT
        prodID,
        stockQuantity
    FROM Product
    WHERE prodID = @ProdID;
END;
GO
