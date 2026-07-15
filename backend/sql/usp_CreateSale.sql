-- ============================================================
-- usp_CreateSale — Create a complete sale transaction
-- ============================================================
CREATE OR ALTER PROCEDURE usp_CreateSale
    @EmpID INT,
    @ItemsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM Employee WHERE empID = @EmpID)
        THROW 50050, 'Employee not found.', 1;

    IF @ItemsJson IS NULL OR LTRIM(RTRIM(@ItemsJson)) = '' OR @ItemsJson = '[]'
        THROW 50051, 'At least one item is required.', 1;

    BEGIN TRANSACTION;

    -- Create invoice header
    INSERT INTO Invoice (empID, totalAmount, invoiceDateTime)
    VALUES (@EmpID, 0, GETDATE());

    DECLARE @InvoiceID INT = SCOPE_IDENTITY();
    DECLARE @TotalAmount DECIMAL(12,2) = 0;

    -- Insert invoice lines from JSON
    INSERT INTO InvoiceDetail (invoiceID, prodID, quantitySold, unitPrice, subTotal)
    SELECT
        @InvoiceID,
        CAST(j.prodID AS INT),
        CAST(j.qty AS INT),
        CAST(j.unitPrice AS DECIMAL(12,2)),
        CAST(j.qty AS INT) * CAST(j.unitPrice AS DECIMAL(12,2))
    FROM OPENJSON(@ItemsJson)
    WITH (
        prodID INT '$.prodID',
        qty INT '$.qty',
        unitPrice DECIMAL(12,2) '$.unitPrice'
    ) j;

    -- Calculate total
    SELECT @TotalAmount = SUM(subTotal)
    FROM InvoiceDetail
    WHERE invoiceID = @InvoiceID;

    -- Update invoice total
    UPDATE Invoice
    SET totalAmount = ISNULL(@TotalAmount, 0)
    WHERE invoiceID = @InvoiceID;

    -- Update stock
    UPDATE p
    SET p.stockQuantity = p.stockQuantity - d.quantitySold
    FROM Product p
    INNER JOIN InvoiceDetail d ON d.prodID = p.prodID
    WHERE d.invoiceID = @InvoiceID;

    COMMIT TRANSACTION;

    SELECT
        @InvoiceID AS invoiceID,
        ISNULL(@TotalAmount, 0) AS totalAmount;
END;
GO
