# kini Plans Portal

Internal frontend prototype for browsing and reviewing selected TELUS API information.

Built with **Next.js** (App Router) and React. Not a customer-facing product.

---

## Getting started

### Requirements

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

---

## API endpoints

The UI calls these Next.js routes (mock data by default):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/plans` | List plan IDs and names |
| `GET` | `/api/v1/plans/:id` | Full plan details by ID |

Example:

```bash
curl http://localhost:3000/api/v1/plans
curl http://localhost:3000/api/v1/plans/offering_v1.0_c09df907-8cc8-498e-bc39-807c50edd458
```

Data comes from CCP catalogue exports in `src/data/`:
- `main-plan-prepaid.json` — Category list (`productOfferingRef`, 39 plans)
- `product-offerings.json` — full ProductOffering details for all 39 plans

`GET /api/v1/plans/:id` loads from `product-offerings.json`.

### Connect a real API later

All upstream/fake API logic lives in one file:

**`src/lib/plans-api.ts`**

1. Copy `.env.example` → `.env.local`
2. Set:

```bash
PLANS_API_BASE_URL=https://your-real-api.example/api/v1
```

3. Restart `npm run dev`

That flips `USE_REAL_API` on. Fake blocks can be deleted afterward.
If the JSON shape differs, edit the parsing in that same file.

---

## Project structure

```
src/
  app/
    api/v1/plans/      # API route handlers
    layout.tsx
    page.tsx
  components/          # Portal UI
  lib/
    api.ts             # UI → /api/v1/* fetch helpers
    plans-api.ts       # 👈 fake/real API calls (edit this)
    mock-data.ts       # Sample plans for the fake API
    types.ts

```

---

## Demo sign-in

- Email: `kini@test.com`
- Password: `kini2026`

---

## Tech stack

- Next.js 15
- React 18
- Tailwind CSS 4
- Lucide icons
- Recharts

---

**Product:** kini Plans Portal  
**Status:** Frontend prototype — ready for review
