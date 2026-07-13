# PRD: BrewHub — Order-Ahead Platform for a National Coffee Chain

**Version**: 1.3 (draft for engineering review)
**Author**: Product — Consumer Ordering
**Target stack** (per platform team): TypeScript / Node services, React Native
clients, PostgreSQL, Redis.

## 1. Overview

BrewHub lets customers of our ~2,400-store coffee chain order and pay ahead
from their phone, customize drinks exactly as they can at the counter, earn
loyalty rewards, and pick up without waiting in line. Franchise stores run
one of three point-of-sale systems, and BrewHub must integrate with all of
them. This PRD covers the customer app backend and the store-facing order
pipeline. It replaces the pilot system built in 2023, which we are retiring
due to unmaintainable promotion logic and per-POS spaghetti.

## 2. Goals and non-goals

**Goals**

- G1: A customer can build, customize, pay for, and schedule an order in under 90 seconds.
- G2: Marketing can launch and retire promotions without engineering involvement.
- G3: Adding a new payment method or POS vendor takes weeks, not quarters.
- G4: Support agents can trace and safely reverse any order action.

**Non-goals (this release)**

- Delivery (we hand off to third-party delivery partners at the store; no courier logistics in scope).
- International markets. Leadership has discussed expansion to Canada "eventually," but there is no committed timeline, and requirements (bilingual labeling, different loyalty law) are unknown. Do not design for it now.
- In-store kiosk hardware.

## 3. Personas

- **Customer** — orders 2–5×/week, has saved favorites, cares about speed.
- **Barista** — sees an order ticket, marks preparation progress.
- **Store manager** — adjusts store hours, marks items out of stock.
- **Marketing operations** — authors promotions and campaigns.
- **Support agent** — investigates complaints, issues refunds and credits.

## 4. Functional requirements

### 4.1 Catalog and menu

- FR-1: The menu is a hierarchy: top-level categories (Drinks, Food, Merch)
  contain subcategories (Hot Coffee, Cold Brew, Bakery…), which contain
  items; marketing can also create **seasonal collections** that group
  arbitrary items and other collections (e.g., "Fall Menu" contains "Pumpkin
  Lineup" which contains items). Nesting depth is unbounded in the CMS.
- FR-2: Any node in the hierarchy can be hidden per store, per daypart, or
  per date range; hiding a group hides everything beneath it.
- FR-3: The app renders the menu, a search index, and a printable
  allergen sheet from the same hierarchy. Legal requires the allergen sheet
  to enumerate every purchasable item exactly once.

### 4.2 Drink customization

- FR-4: A drink starts from a base beverage and accumulates **modifiers**:
  milk substitution, extra shots (0–6), syrups (any combination, each with
  pump count), toppings, temperature, cup size. Each modifier adjusts price
  and nutrition independently; some modifiers are only valid on some bases
  (no foam on iced drinks).
- FR-5: The order ticket shown to the barista must list modifiers in the
  chain's canonical calling order (size → temp → shots → syrups → milk →
  toppings), regardless of the order the customer tapped them.
- FR-6: From one customized drink we must derive: customer-facing price,
  itemized receipt line, nutrition facts, and the barista ticket line.
  Finance has asked that new derivations (e.g., ingredient cost for margin
  reporting) be addable without touching drink-building code.

### 4.3 Cart, checkout, and scheduling

- FR-7: Carts persist across devices; a customer can build a cart on the
  phone and pay from the watch. Abandoned carts are kept 14 days.
- FR-8: Customers can save a fully-customized order as a **favorite** and
  reorder it in two taps; a favorite is a template — reordering copies it
  into a fresh cart where it can be further edited without altering the
  favorite.
- FR-9: Orders can be immediate or scheduled up to 7 days out. Scheduled
  orders are charged at release time, not at scheduling time.

### 4.4 Payments

- FR-10: Launch payment methods: credit/debit card (via Stripe), Apple Pay,
  Google Pay, and the chain's stored-value **gift card**. PayPal and Venmo
  are contracted for the quarter after launch; the payments team expects
  roughly one new method per year thereafter.
- FR-11: The gift card balance lives in a 2009-era internal service
  ("SVS") exposing a SOAP/XML API with its own auth handshake and
  amount-in-cents-as-string conventions. SVS cannot be modified. No SVS
  types or naming may leak outside the payment module — the pilot died
  partly because SVS XML structures were passed around the codebase.
- FR-12: A single order may split tender across gift card + one other
  method. Split rules: gift card always drains first; only one card-type
  method per order.
- FR-13: Checkout must not care which method(s) are in use.

### 4.5 Order lifecycle

- FR-14: Order states: `draft → submitted → paid → queued (at store) →
  preparing → ready → picked_up`, with `canceled` reachable from
  submitted/paid/queued and `refunded` reachable from any post-paid state.
- FR-15: What a customer may do depends on state: edit items (draft only),
  cancel with full refund (submitted/paid), cancel with store-manager
  approval (queued), no cancel once preparing. What the system does also
  differs by state: loyalty points accrue on `picked_up`; inventory is
  decremented on `queued`; the "I'm here" geofence ping is only meaningful
  in `ready`.
