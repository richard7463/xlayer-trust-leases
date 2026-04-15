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
      return 'Agent may execute within the lease limits.';
    case 'review':
      return 'Agent requests should stop at review before execution.';
    case 'paused':
      return 'Agent execution is paused until you resume it.';
    default:
      return 'No active operator posture has been recorded yet.';
  }
}

function nextGateLabel(mode?: string | null, leaseStatus?: string | null): string {
  if (leaseStatus !== 'active') {
    return 'Nothing can execute until a fresh active lease exists.';
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

function EmptyDashboard({ lease, operatorMode }: { lease: ProofPacket['lease'] | null; operatorMode?: string | null }) {
  const leaseState = deriveLeaseState(lease, operatorMode ?? undefined);

  return (
    <div className="card">
      <h2>Current Live Control</h2>
      <p>
        A lease may exist, but there is no fresh governed request attached to it yet. Use the console above to issue a lease or refresh the proof.
      </p>
      <div className="info-grid">
        <div className="info-card">
          <div className="k">Protected Wallet</div>
          <div className="v mono">{shortHash(lease?.walletAddress)}</div>
        </div>
        <div className="info-card">
          <div className="k">Lease Status</div>
          <div className="v">{leaseState.label}</div>
        </div>
        <div className="info-card">
          <div className="k">Operator Mode</div>
          <div className="v">{titleCase(operatorMode ?? 'idle')}</div>
        </div>
        <div className="info-card">
          <div className="k">Daily Budget</div>
          <div className="v">{formatUsd(lease?.dailyBudgetUsd ?? 0)}</div>
        </div>
        <div className="info-card">
          <div className="k">Expires</div>
          <div className="v">{formatTimestamp(lease?.expiresAt)}</div>
        </div>
        <div className="info-card">
          <div className="k">What To Do Next</div>
          <div className="v">{nextGateLabel(operatorMode, lease?.status)}</div>
        </div>
      </div>
    </div>
  );
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

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-label">Network</span>
          <span className="topbar-value">X Layer {packet?.treasury.chainId ?? 196}</span>
        </div>
        <div className="topbar-left">
          <span className="topbar-label">Product</span>
          <span className="topbar-value">Trust Leases</span>
        </div>
      </div>

      <header className="header">
        <div className="logo">
          <div className="logo-icon">T</div>
          <div>
            <div className="logo-text">Trust Leases</div>
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

      <div className="card">
        <h2>How Lease Works</h2>
        <p>
          Connect a wallet at the top-right, then issue a lease. The lease is the boundary the agent must obey.
        </p>
        <div className="info-grid">
          <div className="info-card">
            <div className="k">Per-Tx Max</div>
            <div className="v">{formatUsd(liveLease?.perTxUsd ?? 3)} per action</div>
          </div>
          <div className="info-card">
            <div className="k">Daily Budget</div>
            <div className="v">{formatUsd(liveLease?.dailyBudgetUsd ?? 15)} per day</div>
          </div>
          <div className="info-card">
            <div className="k">Allowed Assets</div>
            <div className="v">{liveLease?.allowedAssets?.join(', ') || 'USDT0, USDC, OKB'}</div>
          </div>
          <div className="info-card">
            <div className="k">Allowed Protocols</div>
            <div className="v">{liveLease?.allowedProtocols?.join(', ') || 'okx-aggregator, quickswap'}</div>
          </div>
          <div className="info-card">
            <div className="k">Expiry</div>
            <div className="v">{formatTimestamp(liveLease?.expiresAt)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <h2>Current Live Control</h2>
            <p className="section-copy">
              This is the only part that answers: “What wallet is protected right now, and what may the agent do right now?”
            </p>
          </div>
          <div className="status-row">
            <span className={`pill ${leaseState.tone}`}>Lease: {leaseState.label}</span>
            <span className={`pill ${currentMode === 'active' ? 'ok' : 'warn'}`}>Operator: {titleCase(currentMode ?? 'idle')}</span>
            <span className="pill ok">Controller: {controller.source === 'onchain' ? 'Onchain' : 'Local'}</span>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-card">
            <div className="k">Protected Wallet</div>
            <div className="v mono">{shortHash(liveLease?.walletAddress)}</div>
          </div>
          <div className="info-card">
            <div className="k">Live Lease ID</div>
            <div className="v mono">{shortHash(liveLease?.leaseId)}</div>
          </div>
          <div className="info-card">
            <div className="k">Current Operator Mode</div>
            <div className="v">{titleCase(currentMode ?? 'idle')}</div>
          </div>
          <div className="info-card">
            <div className="k">Max Per Action</div>
            <div className="v">{formatUsd(liveLease?.perTxUsd ?? 0)}</div>
          </div>
          <div className="info-card">
            <div className="k">Daily Budget</div>
            <div className="v">{formatUsd(dailyBudgetUsd)}</div>
          </div>
          <div className="info-card">
            <div className="k">Next Request Rule</div>
            <div className="v">{nextGateLabel(currentMode, liveLease?.status)}</div>
          </div>
        </div>

        <div className="budget-panel">
          <div className="budget-panel-copy">
            <div className="budget-panel-title">Current Budget Envelope</div>
            <div className="budget-panel-text">
              If the next agent request exceeds the budget or violates the lease, the system should resize it or block it before execution.
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

      <div className="grid-2">
        <div className="card">
          <h2>Current Agent Rules</h2>
          <p>
            These are the boundaries the agent is supposed to stay inside before any new onchain action is allowed.
          </p>
          <div className="info-grid">
            <div className="info-card">
              <div className="k">Allowed Assets</div>
              <div className="v">{liveLease?.allowedAssets?.join(', ') || 'Not loaded yet'}</div>
            </div>
            <div className="info-card">
              <div className="k">Allowed Protocols</div>
              <div className="v">{liveLease?.allowedProtocols?.join(', ') || 'Not loaded yet'}</div>
            </div>
            <div className="info-card">
              <div className="k">Lease Expires</div>
              <div className="v">{formatTimestamp(liveLease?.expiresAt)}</div>
            </div>
            <div className="info-card">
              <div className="k">Consumer</div>
              <div className="v">{liveLease?.consumerName ?? 'Not loaded yet'}</div>
            </div>
            <div className="info-card">
              <div className="k">Controller Contract</div>
              <div className="v mono">{shortHash(controller.address ?? undefined)}</div>
            </div>
            <div className="info-card">
              <div className="k">Hosted Writes</div>
              <div className="v">{controller.actionsEnabled ? 'Enabled' : 'Read only'}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Current Human Override</h2>
          <p>
            This is what your operator posture means right now.
          </p>
          <div className="info-grid">
            <div className="info-card">
              <div className="k">Operator Mode</div>
              <div className="v">{titleCase(currentMode ?? 'idle')}</div>
            </div>
            <div className="info-card">
              <div className="k">Meaning</div>
              <div className="v">{modeMeaning(currentMode)}</div>
            </div>
            <div className="info-card">
              <div className="k">If Agent Requests A Trade</div>
              <div className="v">{nextGateLabel(currentMode, liveLease?.status)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>What Happens Next</h2>
        <div className="info-grid">
          <div className="info-card">
            <div className="k">1. Agent asks</div>
            <div className="v">The agent proposes an action inside this wallet.</div>
          </div>
          <div className="info-card">
            <div className="k">2. Lease checks</div>
            <div className="v">Budget, wallet, asset, protocol, and operator posture are checked.</div>
          </div>
          <div className="info-card">
            <div className="k">3. System decides</div>
            <div className="v">Approve, resize, or block.</div>
          </div>
          <div className="info-card">
            <div className="k">4. Proof appears</div>
            <div className="v">A tx hash or blocked reason is recorded as evidence.</div>
          </div>
        </div>
      </div>

      {showHistoricalMismatch ? (
        <div className="response-banner history-banner">
          Historical proof below is from an older lease, not the wallet currently protected above.
          Current live wallet: {shortHash(liveLease?.walletAddress)}.
          Historical proof wallet: {shortHash(historicalWallet ?? undefined)}.
          Current live lease: {shortHash(liveLease?.leaseId)}.
          Historical proof lease: {shortHash(historicalLeaseId ?? undefined)}.
        </div>
      ) : null}

      <div className="card">
        <div className="section-heading">
          <div>
            <h2>Historical Proof</h2>
            <p className="section-copy">
              This section shows what the system has already proven before: real approved executions and real blocked events.
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

      <div className="grid-2">
        <div className="card">
          <h2>Most Recent Historical Approved Execution</h2>
          <div className="info-grid">
            <div className="info-card">
              <div className="k">Round Time</div>
              <div className="v">{formatTimestamp(latestSuccessPacket?.generatedAt ?? latestSuccessRound?.generatedAt)}</div>
            </div>
            <div className="info-card">
              <div className="k">Wallet</div>
              <div className="v mono">{shortHash(latestSuccessPacket?.lease.walletAddress)}</div>
            </div>
            <div className="info-card">
              <div className="k">Tx Hash</div>
              <div className="v mono">{shortHash(latestSuccessPacket?.execution.txHash ?? latestSuccessRound?.txHash)}</div>
            </div>
          </div>
          <p style={{ marginTop: '16px', marginBottom: 0 }}>
            {latestSuccessPacket?.execution.note ?? 'No successful governed execution has been recorded yet.'}
          </p>
        </div>

        <div className="card">
          <h2>Most Recent Historical Blocked Request</h2>
          <div className="info-grid">
            <div className="info-card">
              <div className="k">Round Time</div>
              <div className="v">{formatTimestamp(latestBlockedPacket?.generatedAt ?? latestBlockedRound?.generatedAt)}</div>
            </div>
            <div className="info-card">
              <div className="k">Wallet</div>
              <div className="v mono">{shortHash(latestBlockedPacket?.lease.walletAddress)}</div>
            </div>
            <div className="info-card">
              <div className="k">Blocked Because</div>
              <div className="v">{titleCase((latestBlockedPacket?.decision.policyHits?.[0] ?? 'n/a').replaceAll('_', ' '))}</div>
            </div>
          </div>
          <p style={{ marginTop: '16px', marginBottom: 0 }}>
            {latestBlockedPacket?.decision.rationale ?? 'No blocked guardrail event has been recorded yet.'}
          </p>
        </div>
      </div>

      {historicalReferencePacket ? (
        <div className="grid-2">
          <div className="card">
            <h2>Historical Request Detail</h2>
            <div className="info-grid">
              <div className="info-card">
                <div className="k">Action</div>
                <div className="v">{titleCase(historicalReferencePacket.request.action)}</div>
              </div>
              <div className="info-card">
                <div className="k">From → To</div>
                <div className="v">{historicalReferencePacket.request.fromToken} → {historicalReferencePacket.request.toToken}</div>
              </div>
              <div className="info-card">
                <div className="k">Venue</div>
                <div className="v">{historicalReferencePacket.request.venueHint}</div>
              </div>
              <div className="info-card">
                <div className="k">Requested</div>
                <div className="v">{formatUsd(historicalReferencePacket.request.notionalUsd)}</div>
              </div>
              <div className="info-card">
                <div className="k">Allowed</div>
                <div className="v">{formatUsd(historicalReferencePacket.decision.finalNotionalUsd)}</div>
              </div>
              <div className="info-card">
                <div className="k">Historical Tx</div>
                <div className="v mono">{shortHash(historicalReferencePacket.execution.txHash)}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Historical Authority And Receipt</h2>
            <div className="info-grid">
              <div className="info-card">
                <div className="k">Historical Lease</div>
                <div className="v mono">{shortHash(historicalReferencePacket.lease.leaseId)}</div>
              </div>
              <div className="info-card">
                <div className="k">Historical Wallet</div>
                <div className="v mono">{shortHash(historicalReferencePacket.lease.walletAddress)}</div>
              </div>
              <div className="info-card">
                <div className="k">Receipt Status</div>
                <div className="v">{titleCase(historicalReferencePacket.receipt.status)}</div>
              </div>
              <div className="info-card">
                <div className="k">Spent This Tx</div>
                <div className="v">{formatUsd(historicalReferencePacket.receipt.spentUsd)}</div>
              </div>
              <div className="info-card">
                <div className="k">Request ID</div>
                <div className="v mono">{shortHash(historicalReferencePacket.request.requestId)}</div>
              </div>
              <div className="info-card">
                <div className="k">Reason</div>
                <div className="v">{historicalReferencePacket.decision.rationale}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyDashboard lease={lease} operatorMode={currentMode} />
      )}

      <div className="card">
        <h2>Historical Lease Rounds</h2>
        <p>
          These rows are a history log. They are not always the current live lease above.
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
      </div>

      <div className="footer">
        Built on <a href="#">X Layer</a> · Reads the controller contract plus runtime proof artifacts
      </div>
    </div>
  );
}
