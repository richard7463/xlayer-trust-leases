import Link from 'next/link';
import { formatTimestamp, formatUsd, ratio, shortHash, titleCase } from '@/lib/format';
import { deriveLeaseState, toneForExecution, toneForOutcome, toneForTrustZone } from '@/lib/runtime';
import type { ProofPacket, RoundArtifactIndexEntry } from '@/lib/types';
import { OperatorConsole } from '@/components/operator-console';

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

function EmptyDashboard({ lease }: { lease: ProofPacket['lease'] | null }) {
  const leaseState = deriveLeaseState(lease, undefined);

  return (
    <div className="card">
      <h2>No Live Request Yet</h2>
      <p>
        {lease
          ? 'A lease exists, but this project has not produced a fresh proof packet yet.'
          : 'No active lease has been issued yet.'}
      </p>
      <div className="info-grid">
        <div className="info-card">
          <div className="k">Lease Status</div>
          <div className="v">{leaseState.label}</div>
        </div>
        <div className="info-card">
          <div className="k">Lease ID</div>
          <div className="v mono">{shortHash(lease?.leaseId)}</div>
        </div>
        <div className="info-card">
          <div className="k">Consumer</div>
          <div className="v">{lease?.consumerName ?? 'Not configured'}</div>
        </div>
        <div className="info-card">
          <div className="k">Budget</div>
          <div className="v">{formatUsd(lease?.dailyBudgetUsd ?? 0)}</div>
        </div>
        <div className="info-card">
          <div className="k">Expires</div>
          <div className="v">{formatTimestamp(lease?.expiresAt)}</div>
        </div>
        <div className="info-card">
          <div className="k">Next Step</div>
          <div className="v">Use the Operator Console to issue a lease and run a round</div>
        </div>
      </div>
    </div>
  );
}

