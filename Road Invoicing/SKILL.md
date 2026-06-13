# ATG Road Invoicing Skill

## Purpose
Convert a raw ATG gate scan CSV export into a QBO-ready invoice CSV + customer list CSV. Also match Trevor's WhatsApp cash list to determine which trips were paid at the gate.

## Trigger
User uploads or pastes an ATG CSV file and optionally provides Trevor's WhatsApp cash list. User may also provide a starting invoice number (default: ask or continue from last batch).

---

## Step 0 — Gather inputs

Ask the user for (if not already provided):
1. **ATG CSV file** — the gate scan export (columns: Type, License, Name, Company, Custom Fields, Connected Custom Fields, Creation date, Connected Entrance/Exit, Duration, Device Name, App profile)
2. **Trevor's WhatsApp cash list** — paste the raw text (format: `DRIVER PLATE-RAMOUNT`, date header per day)
3. **Starting invoice number** — e.g. `2684` (continue from last batch)
4. **Batch date range** — confirm which dates this batch covers

---

## Step 1 — Load and parse the ATG CSV

Run `process_atg.py` (or equivalent pandas code). Key parsing rules:

### ATG CSV structure
- Column 0: `Type` → `in` or `out`
- Column 1: `License` → vehicle plate, uppercase, strip spaces
- Column 2: `Name` → sometimes has account holder name (RSA license scan)
- Column 4: `Custom Fields` → comma-separated key:value pairs (see below)
- Column 5: `Connected Custom Fields` → exit notes (e.g. "Exit Type: Empty on Exit")
- Column 6: `Creation date` → format `HH:MM DD/MM/YYYY`
- Column 7: `Connected Entrance/Exit` → exit datetime paired to this IN scan (same format)
- Column 8: `Duration` → e.g. "1 hour", "1 day"

### Parsing Custom Fields
Format: `"Cell Number: 0824518956, Driver Name Surname: shingiri, Type of License: Foreign License, Account Holder Name: 1 NO ACCOUNT, Vehicle Type: 4A Truck HMV (>3 Ton) Full, Trailer: no"`

Extract:
- `Cell Number` → phone
- `Driver Name Surname` → driver
- `Account Holder Name` → account (strip leading number prefix: "8 Manda" → "Manda")
- `Vehicle Type` → used for rate lookup
- `Trailer` → yes/no (trailer surcharge: +R500 if yes — flag for manual review)
- `Type of License` → RSA or Foreign (informational)
- `Drivers License Scan` → RSA license holder name (use as fallback for customer name)

---

## Step 2 — Resolve customer name

**Priority order (use first non-empty, non-NO ACCOUNT value):**

1. `Account Holder Name` from Custom Fields — strip leading `\d+ ` prefix
   - Skip if contains "NO ACCOUNT"
2. Driver Name Surname from Custom Fields (title case)
3. Drivers License Scan from Custom Fields (title case, RSA licenses only)
4. `Name` column from CSV (title case)
5. **Licence plate** (final fallback)

**Known account name corrections** (see Accounts_Reference.md for full list):
- Names are often inconsistent across batches — match against the canonical list
- If a plate is in a known account's plate list, use the canonical account name

---

## Step 3 — Resolve rate and item

### Standard rates

| Vehicle Type | Item Label | Rate |
|---|---|---|
| 2A Bakkie Full | 2A Bakkie Full | R1,000 |
| 2B Bakkie Half Load | 2B Bakkie Half Load | R500 |
| 3A Truck (3 Ton) Full | 3A Truck (3 Ton) Full | R1,500 |
| 4A Truck HMV (>3 Ton) Full | 4A Truck HMV (>3 Ton) Full | R2,000 |
| NO LOAD | No Load | R80 |
| 1 Small Bakkie | 1 Small Bakkie | R750 |
| 2 Small Car | 2 Small Car | R300 |

### Special account overrides (check BEFORE standard rates)

