CREATE OR ALTER PROCEDURE usp_CreateSupplier
    @SupplierName NVARCHAR(100),
    @CompanyName  NVARCHAR(200),
    @Phone        NVARCHAR(30)  = NULL,
    @Email        NVARCHAR(100) = NULL,
    @ProductIDsJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @SupplierName IS NULL OR LTRIM(RTRIM(@SupplierName)) = ''
        THROW 50010, 'Supplier name is required.', 1;

    IF @CompanyName IS NULL OR LTRIM(RTRIM(@CompanyName)) = ''
        THROW 50011, 'Company name is required.', 1;

    BEGIN TRANSACTION;

    INSERT INTO Supplier (supplierName, companyName, phone, email)
    VALUES (@SupplierName, @CompanyName, @Phone, @Email);

    DECLARE @SupplierID INT = SCOPE_IDENTITY();

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
