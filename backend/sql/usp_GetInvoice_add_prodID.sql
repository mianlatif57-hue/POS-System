-- Run in SSMS if invoice lines are missing prodID (required for partial returns).
-- This replaces usp_GetInvoice to include saleID and prodID in the line-item result set.

CREATE OR ALTER PROCEDURE usp_GetInvoice
    @invoiceID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.invoiceID,
        i.invoiceDateTime,
        i.totalAmount,
        e.empName
    FROM Invoice i
    JOIN Employee e ON e.empID = i.empID
    WHERE i.invoiceID = @invoiceID;

    SELECT
        d.saleID,
        d.prodID,
        p.prodName,
        d.quantitySold,
        d.unitPrice,
        d.subTotal
    FROM InvoiceDetail d
    JOIN Product p ON p.prodID = d.prodID
    WHERE d.invoiceID = @invoiceID
    ORDER BY d.saleID;
END;
