"""
ATG Road Invoicing Processor
Run this in Co-work after uploading the ATG CSV and providing the cash list.

Usage:
    1. Set ATG_FILE to the uploaded file path
    2. Paste Trevor's WhatsApp cash list into CASH_LIST (triple-quoted string)
    3. Set STARTING_INVOICE_NO to continue from last batch
    4. Run the script — it will produce two CSV files

Output:
    {batch}_QBO_Invoices.csv  — import directly into QBO
    {batch}_Customer_List.csv — deduplicated customer master
"""

import pandas as pd
import re
import os
from datetime import datetime

# ─── CONFIGURATION ────────────────────────────────────────────────────────────

ATG_FILE          = "2026_06_08_09_45.csv"   # ← change to uploaded filename
STARTING_INVOICE  = 2684                      # ← continue from last batch
BATCH_NAME        = "08Jun2026"               # ← used in output filenames

CASH_LIST = """
7 June 2026 TAWAS HDC 898-R1000
CLADI FYK 198-R1000
JIMY HLB 738-R1000
RUBEN DMG 491-R1000
DRYSEN CH 04 WW-R1000
PHATHU HFX 369-R1000
PEDZISAI XJD 345-R1000
ABSOLOM FZV 390-R900
BENJOSFXX 383-R900
TONGAI KKJ 657-R1500
TAFADZWA DVK 880-R1500
THAPELO VNJ823-R1500
BRIGHTON MK 14 LJ-R1000
MANDLA DTN 568-R1000
VINCENT MF 31 YN-R1000
MAMBANJE BL 52 DK -R500
ROBERT -MB91 WK-R1000
"""  # ← replace with Trevor's list for each batch

# ─── RATES ────────────────────────────────────────────────────────────────────

VEHICLE_RATES = {
    "2A Bakkie Full":              1000,
    "2B Bakkie Half Load":          500,
    "3A Truck (3 Ton) Full":       1500,
    "4A Truck HMV (>3 Ton) Full":  2000,
    "NO LOAD":                       80,
    "1 Small Bakkie":               750,
    "2 Small Car":                  300,
}

# Account overrides: lowercase account name → (rate, item_label)
ACCOUNT_OVERRIDES = {
    "manda":    (900,  "Manda Fixed Rate"),
    "tavengwa": (700,  "Fixed Rate"),
    "agreement":(80,   "No Load"),
    "tembani":  (80,   "No Load"),
}

# Plate-to-account lookup (uppercase plate → canonical account name)
PLATE_ACCOUNTS = {
    "FZV390L":  "Manda",    "FXX383L":  "Manda",   "HJV176L": "Manda",
    "HDC895L":  "Manda",    "HHG962L":  "Manda",   "ML64GYGP":"Manda",
    "KS60VZGP": "Tavengwa",
    "HKM457L":  "Tembani",  "KN42ZBGP": "Tembani", "DWH188L": "Tembani",
    "HNT674L":  "Agreement",
    "HJD434L":  "Owen Mokwana",   # agreed rate R750
}

# Plates with special flags
PLATE_FLAGS = {
    "LFJ542MP":  "⚠ FLAG: entering under wrong name. Consider blocking.",
    "HNF568L":   "⚠ Multiple ghost exits on record.",
    "HKM457L":   "| Tembani personal vehicle — verify before invoicing.",
    "KN42ZBGP":  "| Tembani personal vehicle — verify before invoicing.",
    "DWH188L":   "| Tembani personal vehicle — verify before invoicing.",
    "HNT674L":   "⚠ Agreement account — verify rate with Anneli.",
    "LZ93KVGP":  "| Check: escort or standard trip?",
}

# Owen Mokwana agreed rate
PLATE_RATE_OVERRIDE = {
    "HJD434L": (750, "2A Bakkie Full"),
}

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def parse_custom_fields(raw):
    """Parse 'Key: Value, Key: Value' string into dict."""
    result = {}
    if not raw or pd.isna(raw):
        return result
    for pair in str(raw).split(", "):
        idx = pair.find(": ")
        if idx == -1:
            continue
        key = pair[:idx].strip().lower()
        val = pair[idx+2:].strip()
        result[key] = val
    return result

def title_case(s):
    return " ".join(w.capitalize() for w in str(s).split()) if s else ""

