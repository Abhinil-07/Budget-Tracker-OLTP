# AUTOMATION.md — Gmail & SMS Transaction Ingestion Guide

Automate transaction logging directly from your **Bank SMS** or **Gmail Transaction Alerts** into your **Staged Inbox** for platform-independent review across PC and Mobile.

---

## 1. Gmail Auto-Forwarder (Zero App Required)

Most Indian banks (HDFC, ICICI, SBI, Axis, Cred) send instantaneous transaction emails.

### Setup Steps:
1. Open **Gmail Settings** -> **Filters and Blocked Addresses**.
2. Click **Create a new filter**.
3. In **Has the words**, enter:
   ```
   "debited from A/C" OR "spent on HDFC Bank" OR "transaction on your card" OR "credited to A/C"
   ```
4. Click **Create filter** -> Check **Forward it to** -> Add Webhook / Google Apps Script URL.
5. Google Apps Script template (Paste raw body to your backend):
   ```js
   function forwardBankEmailToTracker(e) {
     var emailBody = e.message.getPlainBody();
     var payload = {
       "text": emailBody,
       "auto_stage": true
     };
     
     UrlFetchApp.fetch("YOUR_BACKEND_URL/api/transactions/parse-email", {
       "method": "post",
       "contentType": "application/json",
       "payload": JSON.stringify(payload)
     });
   }
   ```

---

## 2. Android Phone SMS Auto-Forwarder (MacroDroid / Tasker)

### Setup Steps using MacroDroid (Free on Play Store):
1. Download **MacroDroid** on your phone.
2. Add Trigger: **SMS Received** -> Select Senders (`HDFCBK`, `SBIBNK`, `ICICIB`, `PAYTM`, `PhonePe`).
3. Add Action: **HTTP Request (POST)**:
   - URL: `YOUR_BACKEND_URL/api/transactions/parse-sms`
   - Content Type: `application/json`
   - Body:
     ```json
     {
       "text": "{sms_body}",
       "auto_stage": true
     }
     ```
4. Done! Every time you spend money via UPI or credit card, the SMS will be captured and placed into your **Staged Inbox** ready for 1-click review on PC or Phone.