- FR-16: Invalid transitions (e.g., barista marks `ready` an order that was
  canceled a second earlier) must be rejected atomically and logged; the
  pilot's scattered status checks allowed double-refunds.

### 4.6 Promotions engine

- FR-17: Marketing authors promotion **eligibility rules** in a constrained
  expression language they already use in our email tool, e.g.
  `subtotal >= 15 and count(items where category = "espresso") >= 2 and
  daypart = "afternoon"`. Rules combine comparisons with `and`/`or`/`not`,
  numeric aggregates over cart items, and calendar predicates. Engineering
  will not review individual promotions; rules are authored, tested against
  sample carts, and published entirely from the marketing console.
- FR-18: Multiple promotions can be live. Each has a priority and a
  stacking class (`exclusive`, `stackable`, `loyalty-only`). At checkout,
  promotions are evaluated in priority order; an `exclusive` match stops
  further evaluation; `stackable` matches accumulate. Marketing reorders
  priorities weekly.
- FR-19: A promotion applies one effect: percentage off order, fixed amount
  off order, cheapest-qualifying-item free, or bonus loyalty points. Legal
  requires the receipt to show each applied promotion as its own line.

### 4.7 Notifications

- FR-20: Events that notify customers at launch: order ready, order
  canceled by store, gift card auto-reload completed, loyalty reward
  earned, scheduled-order charge failed. Product adds roughly one new
  notifying event per quarter (next up: "favorite item back in stock").
- FR-21: Channels at launch: push and email. SMS is committed for the
  quarter after launch (carrier contract signed); customer notification
  preferences select channels per event category.
- FR-22: Every event kind must be deliverable over every channel a user has
  enabled; adding an event must not require touching channel code, and
  adding a channel must not require touching event code.
- FR-23: Loyalty accrual (4.8) and the store dashboard's live order board
  also react to order events. These in-process reactions and customer
  notifications should share one eventing mechanism; the order pipeline
  must not know who is listening.

### 4.8 Loyalty

- FR-24: Points accrue per dollar on pickup, with multipliers from
  promotions. Reward tiers (Green/Gold) change earn rates. Tier thresholds
  and earn rates are plain numbers that marketing tunes monthly — they are
  configuration, not logic.

### 4.9 Store integration (POS)

- FR-25: Franchise stores run one of three POS systems: **Ordinal**
  (modern REST + webhooks), **RegisterPro** (TCP socket, fixed-width
  frames, polling only), and **CafeSuite** (local file-drop + FTP,
  batch-oriented, 30–90s latency). Corporate stores will migrate to
  Ordinal over ~3 years; franchisees cannot be forced to switch, and the
  POS vendor list has grown, not shrunk, historically.
- FR-26: For the order pipeline, "send order to store" is one operation
  regardless of vendor: it must reserve inventory, print/display the
  ticket, and return an ETA. Internally that touches the vendor link, the
  store's inventory ledger, and the ticket formatter — callers (checkout,
  scheduler, support tools) must see one call.
- FR-27: RegisterPro and CafeSuite links are flaky. All POS calls need
  timeout, bounded retry with backoff, and circuit-breaking; POS request/
  response pairs must be logged for dispute resolution. These behaviors
  apply uniformly across vendors and must not be reimplemented per vendor.

### 4.10 Support, audit, and reversal

- FR-28: Every customer-visible mutation (order placed, edited, canceled,
  refund issued, points adjusted, gift card loaded) is recorded in an audit
  log with actor, timestamp, and parameters, and support can view the
  sequence for any order.
- FR-29: Support agents can **reverse** reversible actions: a refund can be
  reversed (points adjustment can be reversed) within 24h; each action
  knows whether and how it can be undone. New action types ship monthly as
  support tooling grows.
- FR-30: The same action objects are what the scheduler executes for
  FR-9's delayed charges — a scheduled order is an action queued for later.

## 5. Non-functional requirements

- NFR-1: Peak load is the 7–9 AM window: 400 orders/min chain-wide,
  p99 checkout API latency < 800 ms.
- NFR-2: Store menu + hierarchy reads are ~200× writes. Menu responses
  are cached (Redis, 60s TTL) with per-store invalidation on manager edits.
  Callers should be unaware whether a read was served from cache.
- NFR-3: All money amounts are integer cents; all timestamps UTC.
- NFR-4: Regional tax rates, tipping defaults, and rounding rules vary by
  US state and are maintained by finance in a versioned table. These are
  lookup data with an effective date — nothing more.
- NFR-5: The services read runtime configuration (feature flags, API keys,
  cache TTLs) at startup and on SIGHUP. One engineer on the platform team
  has proposed "a global AppConfig singleton everyone can import"; the
  architecture review flagged testability concerns and asked this PRD's
  design phase to settle the question.

## 6. Success metrics

- 30% of transactions through the app within 12 months.
- Promotion time-to-launch < 1 day (currently 3 weeks).
- New payment method integration < 6 engineer-weeks (SVS took 9 months).
- Zero double-refund incidents (pilot had 11 last year).

## 7. Milestones

- M1 (launch): 4.1–4.6, Ordinal POS only, push+email notifications.
- M2 (launch +1q): RegisterPro + CafeSuite, SMS channel, PayPal/Venmo.
- M3 (launch +2q): support reversal tooling (4.10 full), scheduled orders GA.
