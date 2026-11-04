# KIRO server: PhonePe dynamic QR

`original_provided.py` is your file, unchanged. `phonepe_client.py` is the hardened version KIRO should call.

## Status (honest)
- Unit tests use a mocked HTTP call. **No real PhonePe request has been made.**
- Endpoints and field names are taken from your file and **must be checked against PhonePe's current merchant docs** and tested in UAT.
- It only creates a QR. There is **no payment-status check or webhook** yet, so KIRO cannot know a bill was paid. Until that exists, the app uses a standard UPI QR plus the cashier's "Payment received" tick.
- This needs a backend. The current KIRO app is browser-only and must never hold salt keys.

## Credentials you must supply (per business, never in the frontend or GitHub)
| Item | Where it goes |
|---|---|
| PhonePe Merchant ID (MID) | server database, per business |
| Salt key | encrypted server secret store, per business |
| Salt index | server database, per business |
| Production vs UAT switch | server environment setting |
| Webhook/callback URL and secret (for status) | PhonePe dashboard + server |

## Run tests
`pip install requests && python -m unittest -v` (inside this folder)
