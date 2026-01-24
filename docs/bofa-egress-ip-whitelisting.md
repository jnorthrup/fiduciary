# BOFA Egress IP Whitelisting

## Overview

Bank of America CashPro API requires static IP whitelisting for all API requests. Requests originating from non-whitelisted IP addresses will be rejected with a 403 Forbidden response.

## Required Configuration

### Environment Variables

```bash
# Egress IP range for GCP Cloud NAT
BOFA_EGRESS_IP_RANGE=35.190.0.0/18
```

### Cloud NAT Setup

The application uses Google Cloud NAT in the `us-central1` region to provide static egress IPs. The IP range `35.190.0.0/18` must be whitelisted in the BOFA developer portal.

## Whitelisting Process

1. **Contact BOFA Support**
   - Submit IP whitelist request through BOFA CashPro Developer Studio
   - Reference your application ID and developer account

2. **Provide IP Information**
   - IP Range: `35.190.0.0/18`
   - Region: `us-central1` (Iowa)
   - Description: "Fiduciary ACH Processing"

3. **Verification**
   - After whitelisting is complete, test API calls from the application
   - Monitor for 403 errors indicating IP whitelist issues

## GCP Configuration

### Cloud NAT Gateway

Ensure your GCP project has Cloud NAT configured with static IPs:

```bash
# Verify Cloud NAT configuration
gcloud compute routers nats describe bofa-nat \
  --router=bofa-router \
  --region=us-central1
```

### Cloud NAT IP Reservation

```bash
# Reserve static IPs for BOFA whitelist
gcloud compute addresses create bofa-egress-ips \
  --region=us-central1 \
  --addresses=35.190.0.0/18
```

## Security Considerations

- Static IP whitelisting provides defense-in-depth but is not sufficient authentication
- Always use OAuth 2.0 client credentials for API authentication
- Store OAuth credentials in Google Secret Manager, never in environment variables
- Rotate client credentials per BOFA security guidelines

## Troubleshooting

### 403 Forbidden Responses

If you receive 403 errors from BOFA APIs:

1. Verify Cloud NAT is configured and active
2. Confirm IP range is whitelisted in BOFA developer portal
3. Check VPC routing configuration
4. Verify no proxy or load balancer is modifying source IPs

### Testing Egress IP

To verify your application's egress IP:

```bash
# From GCP VM, check egress IP
curl -s https://api.ipify.org
```

The response should match an IP within `35.190.0.0/18`.

## References

- BOFA CashPro Developer Studio: https://developer.bankofamerica.com
- GCP Cloud NAT Documentation: https://cloud.google.com/nat/docs
- Track: `bofa_cashpro_20260123`
- Phase: 1.3 Environment Configuration
