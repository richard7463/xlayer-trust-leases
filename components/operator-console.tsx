'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const CONNECTED_WALLET_STORAGE_KEY = 'trust-leases.connected-wallet';

type OperatorConsoleProps = {
  leaseId?: string | null;
  leaseStatus?: string | null;
  operatorMode?: string | null;
  latestSuccessTxHash?: string | null;
  latestBlockedReason?: string | null;
  controllerAddress?: string | null;
  controllerSource?: 'local' | 'onchain';
  governedWallet?: string | null;
  baseAsset?: string | null;
  perTxUsd?: number | null;
  dailyBudgetUsd?: number | null;
  allowedAssets?: string[] | null;
  allowedProtocols?: string[] | null;
  actionsEnabled?: boolean;
  runRoundEnabled?: boolean;
  controllerNote?: string | null;
};

type ControlAction =
  | 'issue-lease'
  | 'revoke-lease'
  | 'pause'
  | 'review'
  | 'resume'
  | 'run-round'
  | 'refresh-proof'
  | 'set-member-policy';

const ACTION_GROUPS: Array<{
  label: string;
  actions: Array<{ action: ControlAction; label: string; help: string; tone?: 'primary' | 'warn' | 'neutral' }>;
}> = [
  {
    label: 'Rule',
    actions: [
      { action: 'issue-lease', label: 'Save Rule', help: 'Write or replace this rule on X Layer with the settings above.', tone: 'primary' },
      { action: 'revoke-lease', label: 'Disable Rule', help: 'Cancel the current rule immediately.', tone: 'warn' },
    ],
  },
  {
    label: 'Operator',
    actions: [
      { action: 'pause', label: 'Pause', help: 'Stop autonomous execution until resumed.', tone: 'warn' },
      { action: 'review', label: 'Review', help: 'Force manual review before execution.', tone: 'warn' },
      { action: 'resume', label: 'Resume', help: 'Return to active governed execution.', tone: 'primary' },
    ],
  },
  {
    label: 'Runtime',
    actions: [
      { action: 'run-round', label: 'Run Round', help: 'Ask the runner to create the next request.', tone: 'primary' },
      { action: 'refresh-proof', label: 'Refresh Proof', help: 'Reload lease, receipt, and dashboard proof.', tone: 'neutral' },
    ],
  },
];

