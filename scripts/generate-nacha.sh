#!/usr/bin/env bash
# =============================================================================
# NACHA File Generator
# Generate NACHA-compliant ACH file for DTE Energy bill payment
#
# Usage: ./generate-nacha.sh [options]
#   --output FILE    Output file path (default: stdout)
#   --dry-run        Show file contents without writing
#   --test           Use test routing numbers
# =============================================================================
set -euo pipefail

# =============================================================================
# Configuration - Override with environment variables
# =============================================================================

# Originator (Bank of America - payer's bank)
ODFI_ROUTING="${ODFI_ROUTING:-121000358}"           # BofA routing number (example)
ODFI_ACCOUNT="${ODFI_ACCOUNT:-000000000000}"        # DDA account number
COMPANY_NAME="${COMPANY_NAME:-GUBERT TRUST}"        # Originating company
COMPANY_ID="${COMPANY_ID:-1234567890}"              # 10-digit company ID (usually EIN)

# Receiver (DTE Energy - payee)
RECEIVER_NAME="DTE ENERGY"
RECEIVER_ACCOUNT="9200549316464"                    # DTE account from bill (spaces removed)
RECEIVER_ID="200046283809"                          # DTE reference number from bill

# RDFI (DTE's bank - receiving depository)
# Note: In production, you'd get this from DTE's ACH vendor file
RDFI_ROUTING="${RDFI_ROUTING:-041000014}"           # Example receiving bank routing

# Payment Details
AMOUNT_CENTS=41178                                  # $411.78 in cents
EFFECTIVE_DATE=$(date -v+1d +%y%m%d 2>/dev/null || date -d "+1 day" +%y%m%d)  # Tomorrow
FILE_DATE=$(date +%y%m%d)
FILE_TIME=$(date +%H%M)

# SEC Code
SEC_CODE="PPD"                                      # Prearranged Payment and Deposit

# =============================================================================
# Helper Functions
# =============================================================================

# Right-pad string with spaces to fixed length
pad_right() {
    local str="$1"
    local len="$2"
    printf "%-${len}s" "${str:0:$len}"
}

# Left-pad number with zeros to fixed length
pad_left() {
    local num="$1"
    local len="$2"
    # Remove leading zeros to avoid octal interpretation, then format
    local clean_num=$(echo "$num" | sed 's/^0*//' | grep -E '^[0-9]+$' || echo "0")
    printf "%0${len}s" "$num" | tr ' ' '0'
}


# Calculate routing number check digit (Modulus 10)
calc_check_digit() {
    local routing="$1"
    local sum=0
    local weights=(3 7 1 3 7 1 3 7)
    
    for i in {0..7}; do
        digit="${routing:$i:1}"
        sum=$((sum + digit * weights[i]))
    done
    
    local check=$(( (10 - (sum % 10)) % 10 ))
    echo "$check"
}

# Validate routing number
validate_routing() {
    local routing="$1"
    if [[ ! "$routing" =~ ^[0-9]{9}$ ]]; then
        echo "ERROR: Invalid routing number format: $routing" >&2
        return 1
    fi
    
    local expected_check=$(calc_check_digit "${routing:0:8}")
    local actual_check="${routing:8:1}"
    
    if [[ "$expected_check" != "$actual_check" ]]; then
        echo "WARNING: Routing check digit mismatch (expected $expected_check, got $actual_check)" >&2
    fi
    return 0
}

# =============================================================================
# NACHA Record Generators (94 characters each)
# =============================================================================

# Record Type 1 - File Header
generate_file_header() {
    local record=""
    record+="1"                                     # Pos 1: Record Type Code
    record+="01"                                    # Pos 2-3: Priority Code
    record+=" $(pad_left ${RDFI_ROUTING:0:9} 9)"    # Pos 4-13: Immediate Destination (b + 9 digits)
    record+="$(pad_left ${ODFI_ROUTING:0:10} 10)"   # Pos 14-23: Immediate Origin (10 digits)
    record+="$FILE_DATE"                            # Pos 24-29: File Creation Date
    record+="$FILE_TIME"                            # Pos 30-33: File Creation Time
    record+="A"                                     # Pos 34: File ID Modifier
    record+="094"                                   # Pos 35-37: Record Size
    record+="10"                                    # Pos 38-39: Blocking Factor
    record+="1"                                     # Pos 40: Format Code
    record+="$(pad_right "RECEIVING BANK" 23)"      # Pos 41-63: Immediate Destination Name
    record+="$(pad_right "$COMPANY_NAME" 23)"       # Pos 64-86: Immediate Origin Name
    record+="$(pad_right "" 8)"                     # Pos 87-94: Reference Code
    
    echo "$record"
}

