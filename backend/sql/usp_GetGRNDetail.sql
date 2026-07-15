CREATE OR ALTER PROCEDURE usp_GetGRNDetail
    @GRNID INT
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
        e.empName
    FROM GRN g
    INNER JOIN Supplier s ON s.supplierID = g.supplierID
    INNER JOIN Employee e ON e.empID = g.empID
    WHERE g.grnID = @GRNID;

    IF @@ROWCOUNT = 0
        THROW 50033, 'GRN not found.', 1;

    SELECT
        d.grnDetailID,
        d.prodID,
        p.prodName,
        d.quantityReceived,
        d.unitCost
    FROM GRNDetail d
    INNER JOIN Product p ON p.prodID = d.prodID
    WHERE d.grnID = @GRNID
    ORDER BY d.grnDetailID;
END;
GO
