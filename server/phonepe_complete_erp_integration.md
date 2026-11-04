# PhonePe Dynamic QR & Webhook Auto-Reconciliation: ERP Master Integration Guide

This specification defines the complete cryptographic signing, request initiation, and webhook validation protocols required to implement PhonePe's Dynamic QR solution across a multi-tenant ERP platform.

---

## 1. Database Schema (Multi-Merchant Mapping)

To support multiple independent business owners on a single ERP installation, you must store credentials per tenant.

```sql
CREATE TABLE merchant_payment_gateways (
    id BIGSERIAL PRIMARY KEY,
    business_id INT UNIQUE NOT NULL,
    phonepe_mid VARCHAR(50) NOT NULL,
    phonepe_salt_key VARCHAR(100) NOT NULL,
    phonepe_salt_index VARCHAR(5) NOT NULL DEFAULT '1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. API Request Signature Protocol (`/v3/qr/init`)

Every API request sent to PhonePe must include an `X-Verify` header containing a SHA256 checksum calculated with the merchant's secret `salt_key`.

### Steps to Construct Signature:
1. Prepare your JSON request payload.
2. Base64-encode the entire payload string.
3. Concatenate the fields: `Base64(Payload) + "/v3/qr/init" + Salt_Key`
4. Calculate the SHA256 hash of this concatenated string (in hex format).
5. Append `###` followed by the `salt_index`.

### Python Implementation Example:
```python
import base64
import hashlib
import json
import requests

def initiate_bill_qr(merchant_id, salt_key, salt_index, bill_id, amount_rs, callback_url, is_prod=False):
    endpoint = "/v3/qr/init"
    base_url = "https://phonepe.com" if is_prod else "https://phonepe.com"
    url = f"{base_url}{endpoint}"
    
    # Amount must be converted to Paisa (integer)
    amount_paisa = int(float(amount_rs) * 100)
    
    payload_dict = {
        "merchantId": merchant_id,
        "transactionId": str(bill_id),
        "merchantOrderId": f"INV-{bill_id}",
        "amount": amount_paisa,
        "expiresIn": 600, # 10 Minutes validity
        "callbackUrl": callback_url
    }
    
    # Base64 serialization
    json_str = json.dumps(payload_dict)
    base64_payload = base64.b64encode(json_str.encode('utf-8')).decode('utf-8')
    
    # Signature calculation
    main_string = base64_payload + endpoint + salt_key
    sha256_hash = hashlib.sha256(main_string.encode('utf-8')).hexdigest()
    x_verify = f"{sha256_hash}###{salt_index}"
    
    headers = {
        "Content-Type": "application/json",
        "X-Verify": x_verify
    }
    
    response = requests.post(url, json={"request": base64_payload}, headers=headers)
    return response.json()
```

---

## 3. Webhook Authentication Protocol (`/phonepe-webhook`)

When a customer pays, PhonePe executes an asynchronous POST request to your specified `callbackUrl`. The payload is base64 encoded, and you must verify it against an incoming `X-Verify` header to confirm it originated genuinely from PhonePe.

### Verification Flow:
1. Capture the raw text body of the request (this contains the base64 payload string).
2. Read the incoming `X-Verify` header from PhonePe.
3. Concatenate: `Raw_Body_String + Salt_Key`
4. Calculate the SHA256 hash of the concatenated string.
5. Append `###` followed by the `salt_index`.
6. Compare your computed string directly with the received `X-Verify` header. If they match perfectly, proceed with the update.

### Python Implementation Example (Flask Layout):
```python
import base64
import json
import hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)

# Sample Mock Database Lookup function
def get_merchant_credentials(merchant_id):
    # In production, pull from merchant_payment_gateways table using merchant_id
    return {"salt_key": "MOCK_SALT_KEY", "salt_index": "1"}

@app.route('/phonepe-webhook', methods=['POST'])
def phonepe_webhook():
    # 1. Grab raw payload string and headers
    req_data = request.get_json()
    base64_response = req_data.get("response") # Encrypted response payload
    received_x_verify = request.headers.get("X-Verify")
    
    # 2. Decode payload tentatively to identify the merchant account
    decoded_bytes = base64.b64decode(base64_response)
    decoded_json = json.loads(decoded_bytes.decode('utf-8'))
    
    merchant_id = decoded_json.get("data", {}).get("merchantId")
    bill_id = decoded_json.get("data", {}).get("merchantTransactionId")
    payment_code = decoded_json.get("code")
    
    # 3. Fetch specific cryptographic keys for validation
    creds = get_merchant_credentials(merchant_id)
    if not creds:
        return jsonify({"success": False, "message": "Unknown Merchant"}), 400
        
    # 4. Strictly validate payload authenticity
    main_string = base64_response + creds["salt_key"]
    computed_hash = hashlib.sha256(main_string.encode('utf-8')).hexdigest()
    computed_x_verify = f"{computed_hash}###{creds['salt_index']}"
    
    if computed_x_verify != received_x_verify:
        return jsonify({"success": False, "message": "Signature Verification Failed"}), 401
        
    # 5. Execute Auto-Reconciliation update inside your ERP
    if payment_code == "PAYMENT_SUCCESS":
        # db.execute("UPDATE bills SET status = 'Paid' WHERE bill_id = %s", (bill_id,))
        print(f"Bill {bill_id} successfully reconciled automatically.")
        
    return jsonify({"success": True}), 200

if __name__ == '__main__':
    app.run(port=5000)
```

---

## 4. Frontend Billing Screen Synchronization (Polling Logic)

Because web browsers or desktop POS run on a different application state than the asynchronous webhook channel, your UI can check the status automatically via short polling or local updates.

### JavaScript Client Polling Loop:
```javascript
let pollCount = 0;
const maxPolls = 60; // Terminate tracking after 10 minutes (60 * 10 seconds)

function trackPaymentStatus(billId) {
    const pollInterval = setInterval(async () => {
        pollCount++;
        
        // Query your internal local ERP backend endpoint, NOT the phonepe api directly
        const response = await fetch(`/api/check-local-bill-status?billId=${billId}`);
        const data = await response.json();
        
        if (data.status === 'Paid') {
            clearInterval(pollInterval);
            showSuccessScreen();
        } else if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            showTimeoutScreen();
        }
    }, 10000); // Trigger check loop every 10 seconds
}

function showSuccessScreen() {
    alert("Payment Received! Automatically printing invoice receipt now...");
    // Clear out billing console and open new invoice canvas
}
```
