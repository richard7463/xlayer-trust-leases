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
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-label">Network</span>
          <span className="topbar-value">X Layer {packet?.treasury.chainId ?? 196}</span>
        </div>
        <div className="topbar-left">
          <span className="topbar-label">Product</span>
          <span className="topbar-value">Boundless</span>
        </div>
      </div>

      <header className="header">
        <div className="logo">
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
          <div className="card">
            <h2>How This Works</h2>
            <p>
              Boundless — Let agents run, within your rules, budget, and verifiable proof.
            </p>
            <p>
              Connect a wallet on the top-right, set a spending rule, then issue it onchain. The agent can only act inside that rule.
            </p>
            <ol className="guide-list">
              <li>Choose the wallet to protect.</li>
              <li>Set rule limits: per-action max, daily budget, assets, and protocols.</li>
              <li>Issue rule to X Layer contract.</li>
              <li>Watch every request become approve, resize, or block with proof.</li>
            </ol>
          </div>

          <div className="card">
            <div className="section-heading">
              <div>
                <h2>Current Live Rule</h2>
                <p className="section-copy">
                  This section answers one question: what can the agent do right now?
                </p>
              </div>
              <div className="status-row">
                <span className={`pill ${leaseState.tone}`}>Rule: {leaseState.label}</span>
                <span className={`pill ${currentMode === 'active' ? 'ok' : 'warn'}`}>Operator: {titleCase(currentMode ?? 'idle')}</span>
                <span className="pill ok">Controller: {controller.source === 'onchain' ? 'Onchain' : 'Local'}</span>
              </div>
            </div>

            <div className="stack-list">
              <div className="stack-row"><span className="stack-k">Protected Wallet</span><span className="stack-v mono">{shortHash(liveLease?.walletAddress)}</span></div>
              <div className="stack-row"><span className="stack-k">Rule ID</span><span className="stack-v mono">{shortHash(liveLease?.leaseId)}</span></div>
              <div className="stack-row"><span className="stack-k">Max Per Action</span><span className="stack-v">{formatUsd(liveLease?.perTxUsd ?? 0)}</span></div>
              <div className="stack-row"><span className="stack-k">Daily Budget</span><span className="stack-v">{formatUsd(dailyBudgetUsd)}</span></div>
              <div className="stack-row"><span className="stack-k">Allowed Assets</span><span className="stack-v">{liveLease?.allowedAssets?.join(', ') || 'Not loaded yet'}</span></div>
              <div className="stack-row"><span className="stack-k">Allowed Protocols</span><span className="stack-v">{liveLease?.allowedProtocols?.join(', ') || 'Not loaded yet'}</span></div>
              <div className="stack-row"><span className="stack-k">Expiry</span><span className="stack-v">{formatTimestamp(liveLease?.expiresAt)}</span></div>
              <div className="stack-row"><span className="stack-k">Current Operator Mode</span><span className="stack-v">{titleCase(currentMode ?? 'idle')}</span></div>
              <div className="stack-row"><span className="stack-k">If Agent Requests Now</span><span className="stack-v">{nextGateLabel(currentMode, liveLease?.status)}</span></div>
            </div>

            <div className="budget-panel">
              <div className="budget-panel-copy">
                <div className="budget-panel-title">Budget Envelope</div>
                <div className="budget-panel-text">
                  If the next request breaks this rule, the system should resize it or block it before execution.
                </div>
              </div>
              <div className="budget-panel-values">
                <span>Spent: {formatUsd(spentUsd)}</span>
                <span className="budget-remaining">Remaining: {formatUsd(remainingDailyUsd)}</span>
              </div>
              <div className="budget-bar">
                <div className="bar-segment spent" style={{ width: `${spentPercent}%` }} />
                <div className="bar-segment left" style={{ width: `${remainingPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="card">
            <h2>What Your Operator Mode Means</h2>
            <div className="stack-list">
              <div className="stack-row"><span className="stack-k">Current Mode</span><span className="stack-v">{titleCase(currentMode ?? 'idle')}</span></div>
              <div className="stack-row"><span className="stack-k">Meaning</span><span className="stack-v">{modeMeaning(currentMode)}</span></div>
              <div className="stack-row"><span className="stack-k">Next Request</span><span className="stack-v">{nextGateLabel(currentMode, liveLease?.status)}</span></div>
              <div className="stack-row"><span className="stack-k">Controller Contract</span><span className="stack-v mono">{shortHash(controller.address ?? undefined)}</span></div>
              <div className="stack-row"><span className="stack-k">Hosted Writes</span><span className="stack-v">{controller.actionsEnabled ? 'Enabled' : 'Read only'}</span></div>
            </div>
          </div>
        </aside>

        <main className="dashboard-main">
          <div className="card">
            <h2>Live Overview</h2>
            <div className="kpi-strip">
              <div className="kpi-tile">
                <div className="k">Rule Status</div>
                <div className="v">{leaseState.label}</div>
              </div>
              <div className="kpi-tile">
                <div className="k">Budget Remaining</div>
                <div className="v">{formatUsd(remainingDailyUsd)}</div>
              </div>
              <div className="kpi-tile">
                <div className="k">Latest Tx</div>
                <div className="v mono">{shortHash(latestSuccessRound?.txHash ?? historicalReferencePacket?.execution.txHash)}</div>
              </div>
              <div className="kpi-tile">
                <div className="k">Round Mix</div>
                <div className="v">A {approvedCount} · B {blockedCount} · R {resizeCount}</div>
              </div>
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
            <div className="response-banner history-banner">
              Historical proof below is from an older rule, not the wallet currently protected above.
              Current live wallet: {shortHash(liveLease?.walletAddress)}.
              Historical proof wallet: {shortHash(historicalWallet ?? undefined)}.
              Current live rule: {shortHash(liveLease?.leaseId)}.
              Historical rule: {shortHash(historicalLeaseId ?? undefined)}.
            </div>
          ) : null}

          <div className="card">
            <div className="section-heading">
              <div>
                <h2>Latest Proof Snapshot</h2>
                <p className="section-copy">
                  This is the latest confirmed result in the system: approved execution or blocked request.
                </p>
              </div>
              {historicalReferencePacket ? (
                <div className="status-row">
                  <span className="pill ok">Consumer: {historicalReferencePacket.request.consumerName}</span>
                  <span className={`pill ${proofOutcomeTone}`}>Decision: {titleCase(historicalReferencePacket.decision.outcome)}</span>
                  <span className={`pill ${proofZoneTone}`}>Zone: {titleCase(historicalReferencePacket.decision.trustZone)}</span>
                  <span className={`pill ${proofExecutionTone}`}>Execution: {titleCase(historicalReferencePacket.execution.status)}</span>
                </div>
              ) : null}
            </div>
          </div>

          {historicalReferencePacket ? (
            <div className="card">
              <h2>Latest Request Detail</h2>
              <div className="stack-list">
                <div className="stack-row"><span className="stack-k">Action</span><span className="stack-v">{titleCase(historicalReferencePacket.request.action)}</span></div>
                <div className="stack-row"><span className="stack-k">From → To</span><span className="stack-v">{historicalReferencePacket.request.fromToken} → {historicalReferencePacket.request.toToken}</span></div>
                <div className="stack-row"><span className="stack-k">Venue</span><span className="stack-v">{historicalReferencePacket.request.venueHint}</span></div>
                <div className="stack-row"><span className="stack-k">Requested</span><span className="stack-v">{formatUsd(historicalReferencePacket.request.notionalUsd)}</span></div>
                <div className="stack-row"><span className="stack-k">Allowed</span><span className="stack-v">{formatUsd(historicalReferencePacket.decision.finalNotionalUsd)}</span></div>
                <div className="stack-row"><span className="stack-k">Tx Hash</span><span className="stack-v mono">{shortHash(historicalReferencePacket.execution.txHash)}</span></div>
                <div className="stack-row"><span className="stack-k">Decision Reason</span><span className="stack-v">{historicalReferencePacket.decision.rationale}</span></div>
              </div>
            </div>
          ) : null}

          <details className="card advanced-panel">
            <summary>Advanced History (Optional)</summary>
            <p>
              These rows are full history logs and may include older rules and older wallets.
            </p>
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
                      <td style={{ fontSize: '11px', color: 'var(--s1)' }}>{round.summary}</td>
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

          <div className="card">
            <h2>Recent Activity Feed</h2>
            <div className="status-row">
              <span className="pill ok">All {rounds.length}</span>
              <span className="pill ok">Approved {approvedCount}</span>
              <span className="pill warn">Blocked {blockedCount}</span>
              <span className="pill warn">Resized {resizeCount}</span>
            </div>
            <div className="activity-feed">
              {rounds.slice(0, 10).map((round) => (
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
              ))}
              {rounds.length === 0 ? (
                <div className="activity-row">
                  <div className="activity-main">
                    <span className="activity-summary">No rounds recorded yet.</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>

      <div className="footer">
        Built on <a href="#">X Layer</a> · Reads the controller contract plus runtime proof artifacts
      </div>
    </div>
  );
}
