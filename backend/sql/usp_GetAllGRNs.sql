CREATE OR ALTER PROCEDURE usp_GetAllGRNs
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        g.grnID,
        g.receivedDate,
        g.notes,
        s.supplierID,
        s.supplierName,
        s.companyName,
        e.empID,
        e.empName,
        (SELECT SUM(d.quantityReceived) FROM GRNDetail d WHERE d.grnID = g.grnID) AS totalUnits,
        (SELECT COUNT(*) FROM GRNDetail d WHERE d.grnID = g.grnID) AS lineCount
    FROM GRN g
    INNER JOIN Supplier s ON s.supplierID = g.supplierID
    INNER JOIN Employee e ON e.empID = g.empID
    ORDER BY g.grnID DESC;
END;
GO
