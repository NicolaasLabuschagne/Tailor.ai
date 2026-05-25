# Tailor - AI Newsletter Automation Platform

Tailor automatically transforms real-world news into personalized promotional newsletters for business or intelligent executive briefings for individuals.

## Core Features
- **Tailor for Business:** Fetch live news, process through Claude AI in your brand voice, and deliver branded newsletters.
- **Tailor for Individuals:** 20+ topics to choose from for a daily or weekly executive news briefing.
- **Approval Portal:** One-click approval flow with AI-driven "Request Edit" capabilities.
- **Subscriber Management:** Manage your audience and import existing subscribers.
- **Analytics Dashboard:** Visual performance tracking for sent newsletters and subscriber growth.

## Architecture Overview

### Business Newsletter Pipeline
1. **Ingestion:** Parallel fetching from RSS, NewsAPI, Guardian, and NYT based on business keywords.
2. **AI Generation:** Claude 3.5 Sonnet transforms news into on-brand marketing copy.
3. **Approval:** Users review, request edits (AI-driven), and approve for delivery.
4. **Delivery:** Hourly cron job sends emails in batches of 50 via Resend.

### Individual Briefing Pipeline
1. **Selection:** Users pick topics from a list of 20+ categories.
2. **Ingestion:** Dedicated RSS feeds and Guardian news for each topic.
3. **AI Generation:** Claude creates a concise, executive-style briefing using a premium HTML template.
4. **Delivery:** Daily at 07:00 UTC via Resend directly to the user's inbox.

## Local Setup

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Setup Database:**
    - Ensure PostgreSQL is running.
    - Set `DATABASE_URL` in your `.env` file.
    - Run migrations:
      ```bash
      npx prisma db push
      ```
4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

## News Sources & Quotas
Tailor uses a multi-source strategy to ensure quality while managing costs:
- **RSS Feeds:** The primary source, free and real-time.
- **The Guardian & NYT:** High-quality supplementary reporting.
- **NewsAPI:** Reserved for business newsletter generation (100 req/day free tier).

## Manual Cron Testing
Trigger crons manually using curl (requires `CRON_SECRET` header):

- **Newsletters:**
  ```bash
  curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/send-newsletters
  ```
- **Briefings:**
  ```bash
  curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/send-briefings
  ```

## Known Limitations
- **NewsAPI:** Free tier limited to 100 req/day — reserved for business newsletters.
- **Delivery Times:** Custom delivery times are stored, but current sends execute at the fixed 07:00 UTC cron tick.
- **Analytics:** Open and click rate tracking requires Resend webhook setup — currently shows placeholder data.

## Security
- All cron routes are secured via shared secret.
- Unsubscribe links use HMAC-signed tokens with 31-day expiry.
- Multi-tenant data isolation enforced via NextAuth session validation.

## Development Login
In development mode, you can ensure a test user exists by visiting `/api/auth/dev-login`. Use `dev@example.com` to sign in. In a development environment without a real SMTP server, check the console output of the `npm run dev` process to find the magic link URL.
