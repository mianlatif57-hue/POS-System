CREATE OR ALTER PROCEDURE usp_DeleteSupplier
    @SupplierID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Supplier WHERE supplierID = @SupplierID)
        THROW 50013, 'Supplier not found.', 1;

    UPDATE Supplier SET isActive = 0 WHERE supplierID = @SupplierID;

    SELECT @SupplierID AS supplierID, 'Supplier removed' AS message;
END;
GO
