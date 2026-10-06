# Personal Finance Tracker & Telegram Splitter

A personal finance tracker and expense splitter built for daily use. Log transactions across bank accounts and credit cards, view live balances, track budget progress, and split expenses via Telegram using plain English or receipt screenshots.

---

## ⚡ Telegram Split Feature Overview

1. When a bank debit email arrives (via Google Apps Script), the system stages the transaction and automatically pings your Telegram Bot:
   > *"₹250 at Zepto. How do we split?"*
2. You reply directly to the message with casual text:
   - *"milk 50 me, sauce 200 half half"*
   - *"all his"*
   - *"50/50"*
   - Or **send a screenshot** of the order breakdown from Zepto/Blinkit/Swiggy.
3. The app parses the split via a provider-agnostic LLM, verifies strict integer paise math (splits must sum exactly to the debit total), writes the split records, marks the transaction approved, and adjusts your bank balance.
4. The bot replies:
   > *"Logged ✅ Your share: ₹150 | Rohan owes you: ₹100"*

---

## 🤖 Telegram Bot Setup Guide

### 1. Create your Bot with BotFather
1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the prompts to choose a name and username (e.g. `MyExpenseTrackerBot`).
3. BotFather will give you an **API Token** formatted like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`.
4. Copy this token to your `.env` files:
   - Backend: `TELEGRAM_BOT_TOKEN=123456789:ABCdef...`
   - Frontend: `TELEGRAM_BOT_TOKEN=123456789:ABCdef...`

### 2. Find Your Telegram Chat ID
1. Search for `@userinfobot` or `@raw_data_bot` on Telegram and click **Start**.
2. Note your numerical `id` (e.g. `123456789`).
3. Set this as your allowed chat ID (the bot will silently ignore messages from all other chats for security):
   - Backend: `TELEGRAM_ALLOWED_CHAT_ID=123456789`
   - Frontend: `TELEGRAM_ALLOWED_CHAT_ID=123456789`

### 3. Generate a Webhook Secret Token
Choose any random string (e.g. `my_super_secret_token_98765`) and add it to `frontend/.env.local`:
```bash
TELEGRAM_WEBHOOK_SECRET=my_super_secret_token_98765
```

### 4. Register the Webhook via curl
Once your frontend is deployed (or exposed locally via ngrok/localtunnel at `https://your-domain.com`), register the webhook with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://your-domain.com/api/telegram",
       "secret_token": "<YOUR_TELEGRAM_WEBHOOK_SECRET>"
     }'
```

To verify webhook status:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

---

## 🧠 LLM Abstraction & Free Tier Setup

The app includes a zero-SDK, provider-agnostic LLM abstraction (`frontend/lib/llm/`). You can switch providers and models using **environment variables only** without changing a single line of code.

### 🌟 Recommended Free Image Model: Google Gemini Flash
- **Provider**: Google AI Studio
- **Cost**: **100% Free** (15 Requests Per Minute, 1,500 Requests Per Day)
- **Capabilities**: Multimodal (OCR and receipt screenshot understanding), fast, native structured JSON schema mode.
- **Setup**:
  1. Get a free API key at [https://aistudio.google.com](https://aistudio.google.com).
  2. Add to `frontend/.env.local`:
     ```env
     LLM_PROVIDER=gemini
     LLM_MODEL=gemini-1.5-flash
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

### Alternative Providers
| Provider | Environment Config | Vision Support | Pricing / Free Tier |
| :--- | :--- | :--- | :--- |
| **Gemini** | `LLM_PROVIDER=gemini`<br>`LLM_MODEL=gemini-1.5-flash` | ✅ Yes | Free tier via Google AI Studio |
| **OpenAI** | `LLM_PROVIDER=openai`<br>`LLM_MODEL=gpt-4o-mini` | ✅ Yes | Pay-per-token (requires paid credits) |
| **Anthropic** | `LLM_PROVIDER=anthropic`<br>`LLM_MODEL=claude-3-5-haiku-20241022` | ✅ Yes | Pay-per-token (requires paid credits) |
| **Mock** | `LLM_PROVIDER=mock`<br>`LLM_MODEL=mock-model` | ✅ (Simulated) | Free, completely offline testing |

### Fallback Provider
If your primary provider encounters a rate limit or service outage, the registry automatically fails over after 1 retry to the fallback provider:
```env
LLM_FALLBACK_PROVIDER=openai
LLM_FALLBACK_MODEL=gpt-4o-mini
```

---

## 🧪 Testing & LLM Evaluation

Run the unit test suite (paise arithmetic, sum constraints, registry & fallback):
```bash
cd frontend
npm test
```

Test sample split messages against your active provider:
```bash
cd frontend
npm run eval:llm
```

---

## 📱 Bot Commands

- `/balance`: Check who owes whom across all shared splits and repayments.
- `/undo`: Revert the last approved transaction and its splits, restoring account balance.
- `/settle <person> <amount>`: Record a repayment (e.g. `/settle Rohan 150`).
