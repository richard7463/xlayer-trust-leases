import { execFileSync } from 'node:child_process';
import { NextResponse } from 'next/server';
import { getSiteData, writeCanonicalLatestIfNeeded } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

type ControlAction = 'issue-lease' | 'revoke-lease' | 'pause' | 'review' | 'resume' | 'run-round' | 'refresh-proof';

function runCommand(args: string[]): string {
  return execFileSync(args[0], args.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
}

async function buildSummary() {
  const site = await getSiteData();
  if (site.packet) {
    writeCanonicalLatestIfNeeded(site.packet);
  }

  return {
    leaseId: site.lease?.leaseId ?? null,
    leaseStatus: site.lease?.status ?? null,
    operatorMode: site.currentOperator?.mode ?? site.packet?.operator.mode ?? null,
    latestGeneratedAt: site.packet?.generatedAt ?? null,
    latestOutcome: site.packet?.decision.outcome ?? null,
    latestExecutionStatus: site.packet?.execution.status ?? null,
    latestTxHash: site.packet?.execution.txHash ?? site.latestSuccessRound?.txHash ?? null,
    latestBlockedReason: site.latestBlockedPacket?.decision.rationale ?? null,
    latestSuccessTxHash: site.latestSuccessRound?.txHash ?? null,
    rounds: site.rounds.length,
  };
}

function humanMessage(action: ControlAction, summary: Awaited<ReturnType<typeof buildSummary>>): string {
  switch (action) {
    case 'issue-lease':
      return summary.leaseId ? `Lease issued: ${summary.leaseId}` : 'Lease issued.';
    case 'revoke-lease':
      return summary.leaseId ? `Lease revoked: ${summary.leaseId}` : 'Lease revoked.';
    case 'pause':
      return 'Operator moved to pause mode.';
    case 'review':
      return 'Operator moved to review mode.';
    case 'resume':
      return 'Operator resumed active mode.';
    case 'run-round':
      if (summary.latestOutcome === 'block' && summary.latestBlockedReason) {
        return `Round completed with guardrail block: ${summary.latestBlockedReason}`;
      }
      if (summary.latestSuccessTxHash) {
        return `Governed round complete. Latest success tx: ${summary.latestSuccessTxHash}`;
      }
      return 'Governed round complete.';
    case 'refresh-proof':
      return 'Visible proof refreshed from current artifacts.';
    default:
      return 'Action complete.';
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, summary: await buildSummary() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { action?: ControlAction; note?: string };
    const action = body.action;
    const note = body.note?.trim();

    if (!action) {
      return NextResponse.json({ ok: false, error: 'Missing action.' }, { status: 400 });
    }

    let output = '';

    switch (action) {
      case 'issue-lease':
        output = runCommand(note ? ['npm', 'run', 'lease:issue', '--', note] : ['npm', 'run', 'lease:issue']);
        break;
      case 'revoke-lease':
        output = runCommand(note ? ['npm', 'run', 'lease:revoke', '--', note] : ['npm', 'run', 'lease:revoke']);
        break;
      case 'pause':
      case 'review':
      case 'resume':
        output = runCommand(note ? ['npm', 'run', `operator:${action}`, '--', note] : ['npm', 'run', `operator:${action}`]);
        break;
      case 'run-round':
        output = runCommand(['npm', 'run', 'round:live']);
        break;
      case 'refresh-proof':
        output = runCommand(['npm', 'run', 'proof:render']);
        break;
      default:
        return NextResponse.json({ ok: false, error: 'Unsupported action.' }, { status: 400 });
    }

    const summary = await buildSummary();

    return NextResponse.json({
      ok: true,
      message: humanMessage(action, summary),
      output,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Control action failed.' },
      { status: 500 }
    );
  }
}
