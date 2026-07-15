-- ============================================================
-- usp_GetInvoice — Get a complete invoice with line items
-- ============================================================
CREATE OR ALTER PROCEDURE usp_GetInvoice
    @InvoiceID INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Result Set 1: Invoice header
    SELECT
        invoiceID,
        empID,
        totalAmount,
        invoiceDateTime
    FROM Invoice
    WHERE invoiceID = @InvoiceID;

    -- Result Set 2: Invoice line items
    SELECT
        invoiceID,
        prodID,
        quantitySold,
        unitPrice,
        subTotal,
        (SELECT prodName FROM Product WHERE prodID = InvoiceDetail.prodID) AS prodName
    FROM InvoiceDetail
    WHERE invoiceID = @InvoiceID
    ORDER BY invoiceID;
END;
GO
