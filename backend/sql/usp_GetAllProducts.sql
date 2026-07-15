-- ============================================================
-- usp_GetAllProducts — Fetch all in-stock products for POS
-- ============================================================
CREATE OR ALTER PROCEDURE usp_GetAllProducts
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        prodID,
        prodName,
        prodImage,
        prodDescription,
        costPrice,
        salePrice,
        stockQuantity
    FROM Product
    WHERE stockQuantity > 0
       OR prodID IN (SELECT TOP 10 prodID FROM Product ORDER BY prodID DESC)
    ORDER BY prodName;
END;
GO
