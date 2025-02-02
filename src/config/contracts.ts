import { zeroAddress } from 'viem';
import { bsc } from 'viem/chains';
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

import ufiSrc from '@/assets/icons/ufi.png';
import bnbSrc from '@/assets/icons/bnb.png';

const bscConfig: Config = {
  poolManager: {
    address: '0x28e2ea090877bf75740558f6bfb36a5ffee9e9df',
    abi: PoolManager.abi,
  },
  stateView: {
    address: '0xd13dd3d6e93f276fafc9db9e6bb47c1180aee0c4',
    abi: StateView.abi,
  },
  quoter: {
    address: '0x9f75dd27d6664c475b90e105573e550ff69437b0',
    abi: Quoter.abi,
  },
  swapRouter: {
    address: '0x85d9b29a254260E4bB4A292855992ACCeFf6B06A',
    abi: PurefiSwapRouter.abi,
  },
  liquidityRouter: {
    address: '0x6fa3E48196A11EAF8C74E9CA2675245f657481E6',
    abi: PureFiModifyLiquidityRouter.abi,
  },
  liquidityHelper: {
    address: '0xa5A1fB813D90c0476277cE4198F6CCf07bCcf465',
    abi: LiquidityHelper.abi,
  },
  pools: [
    {
      id: '0x5ecfdfe0c473d84036069af1d31917c4ff45bb1b77c2873a9ccafd24e1095de3',
      hook: {
        address: '0x650c40E697f882267D770dB82A0B567d6DA7cfe0',
      },
      swapFee: FeeTierEnum.EXOTIC_PAIRS,
      tickSpacing: TICK_SPACINGS[FeeTierEnum.EXOTIC_PAIRS],
      swapRuleId: DEFAULT_SWAP_RULE_ID,
      liquidityRuleId: DEFAULT_LIQUIDITY_RULE_ID,
      token0: {
        address: zeroAddress,
        abi: MockToken.abi,
        symbol: 'BNB',
        decimals: 18,
        icon: bnbSrc,
      },
      token1: {
        address: '0xe2a59D5E33c6540E18aAA46BF98917aC3158Db0D',
        abi: MockToken.abi,
        symbol: 'UFI',
        decimals: 18,
        icon: ufiSrc,
      },
    },
  ],
};

export const DEFAULT_CONFIG = bscConfig;

export const CONFIG_MAP: Record<number, Config> = {
  [bsc.id]: bscConfig,
};

export const getConfig = (chainId?: number) => {
  if (!chainId) {
    return DEFAULT_CONFIG;
  }

  if (!CONFIG_MAP[chainId]) {
    return DEFAULT_CONFIG;
  }

  return CONFIG_MAP[chainId];
};
