import Link from 'next/link';
import { formatTimestamp, formatUsd, ratio, shortHash, titleCase } from '@/lib/format';
import { deriveLeaseState, toneForExecution, toneForOutcome, toneForTrustZone } from '@/lib/runtime';
import type { ProofPacket, RoundArtifactIndexEntry } from '@/lib/types';
import { OperatorConsole } from '@/components/operator-console';
import { TopWalletConnect } from '@/components/top-wallet-connect';

type SubmissionPageProps = {
  packet: ProofPacket | null;
  lease: ProofPacket['lease'] | null;
  currentOperator?: ProofPacket['operator'] | null;
  rounds: RoundArtifactIndexEntry[];
  latestSuccessRound: RoundArtifactIndexEntry | null;
  latestBlockedRound: RoundArtifactIndexEntry | null;
  latestSuccessPacket: ProofPacket | null;
  latestBlockedPacket: ProofPacket | null;
  controller: {
    address: string | null;
    source: 'local' | 'onchain';
    latestRequestId: string | null;
    latestTxHash: string | null;
    actionsEnabled: boolean;
    runRoundEnabled: boolean;
    note: string | null;
  };
};

function modeMeaning(mode?: string | null): string {
  switch (mode) {
    case 'active':
      return 'Agent may execute if each request stays inside your rule.';
    case 'review':
      return 'Every request should pause for human review before execution.';
    case 'paused':
      return 'Execution is stopped until you press Resume.';
    default:
      return 'No operator mode has been set yet.';
  }
}

function nextGateLabel(mode?: string | null, leaseStatus?: string | null): string {
  if (leaseStatus !== 'active') {
    return 'No action can execute until you issue an active rule.';
  }
  switch (mode) {
    case 'review':
      return 'Next request should wait for human review.';
    case 'paused':
      return 'Next request should be blocked by operator pause.';
    case 'active':
      return 'Next request may execute if it stays inside budget and policy.';
    default:
      return 'Operator posture is not set yet.';
  }
}

