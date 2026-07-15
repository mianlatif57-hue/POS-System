CREATE OR ALTER PROCEDURE usp_DeleteSalesPerson
    @EmpID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Employee WHERE empID = @EmpID)
        THROW 50021, 'Sales person not found.', 1;

    UPDATE Employee SET isActive = 0 WHERE empID = @EmpID;

    SELECT @EmpID AS empID, 'Sales person removed' AS message;
END;
GO
