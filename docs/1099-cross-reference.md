# 1099 Form Cross-Reference & Troubleshooting Guide

**Generated:** 2026-01-12
**Purpose:** Quick reference for 1099 form filling with cross-links to official instructions

---

## Form Type Index

| Form | Purpose | Instructions | Key Sections |
|------|---------|--------------|--------------|
| **1099-A** | Acquisition/Abandonment of Secured Property | [i1099ac.pdf](irs-forms/i1099ac.pdf) | Boxes 1-5, Exception Codes |
| **1099-B** | Proceeds from Broker/Barter Transactions | [i1099b.pdf](irs-forms/i1099b.pdf) | Basis Reporting, Short/Long Term |
| **1099-C** | Cancellation of Debt | [i1099ac.pdf](irs-forms/i1099ac.pdf) | Insolvency, Exception Codes |
| **1099-DIV** | Dividends and Distributions | [i1099gi.pdf](irs-forms/i1099gi.pdf) | Section 199A dividends |
| **1099-INT** | Interest Income | [i1099gi.pdf](irs-forms/i1099gi.pdf) | OID, CDO, ABP |
| **1099-NEC** | Nonemployee Compensation | [i1099gi.pdf](irs-forms/i1099gi.pdf) | Box 1 thresholds |
| **1099-OID** | Original Issue Discount | [i1099oid.pdf](irs-forms/i1099oid.pdf) | Stripped bonds, OID rules |
| **1099-MISC** | Miscellaneous Income | [i1099gi.pdf](irs-forms/i1099gi.pdf) | Box 7, 10 thresholds |
| **1099-R** | Distributions from Pensions/Annuities | [i1099gi.pdf](irs-forms/i1099gi.pdf) | IRA codes, withholding |
| **1099-S** | Proceeds from Real Estate | [i1099gi.pdf](irs-forms/i1099gi.pdf) | Gross proceeds, exceptions |
| **W-2G** | Certain Gambling Winnings | [i1099gi.pdf](irs-forms/i1099gi.pdf) | withholding thresholds |
| **1042-S** | Foreign Person's US Income | [i1099gi.pdf](irs-forms/i1099gi.pdf) | NRA withholding |
| **3921** | Stock Transfer from ESPP | [i1099gi.pdf](irs-forms/i1099gi.pdf) | Exercise price, FMV |
| **3922** | ESPP Stock Transfers | [i1099gi.pdf](irs-forms/i1099gi.pdf) | Grant date, FMV |

---

## Common Troubleshooting Scenarios

### Scenario: Which Form to File?

**Question:** I paid an independent contractor. Which form?

| Payment Type | Form | Reference |
|--------------|------|-----------|
| Nonemployee compensation (services) | **1099-NEC** | [i1099gi.pdf, p.5](irs-forms/i1099gi.pdf) |
| Attorney fees (non-employee) | **1099-NEC** | [i1099gi.pdf, p.10](irs-forms/i1099gi.pdf) |
| Rents (business property) | **1099-MISC** | [i1099gi.pdf, p.8](irs-forms/i1099gi.pdf) |
| Royalties (>= $10) | **1099-MISC** | [i1099gi.pdf, p.8](irs-forms/i1099gi.pdf) |
| Medical/health care payments | **1099-MISC** | [i1099gi.pdf, p.8](irs-forms/i1099gi.pdf) |
| Debt cancellation | **1099-C** | [i1099ac.pdf, p.1](irs-forms/i1099ac.pdf) |
| Property acquisition (foreclosure) | **1099-A** | [i1099ac.pdf, p.1](irs-forms/i1099ac.pdf) |
| Broker transactions | **1099-B** | [i1099b.pdf, p.1](irs-forms/i1099b.pdf) |
| Interest payments (>= $10) | **1099-INT** | [i1099gi.pdf, p.6](irs-forms/i1099gi.pdf) |
| Dividends (>= $10) | **1099-DIV** | [i1099gi.pdf, p.6](irs-forms/i1099gi.pdf) |

---

### Scenario: Threshold Requirements

**Question:** Do I need to file? Payment thresholds:

