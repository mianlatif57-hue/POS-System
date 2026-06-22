import pyodbc

# --- OPTION A: If you use Windows Authentication ---
CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DESKTOP-LD2JK4A;"  # Double-check if you need \SQLEXPRESS at the end
    "DATABASE=TechShopPOS;"  # Change to your actual DB name
    "Trusted_Connection=yes;"
)

# --- OPTION B: If you use a Username and Password (SQL Server Auth) ---
# CONNECTION_STRING = (
#     "DRIVER={ODBC Driver 17 for SQL Server};"
#     "SERVER=DESKTOP-LD2JK4A;"
#     "DATABASE=TechShopPOS;"
#     "UID=your_username;"
#     "PWD=your_password;"
# )

print("🔄 Attempting to connect to SQL Server...")

try:
    # 1. Test the physical connection pipeline
    conn = pyodbc.connect(CONNECTION_STRING)
    print("✅ Success! Physical connection pipeline established.")
    
    # 2. Test the cursor and execute a test query
    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION;")
    row = cursor.fetchone()
    
    print("\n🖥️ SQL Server Version Details:")
    print(row[0])
    
    # 3. Clean up
    cursor.close()
    conn.close()
    print("\n🔒 Connection safely closed. Everything is working perfectly!")

except Exception as e:
    print("\n❌ Connection Failed!")
    print(f"Error Details:\n{e}")