def resolve_customer(cf, csv_name, plate):
    """Resolve customer name from custom fields with fallback chain."""
    # 1. Plate-to-account lookup (highest priority for known accounts)
    if plate.upper() in PLATE_ACCOUNTS:
        return PLATE_ACCOUNTS[plate.upper()]
    # 2. Account Holder Name (strip leading number prefix)
    acct = cf.get("account holder name", "")
    clean_acct = re.sub(r"^\d+\s+", "", acct).strip()
    if clean_acct and "NO ACCOUNT" not in clean_acct.upper():
        return title_case(clean_acct)
    # 3. Driver Name Surname
    driver = cf.get("driver name surname", "")
    if driver:
        return title_case(driver)
    # 4. Drivers License Scan (RSA)
    scan = cf.get("drivers license scan", "")
    if scan:
        return title_case(scan)
    # 5. CSV Name column
    if csv_name and str(csv_name).strip():
        return title_case(str(csv_name).strip())
    # 6. Plate
    return plate.upper()

def resolve_rate(cf, customer, plate):
    """Resolve (rate, item) with account and plate overrides."""
    p_up = plate.upper()
    # Plate-specific rate override
    if p_up in PLATE_RATE_OVERRIDE:
        return PLATE_RATE_OVERRIDE[p_up]
    # Account override
    for key, (rate, item) in ACCOUNT_OVERRIDES.items():
        if key in customer.lower():
            return (rate, item)
    # Standard vehicle type
    vtype = cf.get("vehicle type", "")
    rate = VEHICLE_RATES.get(vtype, 1000)
    if vtype not in VEHICLE_RATES:
        vtype = vtype or "Unknown"
    return (rate, vtype)

def parse_atg_date(raw):
    """Parse 'HH:MM DD/MM/YYYY' → (datetime_str SA, qbo_date MM/DD/YYYY)."""
    if not raw or pd.isna(raw):
        return ("", "")
    raw = str(raw).strip()
    m = re.match(r"^(\d{2}:\d{2})\s+(\d{2})/(\d{2})/(\d{4})$", raw)
    if not m:
        return (raw, "")
    time_, dd, mm, yyyy = m.groups()
    dt_sa  = f"{dd}/{mm}/{yyyy} {time_}"
    qbo_dt = f"{mm}/{dd}/{yyyy}"
    return (dt_sa, qbo_dt)

# ─── CASH LIST PARSER ─────────────────────────────────────────────────────────

def parse_cash_list(text):
    """Parse Trevor's WhatsApp cash list into list of dicts."""
    entries = []
    current_date = ""
    for raw_line in text.replace("\r\n", "\n").split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        # Date header: "7 June 2026" or "7 June 2026 DRIVER PLATE-R1000"
        date_m = re.match(r"^(\d{1,2}\s+\w+\s+\d{4})\s*(.*)?$", line)
        if date_m and not re.search(r"-\s*R\d+", date_m.group(1)):
            current_date = date_m.group(1)
            rest = (date_m.group(2) or "").strip()
            if rest:
                _parse_cash_line(rest, current_date, entries)
            continue
        if re.search(r"-\s*R\d+", line, re.IGNORECASE):
            _parse_cash_line(line, current_date, entries)
    return entries

def _parse_cash_line(line, date, out):
    cleaned = re.sub(r"^\s*-\s*", "", line).strip()
    idx = re.search(r"-\s*R", cleaned, re.IGNORECASE)
    if not idx:
        return
    driver_plate = cleaned[:idx.start()].strip()
    amount_str   = cleaned[idx.end():].strip()
    try:
        amount = int(re.sub(r"\D", "", amount_str))
    except:
        return
    if amount <= 0 or not driver_plate:
        return
    norm = re.sub(r"[\s\-]", "", driver_plate).upper()
    out.append({"raw": cleaned, "norm": norm, "amount": amount, "date": date, "used": False})

def strip_plate_suffix(plate):
    """Strip trailing alpha chars: 'HDC898L' → 'HDC898', 'VNJ823GP' → 'VNJ823'."""
    return re.sub(r"[A-Z]+$", "", plate.upper().replace(" ", ""))

def match_cash(plate, cash_entries):
    """Find first unused cash entry whose norm contains the stripped plate."""
    stripped = strip_plate_suffix(plate)
    if len(stripped) < 4:
        return None
    for entry in cash_entries:
        if not entry["used"] and stripped in entry["norm"]:
            entry["used"] = True
            return entry
    return None

# ─── MAIN PROCESSOR ───────────────────────────────────────────────────────────

