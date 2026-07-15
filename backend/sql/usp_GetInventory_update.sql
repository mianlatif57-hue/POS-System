-- Update inventory listing to include product description
CREATE OR ALTER PROCEDURE usp_GetInventory
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.prodID,
        p.prodName,
        p.prodDescription,
        p.prodImage,
        p.stockQuantity,
        p.costPrice,
        p.salePrice,
        CASE
            WHEN p.costPrice > 0
            THEN ROUND(((p.salePrice - p.costPrice) / p.costPrice) * 100, 2)
            ELSE 0
        END AS marginPercent
    FROM Product p
    ORDER BY p.prodName;
END;
GO