export function SubmissionPage({ packet, lease, currentOperator, rounds, latestSuccessRound, latestBlockedRound, latestSuccessPacket, latestBlockedPacket, controller }: SubmissionPageProps) {
  const liveLease = lease ?? packet?.lease ?? null;
  const leaseState = deriveLeaseState(liveLease, currentOperator?.mode ?? packet?.operator.mode);
  const outcomeTone = toneForOutcome(packet?.decision.outcome);
  const zoneTone = toneForTrustZone(packet?.decision.trustZone);
  const executionTone = toneForExecution(packet?.execution.status);
  const spentUsd = packet?.usage.spent24hUsd ?? 0;
  const dailyBudgetUsd = liveLease?.dailyBudgetUsd ?? 0;
  const remainingDailyUsd = packet?.usage.remainingDailyUsd ?? dailyBudgetUsd;
  const spentPercent = ratio(spentUsd, dailyBudgetUsd);
  const remainingPercent = ratio(remainingDailyUsd, dailyBudgetUsd);

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
        <nav className="nav">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/submission" className="nav-link active">Dashboard</Link>
          <Link href="/proof" className="nav-link">Proof</Link>
        </nav>
      </header>

      <div className="card">
        <h2>What this page is for</h2>
        <p>
          This dashboard lets a human give an agent limited permission to use one X Layer wallet.
          The agent does not get unlimited control. It only gets a lease with a budget, token list, protocol list, and expiry.
        </p>
        <div className="info-grid">
          <div className="info-card">
            <div className="k">Step 1</div>
            <div className="v">Choose the wallet the agent may operate</div>
          </div>
          <div className="info-card">
            <div className="k">Step 2</div>
            <div className="v">Click Issue Lease to write the permission on X Layer</div>
          </div>
          <div className="info-card">
            <div className="k">Step 3</div>
            <div className="v">Agent requests are checked against the lease</div>
          </div>
          <div className="info-card">
            <div className="k">Step 4</div>
            <div className="v">Approved tx or blocked reason appears as proof</div>
          </div>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-label">Lease Status</div>
          <div className={`stat-value ${leaseState.tone === 'ok' ? 'green' : leaseState.tone === 'warn' ? 'amber' : ''}`}>
            {leaseState.label}
          </div>
          <div className="stat-note">{liveLease ? formatTimestamp(liveLease.expiresAt) : 'No lease file'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Operator</div>
          <div className={`stat-value ${(currentOperator?.mode ?? packet?.operator.mode) === 'active' ? 'green' : 'amber'}`}>
            {titleCase(currentOperator?.mode ?? packet?.operator.mode ?? 'idle')}
          </div>
          <div className="stat-note">{currentOperator?.operatorName ?? packet?.operator.operatorName ?? 'No runtime state'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Daily Budget</div>
          <div className="stat-value">{formatUsd(dailyBudgetUsd)}</div>
          <div className="stat-note">Spent {formatUsd(spentUsd)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Remaining</div>
          <div className="stat-value green">{formatUsd(remainingDailyUsd)}</div>
          <div className="stat-note">{packet ? formatTimestamp(packet.generatedAt) : 'Waiting for first round'}</div>
        </div>
      </div>

      <div className="card">
        <h2>Budget Usage</h2>
        <p>
          This is the daily spending envelope for the agent. If the agent request would exceed the budget, the system blocks or resizes it before execution.
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px' }}>Spent: {formatUsd(spentUsd)}</span>
          <span style={{ fontSize: '13px', color: 'var(--green)' }}>Remaining: {formatUsd(remainingDailyUsd)}</span>
        </div>
        <div className="budget-bar">
          <div className="bar-segment spent" style={{ width: `${spentPercent}%` }} />
          <div className="bar-segment left" style={{ width: `${remainingPercent}%` }} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>1. Wallet Permission</h2>
          <p>
            This is the wallet the agent is allowed to operate inside. Trust Leases does not expose full wallet control; it writes a temporary permission boundary for this wallet.
          </p>
          <div className="info-grid">
            <div className="info-card">
              <div className="k">Governed Wallet</div>
              <div className="v mono">{shortHash(liveLease?.walletAddress)}</div>
            </div>
            <div className="info-card">
              <div className="k">Max Per Action</div>
              <div className="v">{formatUsd(liveLease?.perTxUsd ?? 0)} per action</div>
            </div>
            <div className="info-card">
              <div className="k">Allowed Request</div>
              <div className="v">{packet ? `${packet.request.fromToken} -> ${packet.request.toToken}` : 'Waiting for request'}</div>
            </div>
            <div className="info-card">
              <div className="k">Latest Receipt</div>
              <div className="v mono">{shortHash(controller.latestTxHash ?? latestSuccessRound?.txHash)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>2. X Layer Controller</h2>
          <p>
            This is the onchain contract that records the lease and operator state. If the controller is active, the page is not only reading local JSON; it is reading X Layer state.
          </p>
          <div className="info-grid">
            <div className="info-card">
              <div className="k">Controller</div>
              <div className="v mono">{shortHash(controller.address ?? undefined)}</div>
            </div>
            <div className="info-card">
              <div className="k">State Source</div>
              <div className="v">{titleCase(controller.source)}</div>
            </div>
            <div className="info-card">
              <div className="k">Latest Request</div>
              <div className="v mono">{shortHash(controller.latestRequestId ?? undefined)}</div>
            </div>
            <div className="info-card">
              <div className="k">Hosted Writes</div>
              <div className="v">{controller.actionsEnabled ? 'Enabled' : 'Read only'}</div>
            </div>
          </div>
        </div>
      </div>

      <OperatorConsole
        leaseId={liveLease?.leaseId}
        leaseStatus={liveLease?.status}
        operatorMode={currentOperator?.mode ?? packet?.operator.mode}
        latestSuccessTxHash={latestSuccessRound?.txHash}
        latestBlockedReason={latestBlockedPacket?.decision.rationale}
        controllerAddress={controller.address}
        controllerSource={controller.source}
        governedWallet={liveLease?.walletAddress}
        actionsEnabled={controller.actionsEnabled}
        runRoundEnabled={controller.runRoundEnabled}
        controllerNote={controller.note}
      />

      <div className="grid-2">
        <div className="card">
          <h2>3. Latest Approved Result</h2>
          <div className="info-grid">
            <div className="info-card">
              <div className="k">Approved Round</div>
              <div className="v">{formatTimestamp(latestSuccessPacket?.generatedAt ?? latestSuccessRound?.generatedAt)}</div>
            </div>
            <div className="info-card">
              <div className="k">Decision</div>
              <div className="v">{titleCase(latestSuccessPacket?.decision.outcome ?? latestSuccessRound?.outcome ?? 'none')}</div>
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
          <h2>4. Latest Blocked Result</h2>
          <div className="info-grid">
            <div className="info-card">
              <div className="k">Blocked Round</div>
              <div className="v">{formatTimestamp(latestBlockedPacket?.generatedAt ?? latestBlockedRound?.generatedAt)}</div>
            </div>
            <div className="info-card">
              <div className="k">Outcome</div>
              <div className="v">{titleCase(latestBlockedPacket?.decision.outcome ?? latestBlockedRound?.outcome ?? 'none')}</div>
            </div>
            <div className="info-card">
              <div className="k">Policy</div>
              <div className="v">{titleCase((latestBlockedPacket?.decision.policyHits?.[0] ?? 'n/a').replaceAll('_', ' '))}</div>
            </div>
          </div>
          <p style={{ marginTop: '16px', marginBottom: 0 }}>
            {latestBlockedPacket?.decision.rationale ?? 'No blocked guardrail event has been recorded yet.'}
          </p>
        </div>
      </div>

      {packet ? (
        <>
          <div className="status-row">
            <span className="pill ok">Consumer: {packet.request.consumerName}</span>
            <span className={`pill ${outcomeTone}`}>Decision: {titleCase(packet.decision.outcome)}</span>
            <span className={`pill ${zoneTone}`}>Zone: {titleCase(packet.decision.trustZone)}</span>
            <span className={`pill ${executionTone}`}>Execution: {titleCase(packet.execution.status)}</span>
          </div>

          <div className="grid-2">
            <div className="card">
              <h2>Agent Request</h2>
              <div className="info-grid">
                <div className="info-card">
                  <div className="k">Action</div>
                  <div className="v">{titleCase(packet.request.action)}</div>
                </div>
                <div className="info-card">
                  <div className="k">From → To</div>
                  <div className="v">{packet.request.fromToken} → {packet.request.toToken}</div>
                </div>
                <div className="info-card">
                  <div className="k">Venue</div>
                  <div className="v">{packet.request.venueHint}</div>
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
                  <div className="k">Tx Hash</div>
                  <div className="v mono">{shortHash(packet.execution.txHash)}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2>Decision</h2>
              <p>{packet.decision.rationale}</p>
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--card2)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--s2)', marginBottom: '4px' }}>Execution Note</div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{packet.execution.note}</div>
              </div>
              <div style={{ marginTop: '12px', padding: '12px', background: 'var(--card2)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--s2)', marginBottom: '4px' }}>Reason</div>
                <div style={{ fontSize: '14px', color: 'var(--s1)' }}>{packet.request.reason}</div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h2>Authority Envelope</h2>
              <div className="info-grid">
                <div className="info-card">
                  <div className="k">Lease ID</div>
                  <div className="v mono">{shortHash(packet.lease.leaseId)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Wallet</div>
                  <div className="v mono">{shortHash(packet.lease.walletAddress)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Assets</div>
                  <div className="v">{packet.lease.allowedAssets.join(', ')}</div>
                </div>
                <div className="info-card">
                  <div className="k">Protocols</div>
                  <div className="v">{packet.lease.allowedProtocols.join(', ')}</div>
                </div>
                <div className="info-card">
                  <div className="k">Per-Tx Limit</div>
                  <div className="v">{formatUsd(packet.lease.perTxUsd)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Expires</div>
                  <div className="v">{formatTimestamp(packet.lease.expiresAt)}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2>Receipt</h2>
              <div className="info-grid">
                <div className="info-card">
                  <div className="k">Status</div>
                  <div className="v">{titleCase(packet.receipt.status)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Spent This Tx</div>
                  <div className="v">{formatUsd(packet.receipt.spentUsd)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Latest Round</div>
                  <div className="v">{formatTimestamp(packet.generatedAt)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Request ID</div>
                  <div className="v mono">{shortHash(packet.request.requestId)}</div>
                </div>
                <div className="info-card">
                  <div className="k">Source Project</div>
                  <div className="v">{packet.request.sourceProject}</div>
                </div>
                <div className="info-card">
                  <div className="k">Explorer</div>
                  <div className="v">
                    {packet.execution.explorerUrl ? (
                      <a href={packet.execution.explorerUrl} style={{ color: 'var(--lime)' }}>View Tx</a>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <EmptyDashboard lease={lease} />
      )}

      <div className="card">
        <h2>Lease Rounds</h2>
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
        Built on <a href="#">X Layer</a> · Dashboard reads `data/trust-leases` directly
      </div>
    </div>
  );
}
