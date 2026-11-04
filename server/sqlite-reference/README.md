# SQLite reference for Smart Inventory Insights

`schema.sql`, `queries.sql` and `test_queries.py` are the relational version of what the KIRO app now computes in the browser
(stock lots with purchase dates, dead stock over 90 days, top 5 fast-moving fabric types over 14 days, inventory value).
Run the check with `python3 test_queries.py`. It builds a small shop and asserts the results.

Use this when KIRO gets a real database (the PostgreSQL version is the same idea) or if you build the offline desktop
version later (Tauri or Electron plus SQLite). Money is stored in paise.

## If you later build the desktop app
1. Create the repo in Cursor, scaffold Tauri (`npm create tauri-app@latest`) with React + TypeScript + Tailwind.
2. Add a SQLite plugin (tauri-plugin-sql) and run `schema.sql` on first launch.
3. Put each query from `queries.sql` behind one function the dashboard calls; pass today's date as `:today`.
4. Port the three screens from KIRO (Stock Insights, Items with stock age, Billing with GST split).
5. Add a barcode-scanner input (scanners type like a keyboard and press Enter) and sync to the server later.

Not built: the desktop shell itself. Only the schema, the queries and their tests exist here.