| Form | Minimum Amount | Exceptions |
|------|----------------|------------|
| 1099-NEC | $600 | None |
| 1099-MISC (Rent/Royalty) | $600 | None |
| 1099-INT | $10 (or $600 for trade/business) | [i1099gi.pdf, p.6](irs-forms/i1099gi.pdf) |
| 1099-DIV | $10 (or $600 for trade/business) | [i1099gi.pdf, p.6](irs-forms/i1099gi.pdf) |
| 1099-OID | $10 (or $600 for trade/business) | [i1099oid.pdf, p.1](irs-forms/i1099oid.pdf) |
| 1099-B | Any barter exchange | [i1099b.pdf, p.1](irs-forms/i1099b.pdf) |
| 1099-A | Any acquisition/abandonment | [i1099ac.pdf, p.1](irs-forms/i1099ac.pdf) |
| 1099-C | Any debt cancellation (>= $600) | [i1099ac.pdf, p.1](irs-forms/i1099ac.pdf) |

---

### Scenario: TIN Validation Issues

**Problem:** TIN validation failed. Common causes:

| Error | Cause | Fix |
|-------|-------|-----|
| Invalid format | Wrong format (XX-XXXXXXX vs XXX-XX-XXXX) | Check EIN/SSN format |
| Name mismatch | Payee name doesn't match IRS records | Use exact name from W-9 |
| Missing TCC | No Transmission Control Code | Obtain TCC from IRS IRIS |

**References:**
- TIN Matching Service: [i1099gi.pdf, p.3](irs-forms/i1099gi.pdf)
- TCC Application: IRS IRIS Portal (irs.gov)

---

## Form-Specific References

### 1099-A (Acquisition/Abandonment)

**Key Boxes:**
- Box 1: Date of acquisition
- Box 2: Balance of principal outstanding
- Box 3: Fair market value
- Box 4: Whether borrower personally liable
- Box 5: Description of property

**Troubleshooting:**
| Issue | Location |
|-------|----------|
| Acquisition date definition | [i1099ac.pdf, p.2](irs-forms/i1099ac.pdf) |
| FMV determination methods | [i1099ac.pdf, p.2](irs-forms/i1099ac.pdf) |
| Nonrecourse debt treatment | [i1099ac.pdf, p.3](irs-forms/i1099ac.pdf) |

---

### 1099-B (Broker/Barter)

**Key Boxes:**
- Box 1: Date of sale/exchange
- Box 2: Proceeds
- Box 3: Cost/basis
- Box 4: Accrued market discount
- Box 5: Wash sale loss disallowed

**Troubleshooting:**
| Issue | Location |
|-------|----------|
| Basis reporting requirements | [i1099b.pdf, p.2](irs-forms/i1099b.pdf) |
| Short vs long-term holding | [i1099b.pdf, p.3](irs-forms/i1099b.pdf) |
| Wash sale rules | [i1099b.pdf, p.3](irs-forms/i1099b.pdf) |
| Covered vs noncovered securities | [i1099b.pdf, p.1](irs-forms/i1099b.pdf) |

---

### 1099-C (Cancellation of Debt)

**Key Boxes:**
- Box 1: Date of cancellation
- Box 2: Amount of debt discharged
- Box 3: Interest if included
- Box 4: Description of debt
- Box 5: Whether debtor was personally liable
- Box 6: Identification of debt
- Box 7: Fair market value (FMV)

**Troubleshooting:**
| Issue | Location |
|-------|----------|
| Exception codes (A-H) | [i1099ac.pdf, p.4](irs-forms/i1099ac.pdf) |
| Insolvency exception | [i1099ac.pdf, p.4](irs-forms/i1099ac.pdf) |
| Bankruptcy exclusion | [i1099ac.pdf, p.4](irs-forms/i1099ac.pdf) |
| Qualified principal residence | [i1099ac.pdf, p.5](irs-forms/i1099ac.pdf) |

**1099-C Exception Codes Quick Reference:**
| Code | Meaning |
|------|---------|
| A | Bankruptcy |
| B | Insolvency (outside bankruptcy) |
| C | Qualified farm indebtedness |
| D | Qualified real property business indebtedness |
| E | Qualified principal residence indebtedness |
| F | Certain student loans |
| G | Price reduction after purchase |
| H | Cancellation as gift/bequest |

