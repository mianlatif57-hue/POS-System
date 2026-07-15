CREATE OR ALTER PROCEDURE usp_GetAllSuppliers
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.supplierID,
        s.supplierName,
        s.companyName,
        s.phone,
        s.email,
        s.isActive,
        s.createdAt
    FROM Supplier s
    WHERE s.isActive = 1
    ORDER BY s.companyName, s.supplierName;

    SELECT
        sp.supplierID,
        sp.prodID,
        p.prodName
    FROM SupplierProduct sp
    INNER JOIN Supplier s ON s.supplierID = sp.supplierID AND s.isActive = 1
    INNER JOIN Product p  ON p.prodID = sp.prodID
    ORDER BY sp.supplierID, p.prodName;
END;
GO
