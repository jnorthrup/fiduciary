# 1099 Filing User Guide

## Overview

The Trust Ledger System provides a streamlined workflow for filing IRS Form 1099 information returns through the IRS Information Returns Intake System (IRIS). This guide walks you through the complete filing process.

## Prerequisites

Before you begin, ensure you have:

- **IRS Transmitter Control Code (TCC)**: Obtained from the IRS for electronic filing
- **Filer Information**: Your organization's EIN, name, and address
- **Payee Information**: Recipient TINs, names, addresses, and payment amounts
- **IRS e-Services Account** (optional): For portal-based authentication

## Step 1: Access the 1099 Filing Wizard

1. Navigate to the **Tax Filing** section in the main menu
2. Click **File 1099** to launch the filing wizard
3. The wizard will guide you through 7 steps to complete your filing

## Step 2: Authentication

Choose your authentication method:

### Option A: TCC Direct Entry
1. Select **"Enter TCC Directly"**
2. Enter your 11-character Transmitter Control Code (format: TXXXXXXXXX)
3. Click **"Authenticate & Continue"**

### Option B: IRS Portal Authentication
1. Select **"Sign In with IRS Portal"**
2. Enter your IRS e-Services username and password
3. Complete two-factor authentication (2FA) when prompted
4. The system will automatically retrieve your TCC

**Note**: Portal authentication provides session management and automatic credential handling.

## Step 3: Filer Information

Enter your organization's information as it appears on your IRS records:

- **Employer Identification Number (EIN)**: Format XX-XXXXXXX
- **Legal Name**: Your registered business name
- **Address**: Complete mailing address including ZIP+4
- **Contact Information**: Phone number and email for IRS correspondence

**Validation**: All fields are validated in real-time. Green checkmarks indicate valid entries.

## Step 4: Form Selection

Choose the 1099 form type you're filing:

- **1099-NEC**: Nonemployee compensation (most common)
- **1099-MISC**: Miscellaneous income
- **1099-INT**: Interest income
- **1099-DIV**: Dividends and distributions
- **Other forms**: See full list in dropdown

**Tip**: If you need to file multiple form types, complete one submission first, then start a new filing.

## Step 5: Payee Entry

Add recipient information for each payee:

### Adding Payees

1. Click **"Add Payee"**
2. Enter payee details:
   - **TIN**: Social Security Number or EIN
   - **Name**: Legal name matching IRS records
   - **Address**: Complete mailing address
   - **Payment Amount**: Total amount for the tax year
   - **Form-specific boxes**: Varies by form type

3. Click **"Validate TIN"** to verify with IRS TIN Matching Service
   - ✓ Green check = Match confirmed
   - ✗ Red X = No match - verify information

4. Click **"Save Payee"**

### Batch Import (Advanced)

For multiple payees:

1. Click **"Import from CSV"**
2. Download the template
3. Fill in payee data
4. Upload completed CSV (maximum 1,000 records)

**Important**: The IRS limits batch submissions to 1,000 payees per file.

## Step 6: Review & Pre-Validation

Review your submission before filing:

### What to Check

- [ ] Filer information is correct
- [ ] All payee TINs are validated
- [ ] Payment amounts are accurate
- [ ] Form boxes are properly filled
- [ ] Total count matches expected payees

### Pre-Transmission Validation

1. Click **"Run Pre-Validation"**
2. The system checks your submission against IRS rules
3. Review any warnings or errors
4. Fix issues before proceeding

**Common Errors**:
- Invalid TIN format
- Missing required fields
- Payment amount thresholds not met
- Duplicate entries

## Step 7: Submit & Track Status

### Submission

1. Review the final summary
2. Click **"Submit to IRS"**
3. Your submission is encrypted and transmitted to IRIS

### Status Tracking

After submission, the system automatically polls for status updates:

- **Queued**: Submission received by IRS
- **Processing**: IRS is validating your file
- **Accepted**: Filing successful ✓
- **Rejected**: Errors found - see details

**Status updates every 5 seconds** until terminal state reached.

### Acceptance Receipt

When accepted, you'll receive:

- **Receipt ID**: Unique identifier for your filing
- **Submission Timestamp**: Date and time of acceptance
- **Record Count**: Number of payees processed

**Save this receipt** for your records. It serves as proof of filing.

### Handling Rejections

