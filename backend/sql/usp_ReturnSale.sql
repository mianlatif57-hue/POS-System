-- Run this script in SQL Server Management Studio against TechShopPOS.
-- Replaces usp_ReturnSale to support full AND partial returns.
--
-- @ReturnItemsJson = NULL  -> return every line on the invoice (full return)
-- @ReturnItemsJson = '[{"prodID":1,"qty":2}]' -> return only those products/qty

CREATE OR ALTER PROCEDURE usp_ReturnSale
    @InvoiceID INT,
    @ReturnReason NVARCHAR(500) = NULL,
    @ReturnItemsJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Invoice WHERE invoiceID = @InvoiceID)
    BEGIN
        RAISERROR('Invoice not found.', 16, 1);
        RETURN;
    END;

    DECLARE @ItemsReturned INT = 0;
    DECLARE @UnitsReturned INT = 0;

    BEGIN TRANSACTION;

    BEGIN TRY
        IF @ReturnItemsJson IS NULL OR LTRIM(RTRIM(@ReturnItemsJson)) IN ('', '[]')
        BEGIN
            -- Full invoice return: restock all line items
            UPDATE P
            SET P.stockQuantity = P.stockQuantity + D.quantitySold
            FROM Product P
            INNER JOIN InvoiceDetail D ON P.prodID = D.prodID
            WHERE D.invoiceID = @InvoiceID;

            SELECT
                @ItemsReturned = COUNT(1),
                @UnitsReturned = ISNULL(SUM(quantitySold), 0)
            FROM InvoiceDetail
            WHERE invoiceID = @InvoiceID;

            DELETE FROM InvoiceDetail WHERE invoiceID = @InvoiceID;

            UPDATE Invoice
            SET totalAmount = 0
            WHERE invoiceID = @InvoiceID;
        END
        ELSE
        BEGIN
            -- Partial return: validate each requested product/qty
            IF EXISTS (
                SELECT 1
                FROM OPENJSON(@ReturnItemsJson)
                WITH (prodID INT '$.prodID', qty INT '$.qty') AS R
                LEFT JOIN InvoiceDetail D
                    ON D.invoiceID = @InvoiceID AND D.prodID = R.prodID
                WHERE R.qty IS NULL OR R.qty <= 0 OR D.prodID IS NULL OR R.qty > D.quantitySold
            )
            BEGIN
                RAISERROR('Invalid return: product not on invoice or quantity exceeds amount sold.', 16, 1);
            END;

            UPDATE P
            SET P.stockQuantity = P.stockQuantity + R.qty
            FROM Product P
            INNER JOIN OPENJSON(@ReturnItemsJson)
                WITH (prodID INT '$.prodID', qty INT '$.qty') AS R ON P.prodID = R.prodID;

            UPDATE D
            SET
                D.quantitySold = D.quantitySold - R.qty,
                D.subTotal = (D.quantitySold - R.qty) * D.unitPrice
            FROM InvoiceDetail D
            INNER JOIN OPENJSON(@ReturnItemsJson)
                WITH (prodID INT '$.prodID', qty INT '$.qty') AS R ON D.prodID = R.prodID
            WHERE D.invoiceID = @InvoiceID;

            DELETE FROM InvoiceDetail
            WHERE invoiceID = @InvoiceID AND quantitySold = 0;

            UPDATE I
            SET I.totalAmount = ISNULL((
                SELECT SUM(subTotal) FROM InvoiceDetail WHERE invoiceID = @InvoiceID
            ), 0)
            FROM Invoice I
            WHERE I.invoiceID = @InvoiceID;

            SELECT
                @ItemsReturned = COUNT(1),
                @UnitsReturned = ISNULL(SUM(R.qty), 0)
            FROM OPENJSON(@ReturnItemsJson)
            WITH (prodID INT '$.prodID', qty INT '$.qty') AS R;
        END;

        COMMIT TRANSACTION;

        SELECT
            @ItemsReturned AS itemsReturned,
            @UnitsReturned AS unitsReturned;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;