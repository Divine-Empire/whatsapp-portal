# whatsapp-portal — project context

This file exists so any agent (or human) working here, or in either sibling
repo, has an accurate picture of what this service actually is. Audited
2026-08-26 by reading the real source (not assumed from name/README — the
default `README.md`/boilerplate `create-next-app` docs in this repo are
stale and describe nothing real). Keep this current.

## What this is

A real, mature, **already-in-production** WhatsApp Business Cloud API portal
for Divine Empire India Pvt. Ltd. — the client's actual day-to-day WhatsApp
tool today, not a prototype. Next.js 16 (App Router) + Supabase (its own
project, separate from `sales-agent`'s). "Powered by Botivate" in the
onboarding footer — built by the same shop as the sibling repos.

Repo: `Divine-Empire/whatsapp-portal`. Deployed at
`whatsapp-portal-divine.vercel.app`, Vercel project `whatsapp-portal` under
team `mis-thedivineemps-projects` (same team as `sales-agent-dashboard`;
`vercel teams switch mis-thedivineemps-projects` to see it via CLI — it does
not show up under other scopes/accounts). Confirmed live 2026-08-26: most
recent deploy 2 days old, all recent deploys `Ready`/Production, root URL
responds `307` to the login page (matches the `(auth)` route group in
source). Package manager: plain npm (`package-lock.json` present, no
`packageManager` pin or `vercel.json`) — unlike the other two Botivate repos
in this workspace, which use bun.

## Feature surface (confirmed by reading the code, not inferred)

- **Inbox**: full chat UI — message bubbles, reactions, replies-with-context,
  media (image/video/document/audio/sticker), typing indicator, emoji
  picker, context menus, a contact info drawer. `src/components/dash/`,
  `src/components/Message*.tsx`, `src/components/Chat*.tsx`.
- **Templates**: `dashboard/tracker` fetches approved templates from Meta
  (`fetchWhatsAppTemplates`) and sends them (`sendWhatsAppTemplate`), with
  per-template send/delivered/read/failed/replied counts and cost in
  `whatsapp_portal_template_stats`.
- **Google Sheets bulk-send bridge**: `POST /api/sync-sheet` receives events
  from the Google Apps Script also referenced in `sales-agent/app_script/`
  (its `sendTemplateToVercel()` posts here). This is how the client's
  Sheet-driven bulk campaigns show up in this portal's inbox/tracker.
- **Webhook handler**: `src/app/api/webhook/[userId]/route.ts` — handles
  every Meta message type (text, interactive button/list replies, image,
  video, document, audio, sticker, location, shared contact, reactions),
  full status lifecycle (sent/delivered/read/failed with Meta's error
  code+message captured), dedup by `wa_message_id`, and an "external message
  backfill" path: if a status update arrives for a message this portal never
  sent (e.g. sent via the Apps Script directly), it resolves the template
  text (local cache, then Meta API) and creates a local record so it still
  shows up here. Also does a crude keyword-based interest classifier
  (`Interested`/`Not Interested`/`Other` on words like "yes"/"haan"/"no"/
  "nahi") — much weaker signal than sales-agent's LLM-based lead scoring;
  do not assume parity between the two if a future integration compares
  them.
- **Media**: `uploadWhatsAppMedia` normalizes images via `sharp` (forces
  sRGB, re-encodes to 8-bit JPEG — works around Meta's error 131053 on
  CMYK/16-bit/WebP/HEIC/AVIF source images) and converts CSV uploads to XLSX
  before sending (Meta's Cloud API rejects `text/csv` outright).
- **Onboarding** (`src/app/onboarding/page.tsx`): per-Supabase-auth-user
  Meta credential entry (Phone Number ID, WABA ID, permanent access token,
  webhook verify token) written to `whatsapp_portal_configs`, plus a
  generated per-user webhook URL (`/api/webhook/{userId}`) to paste into
  Meta's app dashboard. The schema is genuinely multi-tenant (`user_id` on
  every table), but in practice this looks like one real tenant (Divine
  Empire) — don't assume multi-tenant features are exercised or tested
  beyond that one account.

## Database (Supabase — separate project, not `sales-agent`'s)

`schema.sql` in this repo is the reference (may not be 100% in sync with the
live DB — verify before relying on it for a migration). Tables, all prefixed
`whatsapp_portal_*`: `configs` (Meta credentials per user), `contacts`,
`conversations` (last-message preview + unread count), `messages` (direction,
type, status, media, reactions, interactive-reply fields, pricing/billing
category), `message_events` (raw status-transition log), `templates`,
`template_stats`, `pricing`. Plus `webhook_payloads` (raw Meta webhook
bodies, for debugging/backfill) and two read-oriented views:
`debug_inbox_messages` and `responses` (the shape `/api/sync-sheet` expects
from the Apps Script — see field names there before changing either side).

**Access-token storage**: `whatsapp_portal_configs.access_token` is a plain
`text` column — no encryption-at-rest visible in this schema. Only
`webhook_payloads` shows an explicit `ENABLE ROW LEVEL SECURITY` + policy in
`schema.sql`; the core tables (`configs`, `messages`, `contacts`,
`conversations`) show no RLS policy in this file. That may be configured
directly in Supabase and simply absent from this file, or it may be a real
gap — verify directly in the Supabase dashboard before treating either
possibility as settled. Don't add a policy speculatively without confirming
the actual state first.

**Env var risk, confirmed live on Vercel (2026-08-26, via `vercel env ls
--scope mis-thedivineemps-projects --project whatsapp-portal`)**:
`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` is stored in Vercel marked
**"Non-sensitive"** — visible in plaintext to anyone with project access,
unlike `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_WABA_ID` sitting
right next to it, which are correctly marked "Sensitive". Combined with the
`NEXT_PUBLIC_` name (Next.js's convention for vars safe to ship to the
browser), this is two independent weaknesses stacked on the one credential
that bypasses Supabase RLS entirely. `src/lib/supabase/server.ts`'s admin
client is the only place this key is read, and every current reference
(verified in source) is server-side only — `api/` route handlers and this
one server-only module — so it is not actively leaking today. But it is one
accidental client-component import away from shipping the service-role key
to every browser, and it is already stored non-confidentially regardless. If
you touch this: do not add a new client-side reference to it, and the real
fix is two steps on the live Vercel project — mark the var Sensitive, and
separately rename it off the `NEXT_PUBLIC_` prefix (with a matching code
change in `server.ts`) — check with the user before doing either, since both
touch production configuration on a live deployment.

## AI sales-agent hand-off (added 2026-08-26)

`src/app/api/webhook/[userId]/route.ts` now forwards inbound **text**
messages to the `sales-agent` service, which replies to the customer by
calling this portal's own `POST /api/send-message`. See
`forwardToSalesAgent()` at the top of that file.

Why the forward lives here and not in the Apps Script: **this portal is
Meta's registered webhook for the number.** That was verified against the
live database, not assumed — `whatsapp_portal_messages` has current
`direction=inbound` rows with `source='internal'` and `message_type` values
(`button`, `unsupported`) that only this handler's own switch produces. The
Google Apps Script (`sales-agent/app_scripts/`) still contains a `doPost`
webhook handler, but it is **legacy/dead for inbound traffic** — Meta no
longer calls it. An earlier attempt put the forward there and it would never
have fired.

Properties of the forward, all deliberate:
- **Text only.** Button/list taps are campaign clicks the Sheet flow owns;
  the agent must not talk over the campaign it supports. Reactions never
  reach it (they `continue` earlier).
- **New messages only** (`isNewMessage && !msgInsertError`). Meta retries
  webhooks; a retry must not produce a second AI reply on a billable channel.
- **Fire-and-forget with an 8s timeout**, all errors swallowed and logged.
  The message is already stored before this runs, so a slow or down agent can
  never delay Meta's ack or lose the message — an operator still sees it in
  the inbox.
- **Config**: Vercel env `SALES_AGENT_URL` and `SALES_AGENT_SECRET` (the
  latter must equal `WHATSAPP_INBOUND_SECRET` on the agent). Leaving
  `SALES_AGENT_URL` unset disables the whole thing — that is the kill switch,
  no redeploy needed.
- Nothing else in this portal changed. It remains the single writer of
  `whatsapp_portal_messages`, which is the entire reason the agent sends
  through it rather than calling Meta itself.

## CRM dashboard read path (added 2026-08-26)

`GET /api/conversations/[id]/messages` returns one thread oldest-first plus
the contact, for `sales-agent` to proxy into the CRM dashboard's WhatsApp tab.
It exists because this portal's own inbox reads `whatsapp_portal_messages`
straight from Supabase using the signed-in operator's session, and
`/api/logs` is auth-gated — so neither is reachable server-to-server.

The dashboard never touches this project's database or holds its credentials:
it calls `sales-agent`, which calls these endpoints. `/api/conversations/list`
and `/api/conversations/search` serve the same read path and were already
usable as-is.

Read-only. Sending stays on `/api/send-message`, which the AI agent uses so
this portal remains the single writer of `whatsapp_portal_messages`.

## Relationship to the sibling repos in this workspace

- **`sales-agent`** (`../sales-agent`): a separate AI sales agent backend,
  currently Telegram-only. Its own WhatsApp adapter is deliberately
  unimplemented, gated on this exact collision risk — see that repo's
  `CLAUDE.md` WhatsApp section. `sales-agent/app_script/app.gs` is a
  reference-only copy of the same Google Apps Script that talks to this
  portal's `/api/sync-sheet`.
- **`sales-agent-dashboard`** (`../sales-agent-dashboard`): the CRM
  dashboard for the sales-agent backend. Its WhatsApp tab is currently a
  deterministic, fixture-only preview with no connection to this portal, by
  explicit design (`.agents/improvement.md` §1, §8) — the WhatsApp
  number/webhook this portal owns cannot have a second consumer registered
  against it without a coordinated decision.
- **The collision risk, precisely**: this portal owns the live Meta webhook
  registration for Divine Empire's real WhatsApp Business number today. Meta
  allows exactly one webhook URL per number. Registering `sales-agent`'s
  webhook (or any other consumer) against that same number would silently
  break this portal's webhook (or vice versa) — not a hypothetical, a
  guaranteed outage for whichever side loses. Any change that touches Meta
  webhook registration for this number needs an explicit, coordinated
  decision from the user first; that decision has not been made as of
  2026-08-26.
- **As of 2026-08-26, the user's stated plan is to surface this portal's
  data inside `sales-agent-dashboard`'s WhatsApp tab.** The integration
  shape is NOT yet decided — candidates include a read-only view into this
  portal's Supabase from the dashboard, a new API surface exposed by this
  portal itself, or something else. Do not start building any specific
  integration from assumption; if you're an agent picking this up, check
  with the user for the actual decision before writing integration code in
  any of the three repos.

## Conventions

Plain npm (`npm run dev`/`npm run build`), not bun — do not introduce a bun
lockfile here just because the sibling repos use bun; this repo has its own
established tooling. No test suite currently present. `.env*` is gitignored;
this repo's own `.env` is not checked into git and was not read as part of
this audit — ask the user before reading or altering it.
