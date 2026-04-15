# Contract Runbook

## Goal

Deploy the `TrustLeaseController` contract to X Layer and enable contract-driven lease, operator, and receipt state.

## Contract project

The Solidity project lives under:

`contracts/`

Useful commands from the repo root:

```bash
npm run contracts:compile
npm run contracts:deploy:testnet
npm run contracts:deploy:mainnet
```

## Required environment

Add to `.env.local`:

```bash
LEASE_CHAIN_SYNC_ENABLED=true
LEASE_CONTROLLER_ADDRESS=0x...
LEASE_CONTROLLER_WRITER_PRIVATE_KEY=0x...
LEASE_CONTROLLER_ARTIFACT_BASE_URI=https://your-proof-host.example/trust-leases
```

Fallback behavior:
- if `LEASE_CHAIN_SYNC_ENABLED=false`, the project stays in local artifact mode
- if `LEASE_CONTROLLER_ADDRESS` is missing, the dashboard falls back to local runtime state only

## What syncs onchain

1. Lease issuance
- `scripts/issue-lease.ts`
- mirrors the newly issued lease into `TrustLeaseController.issueLease`

2. Lease revoke / expire
- `scripts/revoke-lease.ts`
- mirrors revoke into `TrustLeaseController.setLeaseStatus`

3. Operator posture
- `scripts/operator-command.ts`
- mirrors pause / review / resume into `TrustLeaseController.setOperatorMode`

4. Receipt anchor
- `scripts/live-round.ts`
- after writing the latest local proof packet, anchors:
  - leaseId
  - requestId
  - decision outcome
  - execution status
  - spentUsd
  - txHash
  - proofHash
  - artifactUri

## Current architecture split

Onchain:
- active lease state
- operator posture
- latest receipt anchor per consumer
- budget usage counters

Offchain:
- full proof packet JSON
- full checks array
- rendered proof dashboard HTML
- submission page HTML

This split is intentional. The chain stores the primitive and immutable anchors. The app and artifact layer keep the high-density proof surface.

## Smoke-test flow

After deployment and env setup:

```bash
npm run lease:issue
npm run operator:review -- \"smoke test\"
npm run operator:resume -- \"restore\"
npm run round:live
```

Expected result:
- local files update under `data/trust-leases`
- controller tx hashes are printed in script output
- dashboard reads controller-backed lease/operator state on the next page load
