-- ============================================================
-- usp_GetInventory — Get all products with cost/sale price/margin
-- ============================================================
CREATE OR ALTER PROCEDURE usp_GetInventory
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        prodID,
        prodName,
        costPrice,
        salePrice,
        stockQuantity,
        CASE 
            WHEN costPrice > 0 
                THEN CAST(((salePrice - costPrice) / costPrice * 100) AS DECIMAL(5,2))
            ELSE 0 
        END AS marginPercent,
        prodDescription,
        prodImage
    FROM Product
    ORDER BY prodName;
END;
GO
