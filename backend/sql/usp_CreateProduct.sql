CREATE OR ALTER PROCEDURE usp_CreateProduct
    @ProdName        NVARCHAR(200),
    @ProdDescription NVARCHAR(MAX) = NULL,
    @ProdImage       NVARCHAR(MAX) = NULL,
    @CostPrice       DECIMAL(12, 2),
    @SalePrice       DECIMAL(12, 2),
    @StockQuantity   INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @ProdName IS NULL OR LTRIM(RTRIM(@ProdName)) = ''
        THROW 50001, 'Product name is required.', 1;

    IF @CostPrice <= 0 OR @SalePrice <= 0
        THROW 50002, 'Cost and sale price must be greater than zero.', 1;

    IF @StockQuantity < 0
        THROW 50003, 'Stock quantity cannot be negative.', 1;

    INSERT INTO Product (prodName, prodDescription, prodImage, costPrice, salePrice, stockQuantity)
    VALUES (@ProdName, @ProdDescription, @ProdImage, @CostPrice, @SalePrice, @StockQuantity);

    SELECT
        SCOPE_IDENTITY() AS prodID,
        @ProdName         AS prodName,
        @ProdDescription  AS prodDescription,
        @ProdImage        AS prodImage,
        @CostPrice        AS costPrice,
        @SalePrice        AS salePrice,
        @StockQuantity    AS stockQuantity;
END;
GO
