# X Layer Trust Leases

![Track](https://img.shields.io/badge/Track-Human%20Track%20%7C%20X%20Layer%20Arena-0f766e)
![Network](https://img.shields.io/badge/Network-X%20Layer%20Mainnet-111827)
![Primitive](https://img.shields.io/badge/Primitive-Execution%20Lease-c2410c)
![Scope](https://img.shields.io/badge/Scope-Wallet%20%7C%20Budget%20%7C%20Protocol%20%7C%20Expiry-2563eb)

Temporary, bounded, revocable execution authority for live X Layer agents.

> If agents are going to spend, execute, and trade autonomously, humans need more than a dashboard.
>
> They need a lease: a short-lived authority envelope that defines which wallet the agent can use, what it can trade, how much it can spend, which counterparties it can touch, when the authority expires, and what proof must come back.

## 30-Second Pitch

X Layer Trust Leases is a pre-execution governance layer for X Layer agents.

A human issues a lease.
The agent submits a request against that lease.
The lease checks wallet scope, asset allowlist, protocol allowlist, counterparty allowlist, per-tx budget, daily budget, expiry, and route quality.
Only then does live X Layer execution proceed.

This project is the missing middle between:
- giving an agent a full wallet
- manually approving every action

![Submission Surface](docs/assets/submission-hero.png)

![Proof Dashboard](docs/assets/proof-dashboard-hero.png)

## For Hackathon Judges

> **Judge Summary**
>
> - **What this is:** a lease primitive for agent execution on X Layer, not another trading bot
> - **What is bounded:** wallet, budget, assets, protocols, counterparties, expiry
> - **What is different:** governance sits in the pre-execution path rather than only reading logs after the fact
> - **Execution path:** reused from the live `xlayer-strategy-office` and shared Agentic Wallet flow already running in this workspace
> - **Human posture:** issue, pause, review, resume, and revoke without giving full wallet access

### Current proof snapshot

| Field | Value |
|---|---|
| Governed wallet | `0xdbc8e35ea466f85d57c0cc1517a81199b8549f04` |
| Active consumer | `strategy-office` |
| Active lease | `lease_7997019c-c5b8-4b8a-9104-589ba18ca3ae` |
| Latest outcome | `resize` |
| Latest execution | `broadcasted` |
| Latest tx | [`0x5289c0f232e55e9d053ffee4d2e3269e2e2833c3cea41beff9c0ea476bd2d9f3`](https://www.oklink.com/xlayer/tx/0x5289c0f232e55e9d053ffee4d2e3269e2e2833c3cea41beff9c0ea476bd2d9f3) |
| Latest receipt | [`examples/latest-receipt.sample.json`](examples/latest-receipt.sample.json) |
| Latest proof packet | [`examples/latest-round.sample.json`](examples/latest-round.sample.json) |

### Quick links

| Item | Link |
|---|---|
| Latest proof JSON | [examples/live-proof-latest.json](examples/live-proof-latest.json) |
| Proof dashboard sample | [examples/proof-dashboard.sample.html](examples/proof-dashboard.sample.html) |
| Submission page sample | [examples/submission.sample.html](examples/submission.sample.html) |
| Active lease sample | [examples/active-lease.sample.json](examples/active-lease.sample.json) |
| Latest receipt sample | [examples/latest-receipt.sample.json](examples/latest-receipt.sample.json) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Deployment runbook | [docs/DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md) |
| OpenClaw runbook | [docs/OPENCLAW_RUNBOOK.md](docs/OPENCLAW_RUNBOOK.md) |

## Why This Project Exists

Current agent infrastructure usually forces one of two bad choices:

1. full wallet access
2. endless manual approval

A trust lease creates a third option:

```text
human issues lease
-> agent requests execution
-> lease verifies scope and budget
-> allowed requests execute
-> receipt and proof come back
```

## Lease Model

Each lease defines:
- wallet scope
- allowed assets
- allowed protocols
- allowed counterparties
- allowed actions
- per-tx budget
- daily budget
- expiry time
- proof requirement

A lease is not permanent delegation.
It is temporary operating authority.

## Proof Table

| Proof layer | What it proves | Artifact |
|---|---|---|
| Lease envelope | Human-defined wallet, budget, protocol, counterparty, and expiry scope exists as an explicit authority object | [examples/active-lease.sample.json](examples/active-lease.sample.json) |
| Request packet | The consumer submits a structured request instead of free-form wallet access | [examples/latest-round.sample.json](examples/latest-round.sample.json) |
| Decision layer | The lease can approve, resize, block, or defer to human review before execution | [examples/live-proof-latest.json](examples/live-proof-latest.json) |
| Receipt layer | Every round writes a receipt with spend, tx hash, and note | [examples/latest-receipt.sample.json](examples/latest-receipt.sample.json) |
| UI surface | Judges can inspect the same proof through a dashboard and submission page | [examples/proof-dashboard.sample.html](examples/proof-dashboard.sample.html) |

## What Is Reused

This repo deliberately reuses working components from existing live X Layer projects in this workspace:

- `xlayer-strategy-office`
  - OnchainOS CLI integration
  - wallet balance and quote parsing
  - live swap execution path
  - proof dashboard and submission surface pattern
- `xlayer-agent-control-tower`
  - operator posture model
  - human governance language
  - proof-first submission framing

This is copy-heavy on purpose. The goal is speed plus reliability, not novelty for its own sake.

## Current Workflow

```text
issue lease
-> read treasury
-> derive candidate request
-> check lease envelope
-> approve / resize / block / human_approval
-> optional live X Layer execution
-> write receipt
-> render proof dashboard + submission surface
```

## Repository Layout

```text
src/
  lease/        lease issuance, storage, and policy checks
  runtime/      main lease round runner and artifact index
  onchainos/    reused OnchainOS CLI wrapper
  portfolio/    reused wallet/quote/execute path
  historian/    proof JSON and HTML rendering
scripts/
  issue-lease.ts
  preflight:treasury
  live-round.ts
  render-proof.ts
examples/
  active-lease.sample.json
  latest-receipt.sample.json
  latest-round.sample.json
  proof-dashboard.sample.html
  submission.sample.html
```

## Environment

This project is designed to reuse the same local setup as `xlayer-strategy-office` and `xlayer-agent-fight-club`:

- same shared Agentic Wallet address when available
- same X Layer settlement env values
- local machine can use proxy `7890`
- OpenClaw / server should run direct, no proxy

## Commands

```bash
npm install
npm run check
npm run lease:issue
npm run preflight:treasury
npm run round:live
npm run proof:render
npm run status:latest
npm run demo:serve
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment Runbook](docs/DEPLOYMENT_RUNBOOK.md)
- [OpenClaw Runbook](docs/OPENCLAW_RUNBOOK.md)
- [Demo Video Script](docs/DEMO_VIDEO_SCRIPT.md)
- [Submission Form Answers](docs/SUBMISSION_FORM_ANSWERS.md)
- [Reference Repos](docs/REFERENCE_REPOS.md)

## What Submission Review Should Notice

- this is a human-track governance primitive
- it is compatible with existing live X Layer agents
- it moves from post-fact monitoring toward pre-execution control
- it is easy to audit because leases and receipts are explicit files

## Honest Scope

What is already implemented:
- lease issuance
- operator posture
- pre-execution checks
- receipt writing
- proof site generation
- reuse of live X Layer execution path

What still improves the project further:
- contract-native lease enforcement on X Layer
- multi-agent countersigning like Chorus
- trust score / endorsement layer like Universal Trust
- escrow settlement path for mandate-style work
