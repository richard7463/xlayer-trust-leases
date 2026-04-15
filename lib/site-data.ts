import fs from 'node:fs';
import path from 'node:path';
import type { ProofPacket, RoundArtifactIndexEntry } from './types';
import { readControllerConfig, readOnchainActiveLease, readOnchainLatestReceipt, readOnchainOperator } from './trust-lease-controller';

export type SiteData = {
  packet: ProofPacket | null;
  lease: ProofPacket['lease'] | null;
  currentOperator: ProofPacket['operator'] | null;
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
  };
};

function getDataPath(...segments: string[]): string {
  return path.join(process.cwd(), 'data', 'trust-leases', ...segments);
}

function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUsablePacket(value: unknown): value is ProofPacket {
  if (!isObject(value)) return false;
  if (!hasString(value.generatedAt) || !hasString(value.product)) return false;

  const lease = value.lease;
  const request = value.request;
  const decision = value.decision;
  const execution = value.execution;
  const receipt = value.receipt;
  const treasury = value.treasury;
  const operator = value.operator;

  return (
    isObject(lease) &&
    hasString(lease.leaseId) &&
    hasString(lease.consumerName) &&
    hasString(lease.status) &&
    hasString(lease.expiresAt) &&
    isObject(request) &&
    hasString(request.requestId) &&
    hasString(request.consumerName) &&
    hasString(request.fromToken) &&
    hasString(request.toToken) &&
    isObject(decision) &&
    hasString(decision.outcome) &&
    hasString(decision.trustZone) &&
    hasString(decision.rationale) &&
    isObject(execution) &&
    hasString(execution.status) &&
    hasString(execution.note) &&
    isObject(receipt) &&
    hasString(receipt.status) &&
    isObject(treasury) &&
    typeof treasury.chainId === 'number' &&
    isObject(operator) &&
    hasString(operator.mode)
  );
}

function readRoundPacket(relativePath?: string): ProofPacket | null {
  if (!relativePath) return null;
  const packet = readJsonIfExists<unknown>(getDataPath(relativePath));
  return isUsablePacket(packet) ? packet : null;
}

function packetTime(packet: ProofPacket | null): number {
  if (!packet) return -1;
  const time = new Date(packet.generatedAt).getTime();
  return Number.isFinite(time) ? time : -1;
}

function roundTime(round: RoundArtifactIndexEntry | null | undefined): number {
  if (!round) return -1;
  const time = new Date(round.generatedAt).getTime();
  return Number.isFinite(time) ? time : -1;
}

function sortRounds(rounds: RoundArtifactIndexEntry[]): RoundArtifactIndexEntry[] {
  return [...rounds].sort((left, right) => roundTime(right) - roundTime(left));
}

function resolvePrimaryPacket(rounds: RoundArtifactIndexEntry[]): ProofPacket | null {
  const latestFilePacket = readJsonIfExists<unknown>(getDataPath('live-proof-latest.json'));
  const primaryFromFile = isUsablePacket(latestFilePacket) ? latestFilePacket : null;
  const primaryFromIndex = sortRounds(rounds)
    .map((round) => readRoundPacket(round.relativePath))
    .find(Boolean) ?? null;

  return packetTime(primaryFromIndex) > packetTime(primaryFromFile) ? primaryFromIndex : primaryFromFile;
}

function commandForOperatorMode(mode: string): ProofPacket['operator']['lastCommand'] {
  switch (mode) {
    case 'active':
      return 'resume';
    case 'review':
      return 'review';
    case 'paused':
      return 'pause';
    default:
      return 'initialize';
  }
}

function buildLeaseFromOnchain(snapshot: NonNullable<Awaited<ReturnType<typeof readOnchainActiveLease>>>): ProofPacket['lease'] {
  return {
    leaseId: snapshot.leaseId,
    issuedAt: snapshot.issuedAt,
    expiresAt: snapshot.expiresAt,
    status: snapshot.status,
    ownerLabel: 'onchain-controller',
    consumerName: snapshot.consumerName,
    walletAddress: snapshot.wallet,
    baseAsset: snapshot.baseAsset,
    allowedAssets: [],
    allowedProtocols: [],
    allowedActions: [],
    counterpartyAllowlist: [],
    perTxUsd: snapshot.perTxUsd,
    dailyBudgetUsd: snapshot.dailyBudgetUsd,
    trustRequirements: {
      reasonRequired: true,
      proofRequired: true,
      operatorCanPause: true,
      degradedRequiresReview: false,
    },
    notes: [],
  };
}

function buildSyntheticRound(receipt: NonNullable<Awaited<ReturnType<typeof readOnchainLatestReceipt>>>): RoundArtifactIndexEntry {
  return {
    generatedAt: receipt.timestamp ?? new Date().toISOString(),
    leaseId: receipt.leaseId,
    requestId: receipt.requestId,
    outcome: receipt.outcome,
    txHash: receipt.txHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? receipt.txHash : undefined,
    summary: `onchain receipt | consumer=${receipt.consumerName} | outcome=${receipt.outcome} | execution=${receipt.executionStatus}`,
    relativePath: '',
  };
}

