CREATE OR ALTER PROCEDURE usp_CreateGRN
    @SupplierID   INT,
    @EmpID        INT,
    @Notes        NVARCHAR(500) = NULL,
    @ItemsJson    NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM Supplier WHERE supplierID = @SupplierID AND isActive = 1)
        THROW 50030, 'Supplier not found.', 1;

    IF NOT EXISTS (SELECT 1 FROM Employee WHERE empID = @EmpID AND isActive = 1)
        THROW 50031, 'Employee not found.', 1;

    IF @ItemsJson IS NULL OR LTRIM(RTRIM(@ItemsJson)) = '' OR @ItemsJson = '[]'
        THROW 50032, 'At least one product line is required.', 1;

    BEGIN TRANSACTION;

    INSERT INTO GRN (supplierID, empID, notes)
    VALUES (@SupplierID, @EmpID, @Notes);

    DECLARE @GRNID INT = SCOPE_IDENTITY();

    INSERT INTO GRNDetail (grnID, prodID, quantityReceived, unitCost)
    SELECT
        @GRNID,
        CAST(j.prodID AS INT),
        CAST(j.qty AS INT),
        CAST(j.unitCost AS DECIMAL(12, 2))
    FROM OPENJSON(@ItemsJson)
    WITH (
        prodID   INT           '$.prodID',
        qty      INT           '$.qty',
        unitCost DECIMAL(12,2) '$.unitCost'
    ) j;

    UPDATE p
    SET p.stockQuantity = p.stockQuantity + d.quantityReceived,
        p.costPrice = CASE
            WHEN d.unitCost IS NOT NULL AND d.unitCost > 0 THEN d.unitCost
            ELSE p.costPrice
        END
    FROM Product p
    INNER JOIN GRNDetail d ON d.prodID = p.prodID
    WHERE d.grnID = @GRNID;

    COMMIT TRANSACTION;

    SELECT @GRNID AS grnID;
END;
GO
