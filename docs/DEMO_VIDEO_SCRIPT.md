# Demo Video Script

## Length

60 to 90 seconds.

## Shot 1 - Problem

"If agents are going to spend, execute, and trade autonomously, humans need more than a dashboard. They need a lease."

Show the README header or submission page hero.

## Shot 2 - Lease issuance

Run:

```bash
npm run lease:issue
```

Narration:

"This lease defines exactly what the agent can do: which wallet it can use, which assets and protocols are allowed, how much it can spend per transaction, how much it can spend per day, and when the authority expires."

## Shot 3 - Treasury and wallet preflight

Run:

```bash
npm run preflight:treasury
```

Narration:

"The project reuses the live Agentic Wallet and X Layer execution path already running in this workspace."

## Shot 4 - Live round

Run:

```bash
npm run round:live
```

Narration:

"The agent submits a request. The lease checks wallet scope, asset allowlist, protocol allowlist, counterparty allowlist, price impact, and budget. Only then does live X Layer execution proceed."

If a tx is broadcasted, point at the tx hash and explorer URL.

## Shot 5 - Proof surface

Run:

```bash
npm run status:latest
npm run demo:serve
```

Open:

- `http://127.0.0.1:4312/submission.html`
- `http://127.0.0.1:4312/proof-dashboard.html`

Narration:

"Every lease round writes a receipt and a proof packet. Judges can inspect the lease envelope, request, decision, and onchain result in one place."

## Closing line

"X Layer Trust Leases turns agent execution from open-ended wallet access into bounded, revocable authority."