function parseCsvText(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function OperatorConsole({
  leaseId,
  leaseStatus,
  operatorMode,
  latestSuccessTxHash,
  latestBlockedReason,
  controllerAddress,
  controllerSource,
  governedWallet,
  baseAsset,
  perTxUsd,
  dailyBudgetUsd,
  allowedAssets,
  allowedProtocols,
  actionsEnabled = true,
  runRoundEnabled = true,
  controllerNote,
}: OperatorConsoleProps) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [walletAddress, setWalletAddress] = useState(governedWallet ?? '');
  const [baseAssetInput, setBaseAssetInput] = useState((baseAsset ?? 'USDT0').toUpperCase());
  const [perTxUsdInput, setPerTxUsdInput] = useState(String(perTxUsd ?? 3));
  const [dailyBudgetUsdInput, setDailyBudgetUsdInput] = useState(String(dailyBudgetUsd ?? 15));
  const [expiryHoursInput, setExpiryHoursInput] = useState('24');
  const [allowedAssetsInput, setAllowedAssetsInput] = useState((allowedAssets && allowedAssets.length > 0 ? allowedAssets : ['USDT0', 'USDC', 'OKB']).join(','));
  const [allowedProtocolsInput, setAllowedProtocolsInput] = useState((allowedProtocols && allowedProtocols.length > 0 ? allowedProtocols : ['okx-aggregator', 'quickswap']).join(','));
  const [memberAddressInput, setMemberAddressInput] = useState('');
  const [memberPerTxInput, setMemberPerTxInput] = useState('1');
  const [memberDailyInput, setMemberDailyInput] = useState('5');
  const [memberEnabled, setMemberEnabled] = useState(true);
  const [busyAction, setBusyAction] = useState<ControlAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (governedWallet) {
      setWalletAddress(governedWallet);
    }
  }, [governedWallet]);

  useEffect(() => {
    if (baseAsset) {
      setBaseAssetInput(baseAsset.toUpperCase());
    }
  }, [baseAsset]);

  useEffect(() => {
    if (typeof perTxUsd === 'number' && Number.isFinite(perTxUsd)) {
      setPerTxUsdInput(String(perTxUsd));
    }
  }, [perTxUsd]);

  useEffect(() => {
    if (typeof dailyBudgetUsd === 'number' && Number.isFinite(dailyBudgetUsd)) {
      setDailyBudgetUsdInput(String(dailyBudgetUsd));
    }
  }, [dailyBudgetUsd]);

  useEffect(() => {
    if (allowedAssets && allowedAssets.length > 0) {
      setAllowedAssetsInput(allowedAssets.join(','));
    }
  }, [allowedAssets]);

  useEffect(() => {
    if (allowedProtocols && allowedProtocols.length > 0) {
      setAllowedProtocolsInput(allowedProtocols.join(','));
    }
  }, [allowedProtocols]);

  useEffect(() => {
    const cachedWallet = window.localStorage.getItem(CONNECTED_WALLET_STORAGE_KEY);
    if (cachedWallet) {
      setWalletAddress(cachedWallet);
    }

    const handleWalletUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ address?: string }>).detail;
      if (!detail?.address) {
        return;
      }
      setWalletAddress(detail.address);
    };

    window.addEventListener('trust-leases-wallet-updated', handleWalletUpdated);
    return () => {
      window.removeEventListener('trust-leases-wallet-updated', handleWalletUpdated);
    };
  }, []);

  const meta = useMemo(
    () => [
      `Rule: ${leaseId ?? 'none'}`,
      `Status: ${leaseStatus ?? 'not issued'}`,
      `Operator: ${operatorMode ?? 'idle'}`,
      controllerAddress ? `Controller: ${controllerSource === 'onchain' ? 'X Layer' : 'Local'} ${controllerAddress}` : 'Controller: local runtime',
      latestSuccessTxHash ? `Latest success: ${latestSuccessTxHash}` : 'Latest success: none yet',
    ],
    [leaseId, leaseStatus, operatorMode, controllerAddress, controllerSource, latestSuccessTxHash],
  );

  async function runAction(action: ControlAction) {
    setBusyAction(action);
    setMessage(null);
    setError(null);

    const perTxValue = Number(perTxUsdInput);
    const dailyValue = Number(dailyBudgetUsdInput);
    const expiryValue = Number(expiryHoursInput);

    if (action === 'issue-lease') {
      if (!walletAddress.trim().startsWith('0x')) {
        setBusyAction(null);
        setError('Set a valid wallet address before saving the rule.');
        return;
      }
      if (!Number.isFinite(perTxValue) || perTxValue <= 0 || !Number.isFinite(dailyValue) || dailyValue <= 0) {
        setBusyAction(null);
        setError('Per-tx and daily budget must be positive numbers.');
        return;
      }
      if (!Number.isFinite(expiryValue) || expiryValue <= 0) {
        setBusyAction(null);
        setError('Expiry hours must be a positive number.');
        return;
      }
    }
    if (action === 'set-member-policy') {
      const memberPerTxValue = Number(memberPerTxInput);
      const memberDailyValue = Number(memberDailyInput);
      if (!memberAddressInput.trim().startsWith('0x')) {
        setBusyAction(null);
        setError('Set a valid member wallet address.');
        return;
      }
      if (memberEnabled) {
        if (!Number.isFinite(memberPerTxValue) || memberPerTxValue <= 0 || !Number.isFinite(memberDailyValue) || memberDailyValue <= 0) {
          setBusyAction(null);
          setError('Member per-tx and daily budgets must be positive numbers.');
          return;
        }
      }
    }

    try {
      const response = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note,
          walletAddress,
          leaseOverrides: action === 'issue-lease'
            ? {
                baseAsset: baseAssetInput.trim().toUpperCase(),
                perTxUsd: perTxValue,
                dailyBudgetUsd: dailyValue,
                allowedAssets: parseCsvText(allowedAssetsInput),
                allowedProtocols: parseCsvText(allowedProtocolsInput),
                expiryHours: expiryValue,
              }
            : undefined,
          memberPolicy: action === 'set-member-policy'
            ? {
                memberAddress: memberAddressInput.trim(),
                enabled: memberEnabled,
                perTxUsd: Number(memberPerTxInput),
                dailyBudgetUsd: Number(memberDailyInput),
              }
            : undefined,
        }),
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
      <h2>Rule Console</h2>
      <p>
        Set the wallet, budget, assets, protocols, and expiry first. Then save the rule onchain.
      </p>

      <div className="action-meta">
        {meta.map((item) => (
          <span key={item} className="pill ok">{item}</span>
        ))}
      </div>

      <div className="lease-config-grid">
        <div className="note-row">
          <label htmlFor="governed-wallet" className="note-label">Governed Wallet</label>
          <input
            id="governed-wallet"
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            placeholder="0x wallet protected by this rule"
            className="note-input mono"
          />
        </div>
        <div className="note-row">
          <label htmlFor="per-tx-usd" className="note-label">Per-Tx Limit (USD)</label>
          <input
            id="per-tx-usd"
            value={perTxUsdInput}
            onChange={(event) => setPerTxUsdInput(event.target.value)}
            placeholder="3"
            className="note-input"
          />
        </div>
        <div className="note-row">
          <label htmlFor="daily-budget-usd" className="note-label">Daily Budget (USD)</label>
          <input
            id="daily-budget-usd"
            value={dailyBudgetUsdInput}
            onChange={(event) => setDailyBudgetUsdInput(event.target.value)}
            placeholder="15"
            className="note-input"
          />
        </div>
      </div>

      <details className="settings-advanced">
        <summary>Advanced Rule Settings</summary>
        <div className="lease-config-grid">
          <div className="note-row">
            <label htmlFor="base-asset" className="note-label">Base Asset</label>
            <input
              id="base-asset"
              value={baseAssetInput}
              onChange={(event) => setBaseAssetInput(event.target.value.toUpperCase())}
              placeholder="USDT0"
              className="note-input"
            />
          </div>
        <div className="note-row">
          <label htmlFor="allowed-assets" className="note-label">Allowed Assets (CSV)</label>
          <input
            id="allowed-assets"
            value={allowedAssetsInput}
            onChange={(event) => setAllowedAssetsInput(event.target.value)}
            placeholder="USDT0,USDC,OKB"
            className="note-input"
          />
        </div>
        <div className="note-row">
          <label htmlFor="allowed-protocols" className="note-label">Allowed Protocols (CSV)</label>
          <input
            id="allowed-protocols"
            value={allowedProtocolsInput}
            onChange={(event) => setAllowedProtocolsInput(event.target.value)}
            placeholder="okx-aggregator,quickswap"
            className="note-input"
          />
        </div>
        <div className="note-row">
          <label htmlFor="expiry-hours" className="note-label">Expiry Hours</label>
          <input
            id="expiry-hours"
            value={expiryHoursInput}
            onChange={(event) => setExpiryHoursInput(event.target.value)}
            placeholder="24"
            className="note-input"
          />
        </div>
        </div>
      </details>

      <div className="note-row">
        <label htmlFor="operator-note" className="note-label">Action Note</label>
        <input
          id="operator-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="optional rule note or operator command reason"
          className="note-input"
        />
      </div>

      <details className="settings-advanced" open>
        <summary>Member Wallet Budget</summary>
        <div className="lease-config-grid">
          <div className="note-row">
            <label htmlFor="member-wallet" className="note-label">Member Wallet</label>
            <input
              id="member-wallet"
              value={memberAddressInput}
              onChange={(event) => setMemberAddressInput(event.target.value)}
              placeholder="0x member wallet that can spend treasury funds"
              className="note-input mono"
            />
          </div>
          <div className="note-row">
            <label htmlFor="member-per-tx" className="note-label">Member Per-Tx (USD)</label>
            <input
              id="member-per-tx"
              value={memberPerTxInput}
              onChange={(event) => setMemberPerTxInput(event.target.value)}
              placeholder="1"
              className="note-input"
            />
          </div>
          <div className="note-row">
            <label htmlFor="member-daily" className="note-label">Member Daily (USD)</label>
            <input
              id="member-daily"
              value={memberDailyInput}
              onChange={(event) => setMemberDailyInput(event.target.value)}
              placeholder="5"
              className="note-input"
            />
          </div>
          <div className="note-row">
            <label htmlFor="member-enabled" className="note-label">Policy Status</label>
            <div className="checkbox-wrap">
              <input
                id="member-enabled"
                type="checkbox"
                checked={memberEnabled}
                onChange={(event) => setMemberEnabled(event.target.checked)}
              />
              <span>{memberEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>
        <div className="action-row">
          <div>
            <button
              type="button"
              className="action-button primary"
              disabled={busyAction !== null || !actionsEnabled}
              onClick={() => runAction('set-member-policy')}
            >
              {busyAction === 'set-member-policy' ? 'Working...' : 'Save Member Budget'}
            </button>
            <div className="action-help">Owner writes per-member spending limits onchain. Any member request above this budget is reverted.</div>
          </div>
        </div>
      </details>

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
