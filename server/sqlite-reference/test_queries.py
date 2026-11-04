import re, sqlite3, datetime as dt, pathlib
H = pathlib.Path(__file__).parent
db = sqlite3.connect(":memory:"); db.executescript((H / "schema.sql").read_text())
today = dt.date(2026, 10, 10); d = lambda n: (today - dt.timedelta(days=n)).isoformat()
def variant(pid, name, fabric, cost, stock):
    db.execute("INSERT OR IGNORE INTO products(id,name,fabric_type) VALUES(?,?,?)", (pid, name, fabric))
    return db.execute("INSERT INTO product_variants(product_id,purchase_price,selling_price,current_stock) VALUES(?,?,?,?)", (pid, cost, cost * 2, stock)).lastrowid
A = variant(1, "Dead Saree", "Silk", 1000, 4);  B = variant(2, "Old But Sells", "Cotton", 500, 5)
C = variant(3, "New Linen", "Linen", 200, 10);  D = variant(4, "Dead Two", "Silk", 300, 2);  E = variant(5, "Edge Ninety", "Silk", 100, 3)
for v, qty, age in [(A, 4, 120), (B, 5, 100), (C, 10, 10), (D, 2, 91), (E, 3, 90)]:
    db.execute("INSERT INTO stock_batches(variant_id,quantity_received,purchase_date,remaining_qty) VALUES(?,?,?,?)", (v, qty, d(age), qty))
def sale(ago, v, q, status="paid"):
    i = db.execute("INSERT INTO sales_invoices(invoice_date,status,payment_mode,total) VALUES(?,?,?,?)", (d(ago), status, "Cash", 1)).lastrowid
    db.execute("INSERT INTO sales_items(invoice_id,variant_id,quantity,unit_price) VALUES(?,?,?,?)", (i, v, q, 1))
sale(10, B, 2); sale(3, C, 3); sale(12, C, 4); sale(20, C, 9); sale(2, A, 50, "refunded")   # refunded sale must not count
Q = {m.group(1): m.group(2) for m in re.finditer(r"-- name: (\w+)\n(.*?);\n", (H / "queries.sql").read_text(), re.S)}
run = lambda n: db.execute(Q[n], {"today": today.isoformat()}).fetchall()
dead = run("dead_stock")
assert [r[0] for r in dead] == ["Dead Saree", "Dead Two"], dead      # Edge Ninety (90 d) and Old But Sells (sold) excluded
assert [r[7] for r in dead] == [4000, 600] and [r[5] for r in dead] == [120, 91]
assert run("stuck_capital")[0][0] == 4600
assert run("fast_movers") == [("Linen", 7), ("Cotton", 2)], run("fast_movers")
assert run("inventory_value")[0][0] == 9400
print("SQLite schema and queries OK: dead stock 4600, fast movers Linen 7 / Cotton 2, inventory 9400")
