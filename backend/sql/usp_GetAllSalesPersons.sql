CREATE OR ALTER PROCEDURE usp_GetAllSalesPersons
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        empID,
        empName,
        empEmail,
        empPhone,
        hireDate,
        salary,
        isActive
    FROM Employee
    WHERE isActive = 1
    ORDER BY empName;
END;
GO
