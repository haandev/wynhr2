# WynHR 2

**Experiment #2** — a CoreHR + PTO application built on [Wyndbase](https://dev.wyndbase.dev) by an LLM agent, to measure how well Wyndbase can be discovered and used from its tools and documentation alone.

Live: **https://wynhr2.pages.dev** · Base: `wyndbase://dev.wyndbase.dev/wynhr`

## What it does

- **Employee master data** — required fields, immutable employee ID, every job/org field effective-dated with a reason. *Changes* open a new period; *corrections* fix a period in place. Active ↔ Leave and Active → Terminated are guarded by a state machine.
- **Org structure** — departments and product teams with effective-dated names, heads and parents; reporting tree; approval routing always follows the current manager.
- **PTO** — policies by country and employment type, per-pay-period accruals (FTE- and hire-date-prorated, annual cap, leave rule), retroactive recalculation with preview, manual adjustments with reasons, public holidays (copy year → edit → activate).
- **Requests & approvals** — partial days (2 h minimum), balance enforced in the database, manager approval, HR override, inbox notifications with toasts (Wyndbase built-in inbox) and email.
- **Security** — row, cell and transition rules in the database: salary, personal email, addresses and termination reasons are HR-only; HR managers are scoped to their office. Reports and exports run under the same rules.
- **Audit & GDPR** — who changed what (before/after) from Wyndbase's change log, logged exports (CSV / XLSX / PDF with generated-by / generated-at / filters), subject access export.

## Stack

React + Vite + TanStack Query, `@wyndbase/sdk` with generated types (`wyndbase typegen`). There is no backend server of our own: the backend is the Wyndbase schema, access rules, triggers, flows and named queries.

## Develop

```bash
bun install          # .npmrc points @wyndbase at https://dev.wyndbase.dev/npm/
bunx wyndbase login wyndbase://dev.wyndbase.dev
bunx wyndbase pull   # model + types
bun run dev          # http://localhost:5173
```

Signs in through the OAuth client `wynhr-web` (redirects `http://localhost:5173/login` and `https://wynhr2.pages.dev/login`).
