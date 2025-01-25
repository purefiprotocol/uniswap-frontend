import { FEE_DEVIDER } from '@/constants';

// exact input for output
// exact output for input
export enum SwapTypeEnum {
  EIFO = 'EIFO',
  EOFI = 'EOFI',
}

export enum DirectionEnum {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum FeeTierEnum {
  VERY_STABLE_PAIRS = 0.01 * FEE_DEVIDER,
  STABLE_PAIRS = 0.05 * FEE_DEVIDER,
  MOST_PAIRS = 0.3 * FEE_DEVIDER,
  EXOTIC_PAIRS = 1.0 * FEE_DEVIDER,
}

export enum PercentageEnum {
  ONE = 1,
  FIVE = 5,
  TEN = 10,
  FULL = Infinity,
}

export interface Slot0 {
  sqrtPriceX96: bigint;
  tick: number;
  protocolFee: number;
  swapFee: number;
}

export interface TokenConfig {
  address: `0x${string}`;
  abi: unknown[];
  symbol: string;
  decimals: number;
  icon?: string;
  faucet?: {
    address: `0x${string}`;
    abi: unknown[];
    functionName: string;
  };
}

export interface PoolConfig {
  id: `0x${string}`;
  token0: TokenConfig;
  token1: TokenConfig;
  hook: {
    address: `0x${string}`;
  };
  swapRuleId: string;
  liquidityRuleId: string;
  tickSpacing: number;
}

export interface ContractConfig {
  address: `0x${string}`;
  abi: unknown[];
}

export interface Config {
  swapRouter: ContractConfig;
  liquidityRouter: ContractConfig;
  liquidityHelper: ContractConfig;
  liquidityHelper2: ContractConfig;
  poolManager: ContractConfig;
  poolManagerViewer: ContractConfig;
  quoter: ContractConfig;
  pools: PoolConfig[];
  faucet?: {
    symbol: string;
    url: string;
  };
}
