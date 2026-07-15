-- ============================================================
-- usp_GetProductDetail — Get full product details with history
-- ============================================================
CREATE OR ALTER PROCEDURE usp_GetProductDetail
    @ProdID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Result Set 1: Product info
    SELECT
        prodID,
        prodName,
        prodDescription,
        prodImage,
        costPrice,
        salePrice,
        stockQuantity
    FROM Product
    WHERE prodID = @ProdID;

    -- Result Set 2: Adjustment history
    SELECT
        adjID,
        prodID,
        empID,
        adjustedQty,
        adjustedAt,
        reason
    FROM InventoryAdjustment
    WHERE prodID = @ProdID
    ORDER BY adjustedAt DESC;
END;
GO
