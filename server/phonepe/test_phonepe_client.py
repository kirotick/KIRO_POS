import base64, hashlib, json, unittest
from unittest import mock
from phonepe_client import PhonePeERPApiClient, to_paise

class R:
    def __init__(s, code, body): s.status_code, s._b = code, body
    def json(s): return s._b

class T(unittest.TestCase):
    def call(self, **kw):
        a = dict(merchant_id="M123", salt_key="secret", salt_index=1, bill_id="b1",
                 invoice_number="INV-1", amount_in_rs=250.5)
        a.update(kw)
        return PhonePeERPApiClient().generate_dynamic_bill_qr(**a)

    def test_paise_exact(self):
        self.assertEqual(to_paise(0.29), 29)
        self.assertEqual(to_paise("1234.50"), 123450)
        self.assertEqual(to_paise(1.005), 101)  # str-based half-up, float-safe
        for bad in (0, -1, "x", float("nan")):
            with self.assertRaises(ValueError): to_paise(bad)

    def test_signature_and_payload(self):
        with mock.patch("phonepe_client.requests.post", return_value=R(200, {"success": True, "data": {"qrString": "QR"}})) as p:
            out = self.call()
        self.assertTrue(out["success"]); self.assertEqual(out["data"]["qrString"], "QR")
        _, kw = p.call_args
        b64 = kw["json"]["request"]
        pl = json.loads(base64.b64decode(b64))
        self.assertEqual(pl["amount"], 25050); self.assertEqual(kw["timeout"], 10)
        exp = hashlib.sha256((b64 + "/enterprise-sandbox/v3/qr/init" + "secret").encode()).hexdigest() + "###1"
        self.assertEqual(kw["headers"]["X-Verify"], exp)

    def test_prod_path(self):
        with mock.patch("phonepe_client.requests.post", return_value=R(200, {"success": True, "data": {"qrString": "Q"}})) as p:
            PhonePeERPApiClient(is_production=True).generate_dynamic_bill_qr("M1", "k", 1, "b", "I-1", 10)
        b64 = p.call_args[1]["json"]["request"]
        self.assertTrue(p.call_args[1]["headers"]["X-Verify"].startswith(hashlib.sha256((b64 + "/v3/qr/init" + "k").encode()).hexdigest()))

    def test_validation_and_no_network(self):
        with mock.patch("phonepe_client.requests.post") as p:
            for kw in ({"amount_in_rs": 0}, {"merchant_id": "bad id!"}, {"salt_key": ""}, {"expiry_seconds": 5}):
                self.assertFalse(self.call(**kw)["success"])
            p.assert_not_called()

    def test_errors_do_not_leak_secret(self):
        with mock.patch("phonepe_client.requests.post", side_effect=Exception("boom secret")):
            out = self.call()
        self.assertFalse(out["success"]); self.assertNotIn("secret", json.dumps(out))
        with mock.patch("phonepe_client.requests.post", return_value=R(400, {"success": False, "message": "bad"})):
            self.assertEqual(self.call()["message"], "bad")

if __name__ == "__main__": unittest.main()
