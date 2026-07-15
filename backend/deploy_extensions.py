"""Deploy schema extensions and new stored procedures for POS features."""
import os
from pathlib import Path

from database import get_connection, get_db, call_procedure, rows_to_dicts

SQL_DIR = Path(__file__).parent / "sql"

PROC_FILES = [
    "usp_CreateProduct.sql",
    "usp_GetAllSuppliers.sql",
    "usp_CreateSupplier.sql",
    "usp_UpdateSupplier.sql",
    "usp_DeleteSupplier.sql",
    "usp_GetAllSalesPersons.sql",
    "usp_CreateSalesPerson.sql",
    "usp_DeleteSalesPerson.sql",
    "usp_CreateGRN.sql",
    "usp_GetAllGRNs.sql",
    "usp_GetGRNDetail.sql",
    "usp_GetInventory_update.sql",
]


def run_sql_file(cursor, path: Path):
    print(f"  Running {path.name}...")
    sql = path.read_text(encoding="utf-8")
    for batch in sql.split("\nGO\n"):
        batch = batch.strip()
        if batch:
            cursor.execute(batch)


def main():
    conn = get_connection()
    conn.autocommit = True
    cursor = conn.cursor()

    schema_path = SQL_DIR / "001_schema_extensions.sql"
    print("Deploying schema extensions...")
    run_sql_file(cursor, schema_path)

    print("Deploying stored procedures...")
    for name in PROC_FILES:
        run_sql_file(cursor, SQL_DIR / name)

    conn.autocommit = False
    conn.close()

    print("Verifying new procedures...")
    with get_db() as conn:
        c = conn.cursor()
        for proc in ["usp_GetAllSuppliers", "usp_GetAllSalesPersons", "usp_GetAllGRNs"]:
            try:
                call_procedure(c, proc)
                rows = rows_to_dicts(c)
                if proc == "usp_GetAllSuppliers":
                    c.nextset()
                    rows_to_dicts(c)
                print(f"  {proc}: OK ({len(rows)} row(s))")
            except Exception as exc:
                print(f"  {proc}: FAILED — {exc}")

    print("Done. Restart the FastAPI backend and refresh the frontend.")


if __name__ == "__main__":
    main()
