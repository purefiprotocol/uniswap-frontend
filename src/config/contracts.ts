import { zeroAddress } from 'viem';
import { sepolia } from 'viem/chains';
import { TICK_SPACINGS } from '@uniswap/v3-sdk';

import { Config, FeeTierEnum } from '@/models';
import { DEFAULT_LIQUIDITY_RULE_ID, DEFAULT_SWAP_RULE_ID } from '@/constants';

import PoolManager from '@/abi/PoolManager.json';
import StateView from '@/abi/StateView.json';
import PurefiSwapRouter from '@/abi/PurefiSwapRouter.json';
import Quoter from '@/abi/Quoter.json';
import PureFiModifyLiquidityRouter from '@/abi/PureFiModifyLiquidityRouter.json';
import LiquidityHelper from '@/abi/LiquidityHelper.json';
import MockToken from '@/abi/MockToken.json';
import FaucetAbi from '@/abi/FaucetAbi.json';

export const DEFAULT_CONFIG = null;

export const CONFIG_MAP: Record<number, Config> = {};

export const getConfig = (chainId?: number) => {
  if (!chainId) {
    return DEFAULT_CONFIG;
  }

  if (!CONFIG_MAP[chainId]) {
    return DEFAULT_CONFIG;
  }

  return CONFIG_MAP[chainId];
};
