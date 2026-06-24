# Stored Procedures - ChatGPT Prompts

Use these prompts with ChatGPT to generate the SQL code for your stored procedures. Copy each prompt and paste it into ChatGPT.

---

## 1️⃣ GET ALL EMPLOYEES PROCEDURE

**Prompt to give ChatGPT:**

```
Create a SQL Server stored procedure named "usp_GetAllEmployees" that:

Purpose: Returns a list of all employees/cashiers in the system for selection during a sale.

Parameters: None (no input parameters)

Returns (Output):
- A result set with one row per employee containing:
  - empID (INT): The employee's unique ID
  - empName (VARCHAR/NVARCHAR): The employee's full name

Database table: Employee table with columns: empID, empName, empEmail, empPhone, hireDate, isActive (or similar)

Requirements:
1. Return ONLY active employees (where isActive = 1 or similar status field)
2. Order the results by empName in ascending order (alphabetical)
3. Set NOCOUNT ON at the beginning
4. The table might have additional columns like empEmail, empPhone, etc. - only return empID and empName
5. Use simple SELECT with optional WHERE clause for active status only

Example usage: SELECT * FROM usp_GetAllEmployees would return something like:
empID | empName
------|----------
1     | Ahmed Khan
2     | Fatima Ali
3     | Hassan Ahmed

Return the complete SQL code for this stored procedure.
```

---

## 2️⃣ RETURN SALE PROCEDURE

**Prompt to give ChatGPT:**

```
Create a SQL Server stored procedure named "usp_ReturnSale" that:

Purpose: Process a return/exchange by adding all items from an invoice back to inventory.
When a customer returns a product or wants to exchange, this procedure:
- Takes back all items from the original invoice
- Adds the quantities back to the Product inventory (stockQuantity)
- Optionally marks the invoice as "returned" or records the return reason
- Returns the number of items returned

Parameters (Input):
- @InvoiceID INT: The ID of the invoice to return
- @ReturnReason NVARCHAR(500): Optional reason for the return (e.g., "Damaged", "Customer changed mind")

Returns (Output):
- A result set with one row containing:
  - itemsReturned (INT): Count of product line items returned

Database tables involved:
- Invoice table: invoiceID, empID, invoiceDateTime, totalAmount, (possibly: returnedDateTime, returnReason, isReturned)
- InvoiceDetail table: invoiceID, saleID, prodID, quantitySold, unitPrice, subTotal
- Product table: prodID, prodName, stockQuantity, costPrice, salePrice

Logic:
1. Start a transaction for data integrity
2. Get all items (rows) from InvoiceDetail where invoiceID matches @InvoiceID
3. For each item in the invoice:
   - Get the quantitySold from InvoiceDetail
   - Get the prodID from InvoiceDetail
   - Add quantitySold back to Product.stockQuantity: UPDATE Product SET stockQuantity = stockQuantity + @quantitySold WHERE prodID = @prodID
4. Count total items returned (number of rows in InvoiceDetail for this invoice)
5. Optional: Update Invoice table to mark it as returned (e.g., SET isReturned = 1, returnedDateTime = GETDATE(), returnReason = @ReturnReason)
6. Commit the transaction
7. Return the count of items returned in a result set

Error handling:
- If @InvoiceID doesn't exist, raise an error: "Invoice not found"
- If the invoice has no line items, still return 0 items (or handle as appropriate)

Example: If Invoice #5 has:
- 2x Product A (quantity: 3)
- 1x Product B (quantity: 1)
Then calling this procedure adds 3 units back to Product A and 1 unit back to Product B, and returns itemsReturned = 2

Return the complete SQL code for this stored procedure.
```

---

## 3️⃣ OPTIONAL: UPDATE INVOICE STATUS PROCEDURE

**Prompt to give ChatGPT (if you want a separate procedure to mark invoices as returned):**

```
Create a SQL Server stored procedure named "usp_MarkInvoiceAsReturned" that:

Purpose: Mark an invoice as "returned" in the database (for historical record keeping).

Parameters (Input):
- @InvoiceID INT: The invoice to mark as returned
- @ReturnReason NVARCHAR(500): Reason for the return

Database table: Invoice table with columns including:
- invoiceID, empID, invoiceDateTime, totalAmount
- isReturned (BIT): 0 = not returned, 1 = returned
- returnedDateTime (DATETIME): When the return was processed
- returnReason (NVARCHAR(500)): Reason for return

Logic:
1. Check if invoice exists; if not, raise error
2. Update Invoice SET isReturned = 1, returnedDateTime = GETDATE(), returnReason = @ReturnReason WHERE invoiceID = @InvoiceID
3. Return success with the invoice ID

This procedure can be called AFTER usp_ReturnSale to update the invoice status.

Return the complete SQL code for this stored procedure.
```

