-- ============================================================
-- usp_GetAllEmployees — Get all active employees for POS
-- ============================================================
CREATE OR ALTER PROCEDURE usp_GetAllEmployees
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        empID,
        empName,
        empEmail,
        empPhone,
        salary,
        hireDate,
        isActive
    FROM Employee
    WHERE isActive = 1
    ORDER BY empName;
END;
GO
