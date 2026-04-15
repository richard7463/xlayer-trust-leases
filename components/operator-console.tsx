'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

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
  actions: Array<{ action: ControlAction; label: string; help: string; tone?: 'primary' | 'warn' | 'neutral' }>;
}> = [
  {
    label: 'Lease',
    actions: [
      { action: 'issue-lease', label: 'Issue Lease', help: 'Create or replace the wallet permission on X Layer.', tone: 'primary' },
      { action: 'revoke-lease', label: 'Revoke', help: 'Cancel the agent permission immediately.', tone: 'warn' },
    ],
  },
  {
    label: 'Operator',
    actions: [
      { action: 'pause', label: 'Pause', help: 'Stop autonomous execution until resumed.', tone: 'warn' },
      { action: 'review', label: 'Review', help: 'Require a human review posture before execution.', tone: 'warn' },
      { action: 'resume', label: 'Resume', help: 'Return the agent to active governed mode.', tone: 'primary' },
    ],
  },
  {
    label: 'Runtime',
    actions: [
      { action: 'run-round', label: 'Run Round', help: 'Ask the runner to create the next agent request.', tone: 'primary' },
      { action: 'refresh-proof', label: 'Refresh Proof', help: 'Reload the latest lease, receipt, and proof data.', tone: 'neutral' },
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
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
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

  async function connectWallet() {
    setMessage(null);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('No browser wallet found. Install OKX Wallet, MetaMask, or another EVM wallet first.');
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const account = accounts[0];
      if (!account) {
        throw new Error('Wallet did not return an account.');
      }

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xc4' }],
        });
      } catch {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xc4',
            chainName: 'X Layer',
            nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
            rpcUrls: ['https://xlayer.drpc.org'],
            blockExplorerUrls: ['https://www.oklink.com/xlayer'],
          }],
        });
      }

      setConnectedWallet(account);
      setWalletAddress(account);
      setMessage('Wallet connected. This address is now the governed wallet for the next lease.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet connection failed.');
    }
  }

  return (
    <div className="card">
      <h2>Operator Console</h2>
      <p>
        {actionsEnabled
          ? 'Use this panel like a spending remote control. Pick the wallet the agent may use, issue a bounded lease, then pause, review, resume, or revoke that authority.'
          : 'This deployment is currently operating as a proof viewer. Use a writable runner for live control actions until the backend is fully externalized.'}
      </p>

      <div className="action-meta">
        {meta.map((item) => (
          <span key={item} className="pill ok">{item}</span>
        ))}
      </div>

      <div className="connect-panel">
        <div>
          <div className="connect-title">Start here: connect the wallet you want to protect</div>
          <div className="connect-copy">
            This only reads your wallet address and switches to X Layer. The lease still limits what an agent can do.
          </div>
        </div>
        <button type="button" className="action-button primary" onClick={connectWallet} disabled={busyAction !== null}>
          {connectedWallet ? 'Wallet Connected' : 'Connect Wallet'}
        </button>
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
                <div key={item.action}>
                  <button
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
                  <div className="action-help">{item.help}</div>
                </div>
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
