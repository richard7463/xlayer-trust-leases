import Link from 'next/link';
import { formatTimestamp, formatUsd, shortHash, titleCase } from '@/lib/format';
import { deriveLeaseState, toneForExecution, toneForOutcome, toneForTrustZone } from '@/lib/runtime';
import type { ProofPacket, RoundArtifactIndexEntry } from '@/lib/types';

type LandingPageProps = {
  packet: ProofPacket | null;
  lease: ProofPacket['lease'] | null;
  currentOperator?: ProofPacket['operator'] | null;
  rounds: RoundArtifactIndexEntry[];
  latestSuccessRound?: RoundArtifactIndexEntry | null;
  latestBlockedRound?: RoundArtifactIndexEntry | null;
  latestSuccessPacket?: ProofPacket | null;
  latestBlockedPacket?: ProofPacket | null;
  controller?: {
    address: string | null;
    source: 'local' | 'onchain';
    latestRequestId: string | null;
    latestTxHash: string | null;
  };
};

export default function LandingPage({ packet, lease, currentOperator, rounds }: LandingPageProps) {
  const liveLease = lease ?? packet?.lease ?? null;
  const leaseState = deriveLeaseState(liveLease, currentOperator?.mode ?? packet?.operator.mode);
  const remainingBudget = packet?.usage.remainingDailyUsd ?? liveLease?.dailyBudgetUsd ?? 0;
  const outcomeTone = toneForOutcome(packet?.decision.outcome);
  const executionTone = toneForExecution(packet?.execution.status);
  const zoneTone = toneForTrustZone(packet?.decision.trustZone);

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">T</div>
          <div>
            <div className="logo-text">Trust Leases</div>
            <div className="logo-sub">X Layer Agent Guard</div>
          </div>
        </div>
        <nav className="nav">
          <Link href="/" className="nav-link active">Home</Link>
          <Link href="/submission" className="nav-link">Dashboard</Link>
          <Link href="/proof" className="nav-link">Proof</Link>
        </nav>
      </header>

      <section className="hero">
        <h1>
          Give Agents a <span>Lease</span>,<br />
          Not Your Wallet
        </h1>
        <p>
          Temporary authority for an agent on X Layer, bounded by wallet, budget, protocol, counterparty, and expiry.
          Every round writes a proof packet instead of hiding behind a static demo.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/submission" className="btn-lime">
            Open Live Dashboard
          </Link>
          <Link href="/proof" className="btn-outline">
            Inspect Proof Packet
          </Link>
        </div>
      </section>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-label">Lease State</div>
          <div className={`stat-value ${leaseState.tone === 'ok' ? 'green' : leaseState.tone === 'warn' ? 'amber' : ''}`}>
            {leaseState.label}
          </div>
          <div className="stat-note">{liveLease ? shortHash(liveLease.leaseId) : 'No lease file yet'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Per-Tx Limit</div>
          <div className="stat-value lime">{formatUsd(liveLease?.perTxUsd ?? 0)}</div>
          <div className="stat-note">{liveLease?.consumerName ?? 'No consumer bound'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Daily Budget</div>
          <div className="stat-value">{formatUsd(liveLease?.dailyBudgetUsd ?? 0)}</div>
          <div className="stat-note">Remaining {formatUsd(remainingBudget)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Latest Outcome</div>
          <div className={`stat-value ${outcomeTone === 'ok' ? 'green' : outcomeTone === 'warn' ? 'amber' : ''}`}>
            {packet ? titleCase(packet.decision.outcome) : 'No Round'}
          </div>
          <div className="stat-note">{packet ? formatTimestamp(packet.generatedAt) : 'Issue a lease and run the first round'}</div>
        </div>
      </div>

      {packet ? (
        <>
          <div className="status-row">
            <span className="pill ok">Chain {packet.treasury.chainId}</span>
            <span className="pill ok">Consumer: {packet.request.consumerName}</span>
            <span className={`pill ${outcomeTone}`}>Decision: {titleCase(packet.decision.outcome)}</span>
            <span className={`pill ${zoneTone}`}>Zone: {titleCase(packet.decision.trustZone)}</span>
            <span className={`pill ${executionTone}`}>Execution: {titleCase(packet.execution.status)}</span>
          </div>

          <div className="grid-2">
            <div className="card">
              <h2>Current Round</h2>
              <div className="info-grid">
                <div className="info-card">
                  <div className="k">Request</div>
                  <div className="v">{packet.request.fromToken} → {packet.request.toToken}</div>
                </div>
                <div className="info-card">
                  <div className="k">Requested</div>
                  <div className="v">{formatUsd(packet.request.notionalUsd)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Allowed</div>
                  <div className="v">{formatUsd(packet.decision.finalNotionalUsd)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Wallet</div>
                  <div className="v mono">{shortHash(packet.lease.walletAddress)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Operator</div>
                  <div className="v">{titleCase(packet.operator.mode)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Tx Hash</div>
                  <div className="v mono">{shortHash(packet.execution.txHash)}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2>What Is Real Right Now</h2>
              <p>{packet.decision.rationale}</p>
              <p>{packet.execution.note}</p>
              <p style={{ marginBottom: 0 }}>
                Latest artifact: {formatTimestamp(packet.generatedAt)}. Recent rounds recorded: {rounds.length}.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <h2>No Live Proof Yet</h2>
          <p>
            {liveLease
              ? 'A lease file exists, but no round has written a live proof packet yet.'
              : 'This app has no generated lease or round data yet.'}
          </p>
          <div className="info-grid">
            <div className="info-card">
              <div className="k">Lease</div>
              <div className="v mono">{shortHash(liveLease?.leaseId)}</div>
            </div>
            <div className="info-card">
              <div className="k">Consumer</div>
              <div className="v">{liveLease?.consumerName ?? 'Not set'}</div>
            </div>
            <div className="info-card">
              <div className="k">Next Step</div>
              <div className="v">Open Dashboard to issue a lease and run a governed round</div>
            </div>
          </div>
        </div>
      )}

      <div className="features-grid">
        <div className="feature-card">
          <h3>Wallet Scope</h3>
          <p>The lease is tied to one wallet address instead of broad account access.</p>
        </div>
        <div className="feature-card">
          <h3>Budget Bounds</h3>
          <p>Per-tx and daily caps are checked before an execution can proceed.</p>
        </div>
        <div className="feature-card">
          <h3>Protocol Allowlist</h3>
          <p>Only the approved routes and counterparties survive policy evaluation.</p>
        </div>
        <div className="feature-card">
          <h3>Expiry Control</h3>
          <p>Expired authority now stays expired until a human issues a new lease.</p>
        </div>
        <div className="feature-card">
          <h3>Operator Posture</h3>
          <p>Pause and review mode surface directly in the runtime state and proof packet.</p>
        </div>
        <div className="feature-card">
          <h3>Proof Trail</h3>
          <p>Every round is read from generated artifacts under `data/trust-leases`.</p>
        </div>
      </div>

      <div className="final-cta">
        <h2>Open the live surface</h2>
        <p>
          The dashboard and proof pages now render current lease artifacts instead of fixed demo scenarios.
        </p>
        <Link href="/submission" className="btn-lime" style={{ marginTop: '16px' }}>
          Go To Dashboard
        </Link>
      </div>

      <div className="footer">
        Built on <a href="#">X Layer</a> · Latest round {packet ? formatTimestamp(packet.generatedAt) : 'not generated'}
      </div>
    </div>
  );
}
