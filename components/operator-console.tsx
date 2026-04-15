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
};

type ControlAction = 'issue-lease' | 'revoke-lease' | 'pause' | 'review' | 'resume' | 'run-round' | 'refresh-proof';

const ACTIONS: Array<{ action: ControlAction; label: string; tone?: 'primary' | 'warn' | 'neutral' }> = [
  { action: 'issue-lease', label: 'Issue Lease', tone: 'primary' },
  { action: 'pause', label: 'Pause', tone: 'warn' },
  { action: 'review', label: 'Review', tone: 'warn' },
  { action: 'resume', label: 'Resume', tone: 'primary' },
  { action: 'revoke-lease', label: 'Revoke', tone: 'warn' },
  { action: 'run-round', label: 'Run Round', tone: 'primary' },
  { action: 'refresh-proof', label: 'Refresh Proof', tone: 'neutral' },
];

export function OperatorConsole({
  leaseId,
  leaseStatus,
  operatorMode,
  latestSuccessTxHash,
  latestBlockedReason,
  controllerAddress,
  controllerSource,
}: OperatorConsoleProps) {
  const router = useRouter();
  const [note, setNote] = useState('');
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
        body: JSON.stringify({ action, note }),
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
        Issue a new lease, change operator posture, run a governed round, or refresh the visible proof without leaving the app.
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

      <div className="action-row">
        {ACTIONS.map((item) => (
          <button
            key={item.action}
            type="button"
            className={`action-button ${item.tone ?? 'neutral'}`}
            disabled={busyAction !== null}
            onClick={() => runAction(item.action)}
          >
            {busyAction === item.action ? 'Working...' : item.label}
          </button>
        ))}
      </div>

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