# Record Type 5 - Batch Header
generate_batch_header() {
    local batch_num="$1"
    local record=""
    record+="5"                                     # Pos 1: Record Type Code
    record+="200"                                   # Pos 2-4: Service Class Code (mixed debits/credits)
    record+="$(pad_right "$COMPANY_NAME" 16)"       # Pos 5-20: Company Name
    record+="$(pad_right "" 20)"                    # Pos 21-40: Company Discretionary Data
    record+="$(pad_right "$COMPANY_ID" 10)"         # Pos 41-50: Company Identification
    record+="$SEC_CODE"                             # Pos 51-53: SEC Code
    record+="$(pad_right "UTILITY PMT" 10)"         # Pos 54-63: Company Entry Description
    record+="$(pad_right "$FILE_DATE" 6)"           # Pos 64-69: Company Descriptive Date
    record+="$EFFECTIVE_DATE"                       # Pos 70-75: Effective Entry Date
    record+="   "                                   # Pos 76-78: Settlement Date (blank)
    record+="1"                                     # Pos 79: Originator Status Code
    record+="${ODFI_ROUTING:0:8}"                   # Pos 80-87: Originating DFI ID
    record+="$(pad_left $batch_num 7)"              # Pos 88-94: Batch Number
    
    echo "$record"
}

# Record Type 6 - Entry Detail (Credit to DTE Energy)
generate_entry_detail() {
    local entry_seq="$1"
    local record=""
    record+="6"                                     # Pos 1: Record Type Code
    record+="22"                                    # Pos 2-3: Transaction Code (22 = credit to checking)
    record+="${RDFI_ROUTING:0:8}"                   # Pos 4-11: Receiving DFI ID (8 digits)
    record+="${RDFI_ROUTING:8:1}"                   # Pos 12: Check Digit
    record+="$(pad_right "$RECEIVER_ACCOUNT" 17)"   # Pos 13-29: DFI Account Number
    record+="$(pad_left $AMOUNT_CENTS 10)"          # Pos 30-39: Amount (in cents)
    record+="$(pad_right "$RECEIVER_ID" 15)"        # Pos 40-54: Individual ID Number
    record+="$(pad_right "$RECEIVER_NAME" 22)"      # Pos 55-76: Individual Name
    record+="  "                                    # Pos 77-78: Discretionary Data
    record+="0"                                     # Pos 79: Addenda Record Indicator
    record+="${ODFI_ROUTING:0:8}"                   # Pos 80-87: Trace Number (ODFI routing)
    record+="$(pad_left $entry_seq 7)"              # Pos 88-94: Trace Number (sequence)
    
    echo "$record"
}

# Record Type 8 - Batch Control
generate_batch_control() {
    local batch_num="$1"
    local entry_count="$2"
    local entry_hash="$3"
    local debit_total="$4"
    local credit_total="$5"
    
    local record=""
    record+="8"                                     # Pos 1: Record Type Code
    record+="200"                                   # Pos 2-4: Service Class Code
    record+="$(pad_left $entry_count 6)"            # Pos 5-10: Entry/Addenda Count
    record+="$(pad_left $entry_hash 10)"            # Pos 11-20: Entry Hash
    record+="$(pad_left $debit_total 12)"           # Pos 21-32: Total Debit Amount
    record+="$(pad_left $credit_total 12)"          # Pos 33-44: Total Credit Amount
    record+="$(pad_right "$COMPANY_ID" 10)"         # Pos 45-54: Company Identification
    record+="$(pad_right "" 19)"                    # Pos 55-73: Message Authentication Code
    record+="$(pad_right "" 6)"                     # Pos 74-79: Reserved
    record+="${ODFI_ROUTING:0:8}"                   # Pos 80-87: Originating DFI ID
    record+="$(pad_left $batch_num 7)"              # Pos 88-94: Batch Number
    
    echo "$record"
}

