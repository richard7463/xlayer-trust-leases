import path from "node:path";
import { readRuntimeEnvFromFiles } from "../src/config/env.js";
import { issueLeaseFromEnv } from "../src/lease/policy.js";
import { writeActiveLease } from "../src/lease/store.js";
import { getSettlementAccountAddress } from "../src/treasury/xlayer.js";

const env = readRuntimeEnvFromFiles();
const walletAddress = env.XLAYER_TREASURY_ADDRESS || getSettlementAccountAddress(env);
const lease = issueLeaseFromEnv(env, walletAddress);
const filePath = writeActiveLease(path.resolve(env.LEASE_DATA_DIR), lease);

console.log(`lease=${lease.leaseId}`);
console.log(`consumer=${lease.consumerName}`);
console.log(`wallet=${lease.walletAddress ?? "unscoped"}`);
console.log(`per_tx_usd=${lease.perTxUsd}`);
console.log(`daily_budget_usd=${lease.dailyBudgetUsd}`);
console.log(`expires_at=${lease.expiresAt}`);
console.log(`path=${filePath}`);
