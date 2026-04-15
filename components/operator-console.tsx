'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type OperatorConsoleProps = {
  leaseId?: string | null;
  leaseStatus?: string | null;
  operatorMode?: string | null;
  latestSuccessTxHash?: string | null;
  latestBlockedReason?: string | null;
  controllerAddress?: string | null;
  controllerSource?: 'local' | 'onchain';
  governedWallet?: string | null;
  actionsEnabled?: boolean;
  runRoundEnabled?: boolean;
  controllerNote?: string | null;
};

type ControlAction = 'issue-lease' | 'revoke-lease' | 'pause' | 'review' | 'resume' | 'run-round' | 'refresh-proof';

const ACTION_GROUPS: Array<{
  label: string;
  actions: Array<{ action: ControlAction; label: string; tone?: 'primary' | 'warn' | 'neutral' }>;
}> = [
  {
    label: 'Lease',
    actions: [
      { action: 'issue-lease', label: 'Issue Lease', tone: 'primary' },
      { action: 'revoke-lease', label: 'Revoke', tone: 'warn' },
    ],
  },
  {
    label: 'Operator',
    actions: [
      { action: 'pause', label: 'Pause', tone: 'warn' },
      { action: 'review', label: 'Review', tone: 'warn' },
      { action: 'resume', label: 'Resume', tone: 'primary' },
    ],
  },
  {
    label: 'Runtime',
    actions: [
      { action: 'run-round', label: 'Run Round', tone: 'primary' },
      { action: 'refresh-proof', label: 'Refresh Proof', tone: 'neutral' },
    ],
  },
];

export function OperatorConsole({
  leaseId,
  leaseStatus,
  operatorMode,
  latestSuccessTxHash,
  latestBlockedReason,
  controllerAddress,
  controllerSource,
  governedWallet,
  actionsEnabled = true,
  runRoundEnabled = true,
  controllerNote,
}: OperatorConsoleProps) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [walletAddress, setWalletAddress] = useState(governedWallet ?? '');
  const [busyAction, setBusyAction] = useState<ControlAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meta = useMemo(
    () => [
      `Lease: ${leaseId ?? 'none'}`,
      `Status: ${leaseStatus ?? 'not issued'}`,
      `Operator: ${operatorMode ?? 'idle'}`,
      controllerAddress ? `Controller: ${controllerSource === 'onchain' ? 'X Layer' : 'Local'} ${controllerAddress}` : 'Controller: local runtime',
      latestSuccessTxHash ? `Latest success: ${latestSuccessTxHash}` : 'Latest success: none yet',
    ],
    [leaseId, leaseStatus, operatorMode, controllerAddress, controllerSource, latestSuccessTxHash]
  );

  async function runAction(action: ControlAction) {
    setBusyAction(action);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note, walletAddress }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Action failed');
      }
      setMessage(payload.message || 'Done');
      if (action !== 'refresh-proof') {
        setNote('');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="card">
      <h2>Operator Console</h2>
      <p>
        {actionsEnabled
          ? 'Issue a new lease, change operator posture, run a governed round, or refresh the visible proof without leaving the app.'
          : 'This deployment is currently operating as a proof viewer. Use a writable runner for live control actions until the backend is fully externalized.'}
      </p>

      <div className="action-meta">
        {meta.map((item) => (
          <span key={item} className="pill ok">{item}</span>
        ))}
      </div>

      <div className="note-row">
        <label htmlFor="operator-note" className="note-label">Action note</label>
        <input
          id="operator-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="optional reason, pause note, or lease note"
          className="note-input"
        />
      </div>

      <div className="note-row">
        <label htmlFor="governed-wallet" className="note-label">Governed wallet</label>
        <input
          id="governed-wallet"
          value={walletAddress}
          onChange={(event) => setWalletAddress(event.target.value)}
          placeholder="0x wallet that the agent is allowed to operate inside"
          className="note-input mono"
        />
      </div>

      <div className="action-groups">
        {ACTION_GROUPS.map((group) => (
          <div key={group.label} className="action-group">
            <div className="action-group-label">{group.label}</div>
            <div className="action-row">
              {group.actions.map((item) => (
                <button
                  key={item.action}
                  type="button"
                  className={`action-button ${item.tone ?? 'neutral'}`}
                  disabled={
                    busyAction !== null ||
                    !actionsEnabled ||
                    (item.action === 'run-round' && !runRoundEnabled)
                  }
                  onClick={() => runAction(item.action)}
                >
                  {busyAction === item.action ? 'Working...' : item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {controllerNote ? <div className="response-banner">{controllerNote}</div> : null}
      {message ? <div className="response-banner success">{message}</div> : null}
      {error ? <div className="response-banner error">{error}</div> : null}

      {latestBlockedReason ? (
        <div className="control-footnote">
          Latest guardrail: {latestBlockedReason}
        </div>
      ) : null}
    </div>
  );
}