export function SubmissionPage({
  packet,
  lease,
  currentOperator,
  rounds,
  latestSuccessRound,
  latestBlockedRound,
  latestSuccessPacket,
  latestBlockedPacket,
  controller,
}: SubmissionPageProps) {
  const liveLease = lease ?? packet?.lease ?? null;
  const currentMode = currentOperator?.mode ?? packet?.operator.mode ?? null;
  const leaseState = deriveLeaseState(liveLease, currentMode ?? undefined);
  const spentUsd = packet?.usage.spent24hUsd ?? 0;
  const dailyBudgetUsd = liveLease?.dailyBudgetUsd ?? 0;
  const remainingDailyUsd = packet?.usage.remainingDailyUsd ?? dailyBudgetUsd;
  const spentPercent = ratio(spentUsd, dailyBudgetUsd);
  const remainingPercent = ratio(remainingDailyUsd, dailyBudgetUsd);

  const historicalReferencePacket = latestSuccessPacket ?? latestBlockedPacket ?? packet;
  const historicalLeaseId = historicalReferencePacket?.lease.leaseId ?? latestSuccessRound?.leaseId ?? latestBlockedRound?.leaseId ?? null;
  const historicalWallet = historicalReferencePacket?.lease.walletAddress ?? null;
  const historicalProofMatchesLiveLease = Boolean(
    liveLease?.leaseId &&
    historicalLeaseId &&
    liveLease.leaseId === historicalLeaseId
  );
  const showHistoricalMismatch = Boolean(
    liveLease &&
    historicalLeaseId &&
    !historicalProofMatchesLiveLease
  );

  const proofOutcomeTone = toneForOutcome(historicalReferencePacket?.decision.outcome);
  const proofZoneTone = toneForTrustZone(historicalReferencePacket?.decision.trustZone);
  const proofExecutionTone = toneForExecution(historicalReferencePacket?.execution.status);
  const approvedCount = rounds.filter((round) => round.outcome === 'approve').length;
  const blockedCount = rounds.filter((round) => round.outcome === 'block').length;
  const resizeCount = rounds.filter((round) => round.outcome === 'resize').length;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo-icon">B</div>
          <div>
            <div className="logo-text">Boundless</div>
            <div className="logo-sub">Agent Execution Guard</div>
          </div>
        </div>
        <div className="header-right">
          <nav className="nav">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/submission" className="nav-link active">Dashboard</Link>
            <Link href="/proof" className="nav-link">Proof</Link>
          </nav>
          <TopWalletConnect />
        </div>
      </header>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="card sidebar-card">
            <div className="card-header">
              <h2>Current Rule</h2>
              <span className={`status-badge ${leaseState.tone}`}>{leaseState.label}</span>
            </div>
            <div className="sidebar-meta">
              <div className="meta-item">
                <span className="meta-label">Wallet</span>
                <span className="meta-value mono">{shortHash(liveLease?.walletAddress)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Daily Budget</span>
                <span className="meta-value">{formatUsd(dailyBudgetUsd)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Per-Tx Limit</span>
                <span className="meta-value">{formatUsd(liveLease?.perTxUsd ?? 0)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Operator</span>
                <span className="meta-value">{titleCase(currentMode ?? 'idle')}</span>
              </div>
            </div>
            <div className="budget-bar">
              <div className="bar-segment spent" style={{ width: `${spentPercent}%` }} />
              <div className="bar-segment left" style={{ width: `${remainingPercent}%` }} />
            </div>
            <div className="budget-labels">
              <span>Spent {formatUsd(spentUsd)}</span>
              <span className="remaining">{formatUsd(remainingDailyUsd)} left</span>
            </div>
          </div>

          <div className="card sidebar-card compact">
            <div className="card-header">
              <h2>Operator Mode</h2>
            </div>
            <div className="mode-selector">
              <button className={`mode-btn ${currentMode === 'active' ? 'active' : ''}`}>
                <span className="mode-dot green"></span>
                Active
              </button>
              <button className={`mode-btn ${currentMode === 'review' ? 'active' : ''}`}>
                <span className="mode-dot amber"></span>
                Review
              </button>
              <button className={`mode-btn ${currentMode === 'paused' ? 'active' : ''}`}>
                <span className="mode-dot red"></span>
                Paused
              </button>
            </div>
            <p className="mode-hint">{modeMeaning(currentMode)}</p>
          </div>
        </aside>

        <main className="dashboard-main">
          <div className="stats-bar">
            <div className="stat-card">
              <div className="stat-label">Rule Status</div>
              <div className={`stat-value ${leaseState.tone === 'ok' ? 'green' : 'amber'}`}>{leaseState.label}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Budget Left</div>
              <div className="stat-value lime">{formatUsd(remainingDailyUsd)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Approved</div>
              <div className="stat-value green">{approvedCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Blocked</div>
              <div className="stat-value amber">{blockedCount}</div>
            </div>
          </div>

          <OperatorConsole
            leaseId={liveLease?.leaseId}
            leaseStatus={liveLease?.status}
            operatorMode={currentMode}
            latestSuccessTxHash={latestSuccessRound?.txHash}
            latestBlockedReason={latestBlockedPacket?.decision.rationale}
            controllerAddress={controller.address}
            controllerSource={controller.source}
            governedWallet={liveLease?.walletAddress}
            baseAsset={liveLease?.baseAsset}
            perTxUsd={liveLease?.perTxUsd}
            dailyBudgetUsd={liveLease?.dailyBudgetUsd}
            allowedAssets={liveLease?.allowedAssets}
            allowedProtocols={liveLease?.allowedProtocols}
            actionsEnabled={controller.actionsEnabled}
            runRoundEnabled={controller.runRoundEnabled}
            controllerNote={controller.note}
          />

          {showHistoricalMismatch ? (
            <div className="response-banner error">
              Historical proof is from an older rule. Live wallet: {shortHash(liveLease?.walletAddress)}
            </div>
          ) : null}

          <div className="card">
            <div className="card-header">
              <h2>Latest Activity</h2>
            </div>
            <div className="activity-feed">
              {rounds.length > 0 ? (
                rounds.slice(0, 5).map((round) => (
                  <div key={`${round.generatedAt}-${round.requestId}-feed`} className="activity-row">
                    <div className="activity-main">
                      <span className={`pill ${toneForOutcome(round.outcome)}`}>{titleCase(round.outcome)}</span>
                      <span className="activity-summary">{round.summary}</span>
                    </div>
                    <div className="activity-meta">
                      <span>{formatTimestamp(round.generatedAt)}</span>
                      <span className="mono">{shortHash(round.txHash)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No activity yet</div>
              )}
            </div>
          </div>

          <details className="card advanced-panel">
            <summary>View History</summary>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Outcome</th>
                  <th>Tx</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {rounds.length > 0 ? (
                  rounds.map((round) => (
                    <tr key={`${round.generatedAt}-${round.requestId}`}>
                      <td>{formatTimestamp(round.generatedAt)}</td>
                      <td>
                        <span className={`pill ${toneForOutcome(round.outcome)}`}>
                          {titleCase(round.outcome)}
                        </span>
                      </td>
                      <td className="mono">{shortHash(round.txHash)}</td>
                      <td className="history-summary-cell">{round.summary}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ color: 'var(--s2)' }}>No rounds recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </details>
        </main>
      </div>

      <div className="footer">
        Built on <a href="#">X Layer</a> · Reads the controller contract plus runtime proof artifacts
      </div>
    </div>
  );
}