If rejected:

1. View the **Error Report** for specific issues
2. Click **"Fix and Resubmit"** to edit your filing
3. Correct the errors identified
4. Resubmit the corrected filing

## Submission History

Access your filing history:

1. Navigate to **Tax Filing > Submission History**
2. View all past filings with:
   - Submission date
   - Form type
   - Status
   - Receipt ID
3. Click any submission to view full details
4. Download receipts as PDF

## Best Practices

### Before Filing Season

- [ ] Verify your TCC is active (renew if expired)
- [ ] Update filer information if business details changed
- [ ] Test with a small batch first
- [ ] Review IRS Publication 1220 (specifications)

### During Filing

- [ ] Validate TINs early to catch errors
- [ ] Keep submission batches under 500 for faster processing
- [ ] File well before deadlines to allow for corrections
- [ ] Save receipts immediately after acceptance

### After Filing

- [ ] Retain receipts for 7 years (IRS requirement)
- [ ] Reconcile accepted count with your records
- [ ] Mail paper copies to payees by deadline
- [ ] Document any rejected submissions and corrections

## Troubleshooting

### Authentication Issues

**Problem**: TCC not accepted
- **Solution**: Verify TCC format (T + 10 digits)
- **Solution**: Check that TCC is active with IRS
- **Solution**: Try portal authentication instead

**Problem**: Portal login fails
- **Solution**: Verify username/password
- **Solution**: Complete 2FA correctly
- **Solution**: Check if IRS e-Services is available

### Validation Errors

**Problem**: TIN doesn't validate
- **Solution**: Verify TIN with payee
- **Solution**: Check for transposition errors
- **Solution**: Ensure name matches IRS records exactly

**Problem**: Pre-validation fails
- **Solution**: Review error messages carefully
- **Solution**: Check IRS specifications for your form type
- **Solution**: Verify all required fields are filled

### Submission Problems

**Problem**: Submission times out
- **Solution**: Check internet connection
- **Solution**: Try again during off-peak hours
- **Solution**: Reduce batch size

**Problem**: Status stuck on "Processing"
- **Solution**: Wait - IRS processing can take 24-48 hours
- **Solution**: Check IRS system status
- **Solution**: Contact IRS FIRE support if >48 hours

## Support Resources

### IRS Resources

- **FIRE Support**: 1-866-455-7438 (technical issues)
- **IRIS Portal**: https://fire.irs.gov/
- **Publication 1220**: Specifications for electronic filing
- **TCC Application**: Form 4419

### Trust Ledger Support

- **Documentation**: See `docs/api/` for technical details
- **Code Examples**: See `docs/api/irs-code-examples.md`
- **API Reference**: See `docs/api/irs-api-reference.md`

## Compliance Notes

### Filing Deadlines

- **1099-NEC**: January 31 (to IRS and payees)
- **1099-MISC**: February 28 (paper) / March 31 (electronic)
- **Other forms**: Check IRS guidelines

### Penalties

Late or incorrect filings may result in:

- $50-$290 per form (based on how late)
- Higher penalties for intentional disregard
- **Electronic filing reduces penalties** vs. paper

### Corrections

To correct a filed return:

1. File a corrected return with the "Corrected" box checked
2. Include the original receipt ID
3. Provide corrected information
4. IRS processes corrections separately

## Security & Privacy

- **Encryption**: All data encrypted in transit (TLS 1.3)
- **TCC Storage**: Encrypted at rest with AES-256
- **TIN Protection**: Never logged or displayed in full
- **Session Security**: Automatic timeout after 30 minutes
- **Audit Trail**: All submissions logged for compliance

## Quick Reference

| Action | Location | Shortcut |
|--------|----------|----------|
| New Filing | Tax Filing > File 1099 | - |
| View History | Tax Filing > Submission History | - |
| Download Receipt | History > [submission] > Download | - |
| Import CSV | Step 5 > Import from CSV | - |
| Validate TIN | Payee Entry > Validate TIN | - |

## Version History

- **v1.0** (2026-01): Initial release with IRIS integration
- **v1.1** (2026-01): Added portal authentication and session management
- **v1.2** (2026-01): Enhanced error handling and validation

---

**Last Updated**: January 2026
**Document Owner**: Trust Ledger Development Team
**Feedback**: Report issues or suggestions via the Help menu
