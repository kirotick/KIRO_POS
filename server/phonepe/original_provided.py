# PhonePe Dynamic QR Integration Module for ERP Billing Systems
# Language: Python 3.x
# Dependencies: requests

import requests
import json
import base64
import hashlib

class PhonePeERPApiClient:
    def __init__(self, is_production=False):
        """
        Initializes the PhonePe Multi-Merchant API client wrapper.
        
        :param is_production: Set to True for live production URL, False for Sandbox UAT environment.
        """
        if is_production:
            self.base_url = "https://mercury-t2.phonepe.com/v3/qr/init"
        else:
            self.base_url = "https://mercury-uat.phonepe.com/enterprise-sandbox/v3/qr/init"

    def _calculate_x_verify(self, payload_base64, api_endpoint, salt_key, salt_index):
        """
        Generates the SHA256 cryptographic signature needed by PhonePe for the X-Verify header.
        """
        # Format string: Base64EncodedPayload + EndpointPath + SaltKey
        main_string = f"{payload_base64}{api_endpoint}{salt_key}"
        
        # Calculate SHA256 hash
        sha256_hash = hashlib.sha256(main_string.encode('utf-8')).hexdigest()
        
        # Append salt index suffix
        x_verify_header = f"{sha256_hash}###{salt_index}"
        return x_verify_header

    def generate_dynamic_bill_qr(self, merchant_id, salt_key, salt_index, bill_id, invoice_number, amount_in_rs, expiry_seconds=300):
        """
        Generates a unique dynamic QR code for a specific bill on behalf of an onboarding business owner.
        
        :param merchant_id: PhonePe MID belonging to the specific business owner.
        :param salt_key: Cryptographic salt key assigned to that specific business owner.
        :param salt_index: Salt index assigned to that specific business owner.
        :param bill_id: A completely unique billing transaction ID from your ERP system.
        :param invoice_number: Human-readable invoice number printed on the receipt.
        :param amount_in_rs: Total invoice bill amount in Rupees (e.g., 250.50).
        :param expiry_seconds: Time window before this QR code automatically invalidates (default 5 minutes).
        :return: Dict containing API response status and the 'qrString' if successful.
        """
        # Convert Rupee amount into Paisa integer (PhonePe core structural constraint)
        amount_in_paisa = int(round(amount_in_rs * 100))
        
        # Build raw request payload
        payload_data = {
            "merchantId": merchant_id,
            "transactionId": str(bill_id),
            "merchantOrderId": str(invoice_number),
            "amount": amount_in_paisa,
            "expiresIn": expiry_seconds
        }
        
        # 1. JSON String conversion
        json_payload = json.dumps(payload_data)
        
        # 2. Base64 encoding
        payload_base64 = base64.b64encode(json_payload.encode('utf-8')).decode('utf-8')
        
        # 3. Generate Header Token
        api_path = "/v3/qr/init" if "enterprise-sandbox" not in self.base_url else "/enterprise-sandbox/v3/qr/init"
        x_verify = self._calculate_x_verify(payload_base64, api_path, salt_key, salt_index)
        
        # 4. Prepare Headers
        headers = {
            "Content-Type": "application/json",
            "X-Verify": x_verify,
            "accept": "application/json"
        }
        
        # 5. Compile request package
        request_body = {
            "request": payload_base64
        }
        
        try:
            response = requests.post(self.base_url, json=request_body, headers=headers)
            response_json = response.json()
            
            # Formulate clear response object for the calling ERP script
            if response.status_code == 200 and response_json.get("success") == True:
                return {
                    "success": True,
                    "message": "QR Generated Successfully",
                    "data": {
                        "qrString": response_json["data"]["qrString"],
                        "transactionId": bill_id
                    }
                }
            else:
                return {
                    "success": False,
                    "message": response_json.get("message", "API Error received from PhonePe gateway"),
                    "data": response_json
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"Network or Parsing connection failure: {str(e)}",
                "data": None
            }