| Account | Rate | Item | Notes |
|---|---|---|---|
| Manda | R900 | Manda Fixed Rate | Multiple plates — see Accounts_Reference.md |
| Tavengwa | R700 | Fixed Rate | Plate KS60VZGP |
| Agreement | R80 | No Load | Plate HNT674L (B VUNDLA) — flag: ⚠ verify rate |
| Tembani | R80 | No Load | Multiple plates — flag: personal vehicle, verify |
| Escort trips | R80 | No Load | Any NO LOAD vehicle escorting a convoy |

### Trailer surcharge
If `Trailer: yes` — add a note: `⚠ Trailer detected — verify if R500 surcharge applies.`
Do NOT automatically add R500; flag for manual review.

---

## Step 4 — Classify trip type

| Condition | Trip Type |
|---|---|
| Has IN scan + Connected OUT datetime | Full Trip |
| Has IN scan, no Connected OUT | Single Trip (ℹ No OUT scan recorded) |
| Has OUT scan only (no IN in this batch) | Orphan OUT / Ghost Exit |
| Exit Type in Connected Custom Fields = "Empty on Exit" | Note: exited empty |

### Orphan OUT (ghost exits)
`out` rows with no paired `in` in this batch:
- Include in output with Trip Type = "Single Trip"
- Customer = blank unless identifiable from prior knowledge
- Flag: `👻 Orphan OUT — ghost exit. ❌ No cash received.`
- Give a numbered invoice row (not "Cash")

### Failed trips
If a trip is explicitly noted as a failed trip (e.g. exit with full load when loaded entry expected):
- Set InvoiceNo = blank
- Trip Type = "FAILED TRIP"
- Note: `⚠ FAILED TRIP — Do not invoice.`
- Do NOT include in the totals

---

## Step 5 — Parse Trevor's WhatsApp cash list

Format example:
```
7 June 2026 TAWAS HDC 898-R1000
CLADI FYK 198-R1000
ABSOLOM FZV 390-R900
BENJOSFXX 383-R900
TONGAI KKJ 657-R1500
MAMBANJE BL 52 DK -R500
ROBERT -MB91 WK-R1000
```

### Parsing rules
1. **Date line**: matches `D MMMM YYYY` — sets the date context for following entries
2. **Trip line**: everything before `-R` is driver+plate, after `-R` is amount
3. **Normalize plate fragment**: strip all spaces and dashes → uppercase
   - "HDC 898" → "HDC898"
   - "BL 52 DK" → "BL52DK"
   - "FXX 383" (with driver "BENJOS" prepended) → "BENJOSFXX383"

### Matching algorithm
For each ATG `in` trip, check all unmatched cash entries:
1. Normalize ATG plate: strip spaces → uppercase → strip trailing alpha suffix
   - "HDC898L" → "HDC898"
   - "VNJ823GP" → "VNJ823"
   - "BL52DKGP" → "BL52DK"
   - "MK14LJGP" → "MK14LJ"
2. Check: `cash_normalized_string.contains(stripped_plate)`
3. If match → cash confirmed, mark entry as used
4. Minimum plate fragment length: 4 chars (to avoid false matches)

### Cash match outcomes
- **Exact amount**: `💵 Cash R{amount} confirmed.`
- **Shortfall** (paid < rate): `💵 Cash R{paid} paid. Rate R{rate}. ⚠ Shortfall R{rate-paid}.`
- **Overpayment** (paid > rate): `💵 Cash R{paid} paid. Rate R{rate}. 💰 Overpayment R{paid-rate}.`
- **No match**: `❌ No cash match — invoice outstanding.`

### Unmatched cash entries
After processing all trips, report any cash entries that didn't match an ATG trip:
- May be from previous batch (IN scan was in prior export)
- May be a ghost entry (exited without entry scan)
- Report as a warning list at the bottom — do NOT auto-create invoice rows for these

---

## Step 6 — Build output rows

### Output columns (in order)
```
InvoiceNo | Customer | InvoiceDate | Terms | Item | Qty | Rate | Amount | TaxCode | ServiceDate | Description | Phone | [empty] | Licence | Driver | IN DateTime | OUT DateTime | Trip Type | Notes / Flags
```

