"""KIRO PhonePe dynamic-QR client (server-side only).

Hardened version of the module supplied by the owner (kept unchanged in
original_provided.py). Same method name and signature, plus:
  * request timeout (original had none, so a slow gateway hung the billing counter)
  * exact paise conversion with Decimal (original int(round(float*100)) can be off by 1 paisa)
  * input validation (merchant id, ids, positive amount, expiry bounds)
  * credentials are never logged or echoed in errors
  * generic error messages for network/parse failures

NOT VERIFIED: endpoints and payload fields come from the supplied file. Confirm them
against PhonePe's current merchant documentation and your UAT credentials before use.
NEVER import this from browser code: salt keys must stay on the server.
"""
import base64
import hashlib
import json
import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

import requests

_ID_RE = re.compile(r"^[A-Za-z0-9_\-]{1,64}$")
_PROD = "https://mercury-t2.phonepe.com/v3/qr/init"
_UAT = "https://mercury-uat.phonepe.com/enterprise-sandbox/v3/qr/init"


def to_paise(amount_in_rs) -> int:
    try:
        d = Decimal(str(amount_in_rs))
    except InvalidOperation:
        raise ValueError("amount must be a number")
    if not d.is_finite() or d <= 0:
        raise ValueError("amount must be greater than zero")
    return int((d * 100).quantize(Decimal(1), rounding=ROUND_HALF_UP))


class PhonePeERPApiClient:
    def __init__(self, is_production=False, timeout=10):
        self.base_url = _PROD if is_production else _UAT
        self.timeout = timeout

    def _calculate_x_verify(self, payload_base64, api_endpoint, salt_key, salt_index):
        digest = hashlib.sha256(f"{payload_base64}{api_endpoint}{salt_key}".encode("utf-8")).hexdigest()
        return f"{digest}###{salt_index}"

    def generate_dynamic_bill_qr(self, merchant_id, salt_key, salt_index, bill_id,
                                 invoice_number, amount_in_rs, expiry_seconds=300):
        try:
            if not _ID_RE.match(str(merchant_id or "")):
                raise ValueError("invalid merchant id")
            if not salt_key or not str(salt_index).strip():
                raise ValueError("missing salt credentials")
            if not _ID_RE.match(str(bill_id)) or not _ID_RE.match(str(invoice_number).replace("/", "-")):
                raise ValueError("invalid bill or invoice id")
            if not (30 <= int(expiry_seconds) <= 3600):
                raise ValueError("expiry must be 30 to 3600 seconds")
            paise = to_paise(amount_in_rs)
        except (ValueError, TypeError) as e:
            return {"success": False, "message": f"Invalid input: {e}", "data": None}

        payload = {
            "merchantId": merchant_id,
            "transactionId": str(bill_id),
            "merchantOrderId": str(invoice_number),
            "amount": paise,
            "expiresIn": int(expiry_seconds),
        }
        b64 = base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")
        path = "/enterprise-sandbox/v3/qr/init" if "enterprise-sandbox" in self.base_url else "/v3/qr/init"
        headers = {
            "Content-Type": "application/json",
            "X-Verify": self._calculate_x_verify(b64, path, salt_key, salt_index),
            "accept": "application/json",
        }
        try:
            resp = requests.post(self.base_url, json={"request": b64}, headers=headers, timeout=self.timeout)
            body = resp.json()
        except Exception:
            return {"success": False, "message": "Could not reach PhonePe. Try again or use the UPI QR.", "data": None}

        if resp.status_code == 200 and isinstance(body, dict) and body.get("success") is True:
            qr = (body.get("data") or {}).get("qrString")
            if qr:
                return {"success": True, "message": "QR Generated Successfully",
                        "data": {"qrString": qr, "transactionId": str(bill_id)}}
        msg = body.get("message") if isinstance(body, dict) else None
        return {"success": False, "message": msg or "PhonePe rejected the request", "data": None}