---

## 4️⃣ REFERENCE: YOUR EXISTING PROCEDURES (Already provided)

You have already created these two procedures:

```sql
CREATE PROCEDURE usp_GetSalesHistory
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        I.invoiceID,
        E.empName,
        I.invoiceDateTime,
        I.totalAmount,
        COUNT(D.saleID) AS TotalProducts
    FROM Invoice I
    INNER JOIN Employee E ON I.empID = E.empID
    LEFT JOIN InvoiceDetail D ON I.invoiceID = D.invoiceID
    GROUP BY I.invoiceID, E.empName, I.invoiceDateTime, I.totalAmount
    ORDER BY I.invoiceID DESC;
END
GO

CREATE PROCEDURE usp_GetInvoiceDetails
    @InvoiceID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        D.saleID,
        P.prodName,
        D.quantitySold,
        D.unitPrice,
        D.subTotal
    FROM InvoiceDetail D
    INNER JOIN Product P ON D.prodID = P.prodID
    WHERE D.invoiceID = @InvoiceID
    ORDER BY D.saleID;
END
GO
```

---

## 📋 PROCEDURE IMPLEMENTATION CHECKLIST

Here's what you need to do:

1. **Copy Prompt #1** → Ask ChatGPT to create `usp_GetAllEmployees`
   - Use the SQL code to create the procedure in your SQL Server database
   - Run: `CREATE PROCEDURE usp_GetAllEmployees ...`

2. **Copy Prompt #2** → Ask ChatGPT to create `usp_ReturnSale`
   - This is the critical one for the return functionality
   - Use the SQL code to create the procedure in your SQL Server database
   - Run: `CREATE PROCEDURE usp_ReturnSale ...`

3. **Verify in SQL Server:**
   ```sql
   -- Check if procedures exist
   SELECT * FROM sys.objects WHERE type = 'P' AND name IN ('usp_GetAllEmployees', 'usp_ReturnSale');
   
   -- Test usp_GetAllEmployees
   EXEC usp_GetAllEmployees;
   
   -- Test usp_ReturnSale (use a real invoice ID from your database)
   EXEC usp_ReturnSale @InvoiceID = 1, @ReturnReason = 'Test return';
   ```

4. **Run your backend & frontend** - The new features should now work!

---

## 🔍 TROUBLESHOOTING TIPS

If you get errors when running the procedures:

1. **Check table names** - Make sure your table names match:
   - `Employee` (or `Employees`)
   - `Product` (or `Products`)
   - `Invoice`
   - `InvoiceDetail`

2. **Check column names** - Verify these exist:
   - `empID`, `empName` (in Employee)
   - `prodID`, `stockQuantity` (in Product)
   - `invoiceID`, `empID`, `invoiceDateTime`, `totalAmount` (in Invoice)
   - `quantitySold`, `prodID`, `unitPrice`, `subTotal` (in InvoiceDetail)

3. **If columns are named differently**, modify the ChatGPT prompt accordingly. For example:
   - If your Employee table uses `EmployeeID` instead of `empID`, mention this in the prompt
   - If Product stock column is `quantityInStock` instead of `stockQuantity`, mention this

4. **Test each procedure individually** before running the full application

---

## 📝 HOW THE FEATURES WORK IN YOUR APP

### Employee Selection (Transaction Page)
1. Frontend calls `GET /employees` 
2. Backend calls `usp_GetAllEmployees`
3. Returns list of employees
4. User selects one from dropdown
5. Sale is created with selected `empID`

### Return/Exchange (Sales History Page)
1. User clicks "Return" button on an invoice
2. Modal appears with reason field
3. User enters reason (optional) and clicks "Confirm Return"
4. Frontend calls `POST /sales/{invoiceID}/return` with reason
5. Backend calls `usp_ReturnSale` with invoiceID and reason
6. All items from invoice are added back to inventory
7. Success message shown and sales list refreshed

---

## 💡 TIPS FOR CHATGPT PROMPTS

When using ChatGPT:
- Be specific about table and column names
- Ask for NOCOUNT ON and error handling
- Ask for a result set (SELECT) at the end
- If something doesn't work, show ChatGPT the error and ask it to fix the code
- Test the SQL code in SQL Server Management Studio before deploying

Good luck! 🚀