- **InvoiceNo**: `"Cash"` for cash trips; sequential number for invoiced trips; blank for FAILED TRIPs
- **Customer**: resolved name (Step 2)
- **InvoiceDate**: date of IN scan (MM/DD/YYYY for QBO)
- **Terms**: `Due on receipt`
- **Item**: vehicle type label (Step 3)
- **Qty**: `1`
- **Rate**: standard or override rate (Step 3)
- **Amount**: cash amount if paid; equals Rate if invoiced
- **TaxCode**: `EX`
- **ServiceDate**: same as InvoiceDate
- **Description**: `PLATE | driver_name | IN: DD/MM/YYYY HH:MM | OUT: DD/MM/YYYY HH:MM`
  - Use lowercase for driver name in description
  - Leave OUT blank if no exit scan
- **Phone**: Cell Number from Custom Fields
- **[empty]**: blank separator column
- **Licence**: plate
- **Driver**: title case driver name
- **IN DateTime**: `DD/MM/YYYY HH:MM`
- **OUT DateTime**: `DD/MM/YYYY HH:MM` (blank if none)
- **Trip Type**: Full Trip / Single Trip / FAILED TRIP
- **Notes / Flags**: see Step 5 + additional flags below

### Additional flags to add to Notes
- Trailer: `⚠ Trailer detected — verify R500 surcharge.`
- Tembani plate: `| Tembani personal vehicle — verify before invoicing.`
- Agreement plate: `⚠ Agreement account — verify rate with Anneli.`
- Possible Manda (NO ACCOUNT but queued at unusual hours with Manda plates): `MANDA? communicate with Anneli.`
- No OUT scan: append `ℹ No OUT scan recorded.`

### Output section order
**Section 1 — Cash rows** (InvoiceNo = "Cash")
- Sorted by ServiceDate ascending, then IN DateTime

**Section 2 — Invoice rows** (numbered invoices)
- Sorted by ServiceDate ascending, then IN DateTime
- Invoice numbers assigned sequentially starting from user-provided starting number

---

## Step 7 — Build customer list

For each unique customer encountered, record:
- **Customer** (canonical name)
- **Phone** (first phone seen for this customer)
- **Plates** (all plates associated with this customer, pipe-separated)
- **Trip Count**
- **Account Type**: Cash / Invoice / Mixed

Use lowercase key for deduplication. Merge records when plates match known accounts from Accounts_Reference.md.

Output as separate CSV: `{batch_name}_Customer_List.csv`

---

## Step 8 — Output files

Generate two CSV files:
1. **`{date_range}_QBO_Invoices.csv`** — ready for QBO import (Section 1 cash, then Section 2 invoices)
2. **`{date_range}_Customer_List.csv`** — deduplicated customer master

Also print a **summary** in chat:
```
Batch: [date range]
─────────────────────────────
Total trips processed:    XX
Cash confirmed:           XX  (R{total})
Invoices outstanding:     XX  (R{total})
Unmatched cash entries:   XX  ← review these
Ghost exits flagged:      XX
Trips with no OUT scan:   XX
Trailer flags:            XX
─────────────────────────────
Starting invoice#: XXXX
Ending invoice#:   XXXX
```

---

## Special account rules quick reference

See `Accounts_Reference.md` for full details.

| Account | Plates | Rate | Flag |
|---|---|---|---|
| Manda | FZV390L, FXX383L, HJV176L, HDC895L + others | R900 | None |
| Tavengwa | KS60VZGP | R700 | None |
| Tembani | HKM457L, KN42ZBGP, DWH188L | R80 | Personal vehicle — verify |
| Agreement | HNT674L | R80 | Verify rate |
| Tebogo Seakamela | LFJ542MP | Standard | FLAG: entering under wrong name — consider block |

---

## Error handling

| Situation | Action |
|---|---|
| Vehicle type not in rate table | Use R1000 default, flag: `⚠ Unknown vehicle type — defaulted to R1000` |
| No driver name AND no account AND no CSV name | Use plate as customer name |
| Cash amount = 0 or unparseable | Skip cash entry, log as parse error |
| Plate fragment too short to match reliably | Skip matching, log warning |
| Duplicate IN scans for same plate on same day | Flag both: `⚠ Possible duplicate scan — verify` |
