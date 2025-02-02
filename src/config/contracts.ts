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

import ufiSrc from '@/assets/icons/ufi.png';
import ethSrc from '@/assets/icons/eth.png';

const sepoliaConfig: Config = {
  poolManager: {
    address: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
    abi: PoolManager.abi,
  },
  stateView: {
    address: '0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c',
    abi: StateView.abi,
  },
  quoter: {
    address: '0x61b3f2011a92d183c7dbadbda940a7555ccf9227',
    abi: Quoter.abi,
  },
  swapRouter: {
    address: '0x240902C536CcD0090654a77B42EC768327F6c55C',
    abi: PurefiSwapRouter.abi,
  },
  liquidityRouter: {
    address: '0x8eDC19929433A9cBB3Bbe857e29Ff569eaf59052',
    abi: PureFiModifyLiquidityRouter.abi,
  },
  liquidityHelper: {
    address: '0xBbaf858dBC1F0f19e52C22F5212CeCe399E9D77F',
    abi: LiquidityHelper.abi,
  },
  pools: [
    {
      id: '0xfcd851b431f4b669494d5bd90f41017874d7e9a803984323212f8e260e0e0c0d',
      hook: {
        address: '0xA4620463518Ddd0C7e1B8c773e55d892F2feCFe0',
      },
      swapFee: FeeTierEnum.EXOTIC_PAIRS,
      tickSpacing: TICK_SPACINGS[FeeTierEnum.EXOTIC_PAIRS],
      swapRuleId: DEFAULT_SWAP_RULE_ID,
      liquidityRuleId: DEFAULT_LIQUIDITY_RULE_ID,
      token0: {
        address: zeroAddress,
        abi: MockToken.abi,
        symbol: 'ETH',
        decimals: 18,
        icon: ethSrc,
      },
      token1: {
        address: '0x5268c1C503fD0c9519517EE3a3dd0a70367e7798',
        abi: MockToken.abi,
        symbol: 'UFI',
        decimals: 18,
        icon: ufiSrc,
        faucet: {
          address: '0x5268c1C503fD0c9519517EE3a3dd0a70367e7798',
          abi: FaucetAbi.abi,
          functionName: 'giveMeTokens',
        },
      },
    },
  ],
  faucet: {
    symbol: 'ETH (Sepolia)',
    url: 'https://www.alchemy.com/faucets/ethereum-sepolia',
  },
};

export const DEFAULT_CONFIG = sepoliaConfig;

export const CONFIG_MAP: Record<number, Config> = {
  [sepolia.id]: sepoliaConfig,
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
