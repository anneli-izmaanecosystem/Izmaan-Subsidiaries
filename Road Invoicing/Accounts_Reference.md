# ATG Road Invoicing — Accounts Reference

Last updated: 2026-06-11

This file is the source of truth for known accounts, their canonical names, associated plates, rates, and special handling flags. Update this file when a new account or plate is confirmed.

---

## Account Master

### MANDA (Account 8)
- **Canonical name**: Manda
- **Rate**: R900 (Fixed — "Manda Fixed Rate")
- **Payment method**: Cash at gate (daily)
- **Known plates**:
  - FZV390L — Absolom (driver)
  - FXX383L — Simangalisi / Simangaliso / Benjos (multiple drivers)
  - HJV176L — SS Masindi (driver)
  - HDC895L — (unknown driver)
  - HHG962L — D Ncube (driver)
  - ML64GYGP — Kabelo Muhapi / Thuso Makatu (multiple drivers)
  - JC49VSGP — (Costa / Manda — verify per trip)
  - HFV181L — Dqbid (possible Manda — verify)
  - FWM098L — Lucas (possible Manda — verify)
  - HHN724L — Simon (possible Manda — verify)
- **Note**: Any NO ACCOUNT vehicle entering at unusual hours (04:00–07:00) clustered with known Manda plates may be Manda — flag with "MANDA? communicate with Anneli."
- **ATG Account Holder field**: "8 Manda"

---

### TAVENGWA (ACC-004)
- **Canonical name**: Tavengwa
- **Rate**: R700 (Fixed — "Fixed Rate")
- **Payment method**: Invoice (monthly)
- **Known plates**: KS60VZGP
- **ATG Account Holder field**: May appear as "Tavengwa" or similar

---

### TEMBANI
- **Canonical name**: Tembani
- **Rate**: R80 (No Load — personal vehicle)
- **Payment method**: Invoice
- **Known plates**:
  - HKM457L — NF Simata (driver)
  - KN42ZBGP — (unknown driver)
  - DWH188L — (unknown driver)
- **Flag**: Always add `| Tembani personal vehicle — verify before invoicing.` to Notes
- **Note**: Ghost exits for HKM457L have occurred — if orphan OUT for this plate, apply Tembani rules and invoice at R80

---

### AGREEMENT (ACC-008 / Manda-associated)
- **Canonical name**: Agreement
- **Rate**: R80 (No Load — verify rate per trip)
- **Payment method**: Invoice
- **Known plates**: HNT674L (driver: B Vundla)
- **Flag**: Always add `⚠ Agreement account — verify rate with Anneli.` to Notes

---

### TONGAI (ACC-009)
- **Canonical name**: Tongai
- **Rate**: Standard by vehicle type
- **Known plates**: KKJ657MP (driver: Tongai), HDC898L (driver: Tawanda — Multiple Drivers account)
- **Note**: HDC898L is a "Multiple Drivers" plate — Tongai / Tawanda / Papuranga. Use driver name from Custom Fields as secondary identifier.

---

### TEBOGO SEAKAMELA
- **Canonical name**: Tebogo Seakamela
- **Rate**: Standard by vehicle type
- **Known plates**: LFJ542MP, HNF568L
- **Flag**: LFJ542MP — `⚠ FLAG: entering under wrong name. Consider blocking this numberplate.`
- **Note**: Often enters without IN scan (border road entry). If exit-only, still invoice.

---

### RODRICK ZINYENGE
- **Canonical name**: Rodrick Zinyenge
- **Rate**: R1000 standard (2A Bakkie Full), but often invoiced at R80 — check notes
- **Known plates**: LZ93KVGP
- **Note**: This plate makes multiple trips per day. Check for duplicates. Rate may be R80 (escort) on some trips.

---

### OWEN MOKWENA
- **Canonical name**: Owen Mokwena
- **Rate**: R750 (agreed rate — not standard R1000)
- **Known plates**: HJD434L

---

### MOHAMED WASILI (Account 11)
- **Canonical name**: Mohamed Wasili
- **ATG Account Holder field**: "11 Mohamed Wasili"
- **Known plates**: HJY062L (RSA License)
- **Rate**: Standard by vehicle type

---

## Plate-to-Account Quick Lookup

| Plate | Canonical Account | Rate | Notes |
|---|---|---|---|
| FZV390L | Manda | R900 | Absolom driver |
| FXX383L | Manda | R900 | Multiple drivers |
| HJV176L | Manda | R900 | SS Masindi driver |
| HDC895L | Manda | R900 | |
| HHG962L | Manda | R900 | D Ncube driver |
| ML64GYGP | Manda | R900 | Multiple drivers |
| KS60VZGP | Tavengwa | R700 | |
| HKM457L | Tembani | R80 | Personal vehicle |
| KN42ZBGP | Tembani | R80 | Personal vehicle |
| DWH188L | Tembani | R80 | Personal vehicle |
| HNT674L | Agreement | R80 | Verify rate |
| LFJ542MP | Tebogo Seakamela | Standard | FLAG — wrong name entry |
| HNF568L | Tebogo Seakamela | Standard | Often border road entry |
| LZ93KVGP | Rodrick Zinyenge | R1000/R80 | Check per trip |
| HJD434L | Owen Mokwena | R750 | Agreed rate |
| HDC898L | Tongai (Multiple) | Standard | Check driver per trip |
| KKJ657MP | Tongai | Standard | |
| HJY062L | Mohamed Wasili | Standard | RSA license |

---

## Customer Name Deduplication Notes

Common inconsistencies to watch for:
- `Rodrick` / `Rodrick Zinyenge` / `rodrick` → canonical: **Rodrick Zinyenge**
- `Owen` / `Owen Mokwena` / `owen mokwena` → canonical: **Owen Mokwena**
- `Jimmy Ndou` / `ndou jimmy` / `Jimy` → canonical: **Jimmy Ndou**
- `Tebogo Seakamela` / `Tebogo` / `TEBZA` → canonical: **Tebogo Seakamela**
- `Simangalisi` / `simangaliso` / `Simangaliso` → canonical: **Simangalisi** (Manda)
- `Lyton Mbeezi` / `Lyton` / `lyton mbeezi` → canonical: **Lyton Mbeezi**
- `Mohamed Wasili` / `M WASILI` → canonical: **Mohamed Wasili**

**Rule**: When QBO shows variants of the same customer name, always use the canonical name from this list. When unsure, use the most complete name (first + last).

---

## Blocked / Flagged Plates

| Plate | Reason | Action |
|---|---|---|
| LFJ542MP | Entering under wrong name (Tebogo Seakamela) | Flag in notes; escalate to Mara |
| HNF568L | Multiple ghost exits | Flag in notes |
| HKM457L | Ghost exits (Tembani vehicle) | Still invoice at R80 as Tembani |

---

## Rate Table (Standard)

| Vehicle Type (ATG) | QBO Item Name | Rate |
|---|---|---|
| 2A Bakkie Full | 2A Bakkie Full | R1,000 |
| 2B Bakkie Half Load | 2B Bakkie Half Load | R500 |
| 3A Truck (3 Ton) Full | 3A Truck (3 Ton) Full | R1,500 |
| 4A Truck HMV (>3 Ton) Full | 4A Truck HMV (>3 Ton) Full | R2,000 |
| NO LOAD | No Load | R80 |
| 1 Small Bakkie | 1 Small Bakkie | R750 |
| 2 Small Car | 2 Small Car | R300 |
| Escort | No Load | R80 |

**Trailer surcharge**: R500 additional — flag for manual confirmation, do not auto-apply.