---

### 1099-OID (Original Issue Discount)

**Key Boxes:**
- Box 1: OID
- Box 2: Adjusted issue price
| Box 3 | OID on U.S. Treasury obligations |
| Box 4 | Investment expenses |
| Box 5 | Other periodic interest |
| Box 6 | Description of debt instrument |
| Box 7 | Accrued OID on strips/coupons |

**Troubleshooting:**
| Issue | Location |
|-------|----------|
| OID calculation method | [i1099oid.pdf, p.1](irs-forms/i1099oid.pdf) |
| Stripped bond rules | [i1099oid.pdf, p.2](irs-forms/i1099oid.pdf) |
| Short-term OID | [i1099oid.pdf, p.3](irs-forms/i1099oid.pdf) |
| Contingent payment debt | [i1099oid.pdf, p.3](irs-forms/i1099oid.pdf) |

---

## Cross-Reference: When Multiple Forms May Apply

### Debt Forgiveness Scenarios

| Scenario | Form(s) Required | Reference |
|----------|-----------------|-----------|
| Foreclosure only | 1099-A | [i1099ac.pdf, p.1](irs-forms/i1099ac.pdf) |
| Foreclosure + deficiency cancellation | 1099-A AND 1099-C | [i1099ac.pdf, p.2](irs-forms/i1099ac.pdf) |
| Short sale (no deficiency) | May require neither | [i1099ac.pdf, p.3](irs-forms/i1099ac.pdf) |
| Abandonment | 1099-A | [i1099ac.pdf, p.1](irs-forms/i1099ac.pdf) |

---

## Filing Requirements Cross-Reference

### Who Must File (General)

From [General Instructions](irs-forms/i1099gi.pdf):

| Filer Status | Required to File |
|--------------|------------------|
| Any trade/business | Yes, if payment thresholds met |
| Tax-exempt organization | Yes |
| Federal/state/local government | Yes |
| Estate/trust | Yes |
| Individual (not in trade/business) | Generally no |

### Electronic Filing Requirements

| Threshold | Required Method |
|-----------|-----------------|
| >= 100 returns in aggregate | FIRE system required |
| >= 10 returns (IRS IRIS) | Must use IRIS |
| Any 1099-B | FIRE system required |

**Reference:** [i1099gi.pdf, p.1](irs-forms/i1099gi.pdf)

---

## Deadlines & Timelines

**For 2025 Tax Year (filed in 2026):**

| Date | Requirement |
|------|-------------|
| Jan 31, 2026 | Furnish copies to recipients |
| Jan 31, 2026 | File paper forms with IRS (1099-NEC) |
| Jan 31, 2026 | File 1099-B/1099-S statements |
| Feb 15, 2026 | File 1099-B with broker data |
| Feb 28, 2026 | File paper forms with IRS (all except NEC) |
| Mar 31, 2026 | Electronically file all forms |

**Reference:** [i1099gi.pdf, General Instructions](irs-forms/i1099gi.pdf)

---

## Quick Links to Official Resources

| Resource | URL |
|----------|-----|
| IRS IRIS Portal | https://www.irs.gov/e-file |
| FIRE System | https://fire.irs.gov |
| TIN Matching | https://www.irs.gov/tax-professionals/tin-matching |
| Form Instructions | https://www.irs.gov/instructions |
| General Instructions | [i1099gi.pdf](irs-forms/i1099gi.pdf) |

---

## Related Reference Documents

This project includes:

**Audit Standards:**
- [GAO Yellow Book 2024](audit-standards/yellow-book-2024.pdf) - Government Auditing Standards
- [GAO Green Book 2025](audit-standards/green-book-2025.pdf) - Internal Control Standards

**SEC Filing:**
- [EDGAR Filer Manual Vol I](sec-edgar/efm-vol1.pdf) - General Information
- [EDGAR Filer Manual Vol II](sec-edgar/efm-vol2.pdf) - EDGAR Filing

---

## Notes

* This document is a cross-reference guide. Always refer to the official IRS instructions for definitive guidance.
* Forms and thresholds may change annually. Verify current requirements before filing.
* Some GAO/SEC documents downloaded as HTML redirects - use provided web links for access.

---

**EOF**
