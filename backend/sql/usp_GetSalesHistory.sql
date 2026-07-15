-- ============================================================
-- usp_GetSalesHistory — Get all invoices with employee names
-- ============================================================
CREATE OR ALTER PROCEDURE usp_GetSalesHistory
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        i.invoiceID,
        i.empID,
        e.empName,
        i.invoiceDateTime,
        i.totalAmount
    FROM Invoice i
    LEFT JOIN Employee e ON e.empID = i.empID
    ORDER BY i.invoiceDateTime DESC;
END;
GO
