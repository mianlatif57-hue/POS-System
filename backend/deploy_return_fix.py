"""Deploy return fixes: update usp_ReturnSale and add prodID to usp_GetInvoice line items."""
import pyodbc
from database import get_connection, call_procedure, rows_to_dicts

RETURN_SALE_SQL = open("sql/usp_ReturnSale.sql", encoding="utf-8").read()

GET_INVOICE_SQL = """
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
"""


def main():
    conn = get_connection()
    conn.autocommit = True
    cursor = conn.cursor()

    print("Updating usp_ReturnSale...")
    cursor.execute(RETURN_SALE_SQL)

    print("Updating usp_GetInvoice (add prodID + saleID to lines)...")
    cursor.execute(GET_INVOICE_SQL)

    conn.autocommit = False
    conn.close()

    print("Verifying invoice line columns...")
    from database import get_db

    with get_db() as conn:
        c = conn.cursor()
        call_procedure(c, "usp_GetSalesHistory")
        sales = rows_to_dicts(c)
        if not sales:
            print("No sales to verify.")
            return
        inv_id = sales[0]["invoiceID"]
        call_procedure(c, "usp_GetInvoice", (inv_id,))
        rows_to_dicts(c)
        c.nextset()
        lines = rows_to_dicts(c)
        print(f"Invoice #{inv_id} line keys:", list(lines[0].keys()) if lines else "no lines")

    print("Done.")


if __name__ == "__main__":
    main()