# Record Type 9 - File Control
generate_file_control() {
    local batch_count="$1"
    local block_count="$2"
    local entry_count="$3"
    local entry_hash="$4"
    local debit_total="$5"
    local credit_total="$6"
    
    local record=""
    record+="9"                                     # Pos 1: Record Type Code
    record+="$(pad_left $batch_count 6)"            # Pos 2-7: Batch Count
    record+="$(pad_left $block_count 6)"            # Pos 8-13: Block Count
    record+="$(pad_left $entry_count 8)"            # Pos 14-21: Entry/Addenda Count
    record+="$(pad_left $entry_hash 10)"            # Pos 22-31: Entry Hash
    record+="$(pad_left $debit_total 12)"           # Pos 32-43: Total Debit Amount
    record+="$(pad_left $credit_total 12)"          # Pos 44-55: Total Credit Amount
    record+="$(pad_right "" 39)"                    # Pos 56-94: Reserved
    
    echo "$record"
}

# Padding record (fills block to 10 records)
generate_padding() {
    printf '%94s' | tr ' ' '9'
}

# =============================================================================
# Main Generation
# =============================================================================

generate_nacha_file() {
    local output=""
    
    # File Header (Record 1)
    output+="$(generate_file_header)"$'\r\n'
    
    # Batch Header (Record 2)
    output+="$(generate_batch_header 1)"$'\r\n'
    
    # Entry Detail (Record 3)
    output+="$(generate_entry_detail 1)"$'\r\n'
    
    # Calculate entry hash (first 8 digits of RDFI routing)
    local entry_hash="${RDFI_ROUTING:0:8}"
    
    # Batch Control (Record 4)
    output+="$(generate_batch_control 1 1 $entry_hash 0 $AMOUNT_CENTS)"$'\r\n'
    
    # File Control (Record 5)
    # Block count = ceil(record_count / 10)
    local record_count=5  # 1 + 1 + 1 + 1 + 1
    local block_count=$(( (record_count + 9) / 10 ))
    output+="$(generate_file_control 1 $block_count 1 $entry_hash 0 $AMOUNT_CENTS)"$'\r\n'
    
    # Padding to fill block (records 6-10)
    for ((i=record_count+1; i<=block_count*10; i++)); do
        output+="$(generate_padding)"$'\r\n'
    done
    
    echo -n "$output"
}

# =============================================================================
# CLI Interface
# =============================================================================

OUTPUT_FILE=""
DRY_RUN=false
TEST_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --test)
            TEST_MODE=true
            # Use test routing numbers
            ODFI_ROUTING="091000019"  # Test routing
            RDFI_ROUTING="091000019"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "  --output FILE    Output file path (default: stdout)"
            echo "  --dry-run        Show file contents without writing"
            echo "  --test           Use test routing numbers"
            echo ""
            echo "Environment Variables:"
            echo "  ODFI_ROUTING     Originating bank routing (9 digits)"
            echo "  ODFI_ACCOUNT     Originating DDA account"
            echo "  COMPANY_NAME     Originating company name"
            echo "  COMPANY_ID       Company ID (EIN)"
            echo "  RDFI_ROUTING     Receiving bank routing (9 digits)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# Validate routing numbers
validate_routing "$ODFI_ROUTING" || exit 1
validate_routing "$RDFI_ROUTING" || exit 1

# Generate the file
NACHA_CONTENT=$(generate_nacha_file)

if $DRY_RUN; then
    echo "=== NACHA File Preview (DTE Energy Payment: \$411.78) ==="
    echo ""
    echo "Originator: $COMPANY_NAME ($ODFI_ROUTING)"
    echo "Receiver: $RECEIVER_NAME (Acct: $RECEIVER_ACCOUNT)"
    echo "Amount: \$$(printf '%.2f' $(echo "scale=2; $AMOUNT_CENTS / 100" | bc))"
    echo "Effective Date: $EFFECTIVE_DATE"
    echo ""
    echo "=== File Contents (each line is 94 characters) ==="
    echo "$NACHA_CONTENT" | cat -A  # Show line endings
    echo ""
    echo "=== Line Length Verification ==="
    echo "$NACHA_CONTENT" | while IFS= read -r line; do
        len=$(echo -n "$line" | tr -d '\r' | wc -c)
        if [[ $len -ne 94 ]]; then
            echo "WARNING: Line length $len (expected 94)"
        fi
    done
    echo "All lines verified."
elif [[ -n "$OUTPUT_FILE" ]]; then
    echo -n "$NACHA_CONTENT" > "$OUTPUT_FILE"
    echo "NACHA file written to: $OUTPUT_FILE"
    echo "Size: $(wc -c < "$OUTPUT_FILE") bytes"
    echo "Checksum: $(shasum -a 256 "$OUTPUT_FILE" | cut -d' ' -f1)"
else
    echo -n "$NACHA_CONTENT"
fi
