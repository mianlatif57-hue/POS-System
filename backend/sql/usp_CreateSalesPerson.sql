CREATE OR ALTER PROCEDURE usp_CreateSalesPerson
    @EmpName  NVARCHAR(100),
    @EmpEmail NVARCHAR(100) = NULL,
    @EmpPhone NVARCHAR(30)  = NULL,
    @Salary   DECIMAL(12, 2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @EmpName IS NULL OR LTRIM(RTRIM(@EmpName)) = ''
        THROW 50020, 'Sales person name is required.', 1;

    INSERT INTO Employee (empName, empEmail, empPhone, hireDate, salary, isActive)
    VALUES (@EmpName, @EmpEmail, @EmpPhone, GETDATE(), @Salary, 1);

    SELECT
        SCOPE_IDENTITY() AS empID,
        @EmpName          AS empName,
        @EmpEmail         AS empEmail,
        @EmpPhone         AS empPhone,
        @Salary           AS salary;
END;
GO
