# Deployment Runbook

## Local

1. Copy `.env.example` to `.env.local`
2. Reuse the same X Layer env values already used by `xlayer-strategy-office`
3. If local networking needs it, use proxy `7890`
4. Run:

```bash
npm install
npm run lease:issue
npm run preflight:treasury
npm run round:live
npm run proof:render
npm run demo:serve
```

## Server / OpenClaw

- do not set proxy
- keep `LEASE_EXECUTION_MODE=live`
- reuse the same Agentic Wallet login or settlement key path already working on the server
- schedule `npm run round:live && npm run proof:render`

## Submission surfaces

- `http://127.0.0.1:4312/submission.html`
- `http://127.0.0.1:4312/proof-dashboard.html`
