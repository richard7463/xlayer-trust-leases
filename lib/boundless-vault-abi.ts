export const boundlessVaultAbi = [
  {
    type: 'function',
    name: 'setMemberPolicy',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'member', type: 'address' },
      { name: 'enabled', type: 'bool' },
      { name: 'perTxUsd6', type: 'uint128' },
      { name: 'dailyBudgetUsd6', type: 'uint128' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setAllowedAsset',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'allowed', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setAllowedProtocol',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'allowed', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setLeaseContext',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'leaseId', type: 'string' },
      { name: 'nextConsumerName', type: 'string' },
      { name: 'nextOperatorName', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'memberBudgetState',
    stateMutability: 'view',
    inputs: [{ name: 'member', type: 'address' }],
    outputs: [
      { name: 'exists', type: 'bool' },
      { name: 'enabled', type: 'bool' },
      { name: 'perTxUsd6', type: 'uint128' },
      { name: 'dailyBudgetUsd6', type: 'uint128' },
      { name: 'spentTodayUsd6', type: 'uint128' },
      { name: 'remainingDailyUsd6', type: 'uint128' },
    ],
  },
] as const;