def process(atg_file, cash_list_text, starting_invoice, batch_name):
    # Load ATG
    df = pd.read_csv(atg_file, header=0)
    df.columns = [
        "Type","License","Name","Company","CustomFields",
        "ConnectedCustomFields","CreationDate","ConnectedEntranceExit",
        "Duration","DeviceName","AppProfile"
    ]

    # Parse cash list
    cash = parse_cash_list(cash_list_text)

    # Filter 'in' rows (primary trips)
    in_df  = df[df["Type"].str.strip().str.lower() == "in"].copy()
    out_df = df[df["Type"].str.strip().str.lower() == "out"].copy()

    # Build set of plates that have an 'in' scan (to detect orphan exits)
    in_plates = set(in_df["License"].str.upper().str.strip())

    cash_rows    = []
    invoice_rows = []
    inv_no       = starting_invoice

    # ── Process IN rows ──────────────────────────────────────────────────────
    for _, row in in_df.iterrows():
        plate  = str(row["License"]).strip().upper()
        cf     = parse_custom_fields(row.get("CustomFields"))
        phone  = cf.get("cell number", "")
        driver = cf.get("driver name surname", "") or cf.get("drivers license scan", "") or str(row.get("Name",""))
        trailer= cf.get("trailer", "no").lower() == "yes"

        customer       = resolve_customer(cf, row.get("Name",""), plate)
        rate, item     = resolve_rate(cf, customer, plate)
        in_dt, qbo_dt  = parse_atg_date(row.get("CreationDate",""))
        out_dt, _      = parse_atg_date(row.get("ConnectedEntranceExit",""))
        trip_type      = "Full Trip" if out_dt else "Single Trip"

        # Description
        driver_desc = str(driver).lower().strip() if driver else ""
        desc_parts  = [plate, driver_desc, f"IN: {in_dt}"]
        if out_dt:
            desc_parts.append(f"OUT: {out_dt}")
        description = " | ".join(p for p in desc_parts if p)

        # Cash match
        cash_match = match_cash(plate, cash)
        if cash_match:
            paid   = cash_match["amount"]
            inv_no_col = "Cash"
            amount = paid
            if paid == rate:
                notes = f"💵 Cash R{paid} confirmed."
            elif paid < rate:
                notes = f"💵 Cash R{paid} paid. Rate R{rate}. ⚠ Shortfall R{rate-paid}."
            else:
                notes = f"💵 Cash R{paid} paid. Rate R{rate}. 💰 Overpayment R{paid-rate}."
        else:
            inv_no_col = None  # will be assigned invoice number later
            amount     = rate
            notes      = "❌ No cash match — invoice outstanding."

        # Extra flags
        if not out_dt:
            notes += " ℹ No OUT scan recorded."
        if trailer:
            notes += " ⚠ Trailer detected — verify R500 surcharge."
        if plate in PLATE_FLAGS:
            notes += " " + PLATE_FLAGS[plate]

        out_row = {
            "InvoiceNo":   inv_no_col,
            "Customer":    customer,
            "InvoiceDate": qbo_dt,
            "Terms":       "Due on receipt",
            "Item":        item,
            "Qty":         1,
            "Rate":        rate,
            "Amount":      amount,
            "TaxCode":     "EX",
            "ServiceDate": qbo_dt,
            "Description": description,
            "Phone":       phone,
            "_sep":        "",
            "Licence":     plate,
            "Driver":      title_case(driver),
            "IN DateTime": in_dt,
            "OUT DateTime":out_dt,
            "Trip Type":   trip_type,
            "Notes / Flags": notes.strip(),
        }

        if inv_no_col == "Cash":
            cash_rows.append(out_row)
        else:
            invoice_rows.append(out_row)

    # ── Process orphan OUT rows (ghost exits) ────────────────────────────────
    for _, row in out_df.iterrows():
        plate = str(row["License"]).strip().upper()
        if plate in in_plates:
            continue  # already handled as part of IN row
        out_dt, qbo_dt = parse_atg_date(row.get("CreationDate",""))
        desc = f"{plate} |  | IN: — | OUT: {out_dt}"
        flags = PLATE_FLAGS.get(plate, "")

        # Check if a cash entry matches this ghost exit
        cash_match = match_cash(plate, cash)
        if cash_match:
            paid      = cash_match["amount"]
            inv_no_col = "Cash"
            amount    = paid
            ghost_notes = f"💵 Cash R{paid} confirmed. 👻 Ghost exit (no IN scan in batch)."
        else:
            inv_no_col = None
            amount    = 80  # default for ghost exits
            ghost_notes = "👻 Orphan OUT — ghost exit. ❌ No cash received."

        if flags:
            ghost_notes += " " + flags

        # Try to get customer from plate lookup
        customer = PLATE_ACCOUNTS.get(plate, plate)

        ghost_row = {
            "InvoiceNo":   inv_no_col,
            "Customer":    customer,
            "InvoiceDate": qbo_dt,
            "Terms":       "Due on receipt",
            "Item":        "No Load",
            "Qty":         1,
            "Rate":        amount,
            "Amount":      amount,
            "TaxCode":     "EX",
            "ServiceDate": qbo_dt,
            "Description": desc,
            "Phone":       "",
            "_sep":        "",
            "Licence":     plate,
            "Driver":      "",
            "IN DateTime": "",
            "OUT DateTime": out_dt,
            "Trip Type":   "Single Trip",
            "Notes / Flags": ghost_notes.strip(),
        }
        if inv_no_col == "Cash":
            cash_rows.append(ghost_row)
        else:
            invoice_rows.append(ghost_row)

    # ── Assign invoice numbers ────────────────────────────────────────────────
    for r in invoice_rows:
        r["InvoiceNo"] = str(inv_no)
        inv_no += 1

    # ── Build output DataFrame ────────────────────────────────────────────────
    all_rows = cash_rows + invoice_rows
    cols = [
        "InvoiceNo","Customer","InvoiceDate","Terms","Item","Qty","Rate","Amount",
        "TaxCode","ServiceDate","Description","Phone","_sep",
        "Licence","Driver","IN DateTime","OUT DateTime","Trip Type","Notes / Flags"
    ]
    out_df_final = pd.DataFrame(all_rows, columns=cols)
    out_df_final.rename(columns={"_sep": ""}, inplace=True)

    invoice_csv = f"{batch_name}_QBO_Invoices.csv"
    out_df_final.to_csv(invoice_csv, index=False)
    print(f"✓ Invoice CSV → {invoice_csv}")

    # ── Build customer list ───────────────────────────────────────────────────
    cust_map = {}
    for r in all_rows:
        key = r["Customer"].lower().strip()
        if key not in cust_map:
            cust_map[key] = {"Customer": r["Customer"], "Phone": r.get("Phone",""), "Plates": set(), "Trips": 0}
        cust_map[key]["Plates"].add(r["Licence"])
        cust_map[key]["Trips"] += 1
        if not cust_map[key]["Phone"] and r.get("Phone"):
            cust_map[key]["Phone"] = r["Phone"]

    cust_rows = [{
        "Customer":   v["Customer"],
        "Phone":      v["Phone"],
        "Plates":     " | ".join(sorted(v["Plates"])),
        "Trip Count": v["Trips"],
    } for v in sorted(cust_map.values(), key=lambda x: x["Customer"])]

    cust_df  = pd.DataFrame(cust_rows)
    cust_csv = f"{batch_name}_Customer_List.csv"
    cust_df.to_csv(cust_csv, index=False)
    print(f"✓ Customer CSV → {cust_csv}")

    # ── Summary ───────────────────────────────────────────────────────────────
    unmatched = [e for e in cash if not e["used"]]
    ghost_count = sum(1 for r in all_rows if "👻" in r["Notes / Flags"])
    no_out      = sum(1 for r in all_rows if "ℹ No OUT" in r["Notes / Flags"])
    trailer_fl  = sum(1 for r in all_rows if "⚠ Trailer" in r["Notes / Flags"])
    cash_total  = sum(r["Amount"] for r in cash_rows)
    inv_total   = sum(r["Amount"] for r in invoice_rows)

    print(f"""
Batch: {batch_name}
─────────────────────────────────────────
Total trips processed:    {len(all_rows)}
  Cash confirmed:         {len(cash_rows)}  (R{cash_total:,.0f})
  Invoices outstanding:   {len(invoice_rows)}  (R{inv_total:,.0f})
─────────────────────────────────────────
Unmatched cash entries:   {len(unmatched)}  ← review below
Ghost exits flagged:      {ghost_count}
Trips with no OUT scan:   {no_out}
Trailer flags:            {trailer_fl}
─────────────────────────────────────────
Invoice numbers:  {starting_invoice} → {inv_no - 1}
""")

    if unmatched:
        print("⚠ UNMATCHED CASH ENTRIES (not found in ATG batch):")
        for e in unmatched:
            print(f"   {e['raw']}  →  R{e['amount']}")
        print("   These may be from a previous batch or entry scan was missed.\n")

    return out_df_final, cust_df

# ─── RUN ──────────────────────────────────────────────────────────────────────

invoices_df, customers_df = process(ATG_FILE, CASH_LIST, STARTING_INVOICE, BATCH_NAME)
invoices_df.head()