function clonePacket(packet: ProofPacket | null): ProofPacket | null {
  return packet ? JSON.parse(JSON.stringify(packet)) as ProofPacket : null;
}

export async function getSiteData(): Promise<SiteData> {
  const rounds = sortRounds(readJsonIfExists<RoundArtifactIndexEntry[]>(getDataPath('index.json')) ?? []);
  const controllerConfig = readControllerConfig();
  const onchainLease = controllerConfig.controllerAddress ? await readOnchainActiveLease(controllerConfig) : null;
  const onchainOperator = controllerConfig.controllerAddress ? await readOnchainOperator(controllerConfig) : null;
  const onchainReceipt = controllerConfig.controllerAddress ? await readOnchainLatestReceipt(controllerConfig) : null;
  const packet = clonePacket(resolvePrimaryPacket(rounds));
  const activeLease = readJsonIfExists<ProofPacket['lease']>(getDataPath('leases', 'active-lease.json'));
  const localOperator = readJsonIfExists<ProofPacket['operator']>(getDataPath('operator-state.json')) ?? packet?.operator ?? null;
  let currentOperator = localOperator;
  if (onchainOperator) {
    currentOperator = {
      operatorName: onchainOperator.operatorName,
      mode: onchainOperator.mode === 'none' ? localOperator?.mode ?? 'active' : onchainOperator.mode,
      lastCommand: commandForOperatorMode(onchainOperator.mode),
      updatedAt: onchainOperator.updatedAt ?? localOperator?.updatedAt ?? new Date().toISOString(),
      note: onchainOperator.noteHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? onchainOperator.noteHash : localOperator?.note,
    };
  }

  let lease = activeLease ?? packet?.lease ?? null;
  if (onchainLease) {
    lease = {
      ...(lease ?? buildLeaseFromOnchain(onchainLease)),
      leaseId: onchainLease.leaseId,
      issuedAt: onchainLease.issuedAt,
      expiresAt: onchainLease.expiresAt,
      status: onchainLease.status,
      consumerName: onchainLease.consumerName,
      walletAddress: onchainLease.wallet,
      baseAsset: onchainLease.baseAsset,
      perTxUsd: onchainLease.perTxUsd,
      dailyBudgetUsd: onchainLease.dailyBudgetUsd,
    };
  }

  if (packet && lease && packet.lease.leaseId === lease.leaseId) {
    packet.lease = { ...packet.lease, ...lease };
    if (onchainLease) {
      packet.usage.spent24hUsd = onchainLease.spentTodayUsd;
      packet.usage.remainingDailyUsd = onchainLease.remainingDailyUsd;
    }
    if (currentOperator) {
      packet.operator = currentOperator;
    }
  }

  if (packet && onchainReceipt && packet.request.requestId === onchainReceipt.requestId) {
    packet.decision.outcome = onchainReceipt.outcome === 'none' ? packet.decision.outcome : onchainReceipt.outcome;
    packet.execution.status = onchainReceipt.executionStatus === 'none' ? packet.execution.status : onchainReceipt.executionStatus;
    if (onchainReceipt.txHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      packet.execution.txHash = onchainReceipt.txHash;
      packet.receipt.txHash = onchainReceipt.txHash;
    }
    packet.receipt.spentUsd = onchainReceipt.spentUsd;
  }

  let latestSuccessRound = rounds.find((round) => Boolean(round.txHash)) ?? null;
  let latestBlockedRound = rounds.find((round) => round.outcome === 'block') ?? null;
  if (onchainReceipt) {
    const syntheticRound = buildSyntheticRound(onchainReceipt);
    if (!latestSuccessRound && syntheticRound.txHash) {
      latestSuccessRound = syntheticRound;
    }
    if (!latestBlockedRound && syntheticRound.outcome === 'block') {
      latestBlockedRound = syntheticRound;
    }
  }
  const latestSuccessPacket = readRoundPacket(latestSuccessRound?.relativePath);
  const latestBlockedPacket = readRoundPacket(latestBlockedRound?.relativePath);

  return {
    packet,
    lease,
    currentOperator,
    rounds,
    latestSuccessRound,
    latestBlockedRound,
    latestSuccessPacket,
    latestBlockedPacket,
    controller: {
      address: controllerConfig.controllerAddress ?? null,
      source: controllerConfig.controllerAddress ? 'onchain' : 'local',
      latestRequestId: onchainReceipt?.requestId ?? null,
      latestTxHash: onchainReceipt?.txHash && onchainReceipt.txHash !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        ? onchainReceipt.txHash
        : null,
    },
  };
}

export function writeCanonicalLatestIfNeeded(packet: ProofPacket): void {
  const latestPath = getDataPath('live-proof-latest.json');
  fs.writeFileSync(latestPath, `${JSON.stringify(packet, null, 2)}\n`);
}
