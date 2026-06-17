# ============================================================
#  database.py — Database Connection Layer
# ============================================================
# LEARNING NOTE:
# This file is responsible for ONE thing only: connecting Python
# to SQL Server. We use "pyodbc" — a library that lets Python
# talk to any ODBC-compatible database (SQL Server, Oracle, etc.)
#
# We also use a "connection pool" concept: instead of opening a
# new connection for every API request (slow!), we maintain a
# pool of open connections and reuse them.
#
# We DON'T use SQLAlchemy ORM here — we write raw SQL calls
# to stored procedures, which is more transparent for learning.
# ============================================================

import pyodbc
import os
from contextlib import contextmanager

# ============================================================
# CONNECTION STRING
# ============================================================
# LEARNINGNOTE:
# A connection string tells pyodbc HOW to connect:
#   - DRIVER: the SQL Server ODBC driver installed on your machine
#   - SERVER: your SQL Server instance name
#     For a default local install: "localhost" or ".\SQLEXPRESS"
#     For a named instance: "localhost\SQLEXPRESS"
#   - DATABASE: which database to use
#   - Trusted_Connection=yes: use Windows Authentication (no password)
#     If you use SQL Server login, replace with:
#     UID=youruser;PWD=yourpassword
# ============================================================

CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=" + os.getenv("DB_SERVER", r"localhost\SQLEXPRESS") + ";"
    "DATABASE=" + os.getenv("DB_NAME", "TechShopPOS") + ";"
    "Trusted_Connection=yes;"
)

# ============================================================
# CONNECTION POOL (simple version)
# ============================================================
# We create connections lazily — only when first needed.
# For production, you'd use a proper pool library.
# For learning, this simple approach is clearer.
# ============================================================

def get_connection() -> pyodbc.Connection:
    """
    Opens and returns a new database connection.

    LEARNING NOTE:
    pyodbc.connect() opens a TCP socket to SQL Server and
    authenticates. This takes ~10-50ms, so we reuse connections.

    autocommit=False means: SQL changes are NOT saved until
    we explicitly call connection.commit(). This lets us roll back
    if something goes wrong (used inside stored procedures).
    """
    return pyodbc.connect(CONNECTION_STRING, autocommit=False)


@contextmanager
def get_db():
    """
    A context manager that provides a database connection and
    automatically closes it when done — even if an error occurs.

    LEARNING NOTE — What is a context manager?
    It's what powers Python's "with" statement:

        with get_db() as conn:
            # use conn here
        # conn is automatically closed here, even if an error occurred

    The @contextmanager decorator from Python's standard library
    lets us write this as a generator function (using yield).
    Everything before yield = setup. Everything after = teardown.
    """
    conn = get_connection()
    try:
        yield conn         # hand the connection to the caller
        conn.commit()      # if no error, save any pending changes
    except Exception:
        conn.rollback()    # if error, undo any pending changes
        raise              # re-raise so FastAPI returns a 500 error
    finally:
        conn.close()       # ALWAYS close — even if commit/rollback fails


def call_procedure(cursor: pyodbc.Cursor, proc_name: str, params: tuple = ()):
    """
    Helper function: call a stored procedure by name with parameters.

    LEARNING NOTE:
    cursor.execute("{CALL proc_name (?,?,?)}", (val1, val2, val3))
    The "?" are placeholders — pyodbc replaces them safely.
    This prevents SQL injection: no matter what the user types,
    it goes in as data, never executed as SQL code.

    Example usage:
        cursor = conn.cursor()
        call_procedure(cursor, "usp_GetInvoice", (5,))
        row = cursor.fetchone()
    """
    placeholders = ",".join(["?" for _ in params])  # "?,?,?" for 3 params
    sql = f"{{CALL {proc_name} ({placeholders})}}"
    cursor.execute(sql, params)
    return cursor


def rows_to_dicts(cursor: pyodbc.Cursor) -> list[dict]:
    """
    Converts pyodbc rows into Python dictionaries.

    LEARNING NOTE:
    pyodbc returns rows as tuples: (1, 'Ahmed', 62000.00)
    FastAPI needs dictionaries: {"empID": 1, "empName": "Ahmed", ...}
    cursor.description gives us the column names, so we zip
    those names with the values to make a dict.
    """
    if cursor.description is None:
        return []
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]