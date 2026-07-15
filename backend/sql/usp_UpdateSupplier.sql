CREATE OR ALTER PROCEDURE usp_UpdateSupplier
    @SupplierID   INT,
    @SupplierName NVARCHAR(100),
    @CompanyName  NVARCHAR(200),
    @Phone        NVARCHAR(30)  = NULL,
    @Email        NVARCHAR(100) = NULL,
    @ProductIDsJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM Supplier WHERE supplierID = @SupplierID AND isActive = 1)
        THROW 50012, 'Supplier not found.', 1;

    BEGIN TRANSACTION;

    UPDATE Supplier
    SET supplierName = @SupplierName,
        companyName  = @CompanyName,
        phone        = @Phone,
        email        = @Email
    WHERE supplierID = @SupplierID;

    DELETE FROM SupplierProduct WHERE supplierID = @SupplierID;

    IF @ProductIDsJson IS NOT NULL AND LTRIM(RTRIM(@ProductIDsJson)) <> '' AND @ProductIDsJson <> '[]'
    BEGIN
        INSERT INTO SupplierProduct (supplierID, prodID)
        SELECT @SupplierID, CAST(j.value AS INT)
        FROM OPENJSON(@ProductIDsJson) j
        INNER JOIN Product p ON p.prodID = CAST(j.value AS INT);
    END

    COMMIT TRANSACTION;

    SELECT @SupplierID AS supplierID;
END;
GO
