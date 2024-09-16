import { polygonAmoy } from 'viem/chains';
import { Config } from '@/models';
import { DEFAULT_LIQUIDITY_RULE_ID, DEFAULT_SWAP_RULE_ID } from '@/constants';

import PoolManager from '@/abi/PoolManager.json';
import PoolManagerViewer from '@/abi/PoolManagerViewer.json';
import PurefiSwapRouter from '@/abi/PurefiSwapRouter.json';
import Quoter from '@/abi/Quoter.json';
import MockToken from '@/abi/MockToken.json';

import usdcSrc from '@/assets/icons/usdc.png';
import usdtSrc from '@/assets/icons/usdt.png';

const polygonAmoyConfig: Config = {
  swapRouter: {
    address: '0x62D340AA89e3953063cF3884693d23cdbb5105cd',
    abi: PurefiSwapRouter.abi,
  },
  poolManager: {
    address: '0x2F81C3A3BbB6580Ca9B588Cc8Adf5590aBe7a7B7',
    abi: PoolManager.abi,
  },
  poolManagerViewer: {
    address: '0x5904B76de8657aF718068f79A8DacDd28D472Ee6',
    abi: PoolManagerViewer.abi,
  },
  quoter: {
    address: '0x5C874F8b5FF76FC96cf2DEc27f2C65e99b67Ea64',
    abi: Quoter.abi,
  },
  pools: [
    {
      id: '0x01228ca5fbe9e2d7f852b4296a81bc94f40ae1a1f5a077c8f294c16777f72bbe',
      hook: {
        address: '0xB746e09e18740B0A5ef316497E5E1cdbCe5B2aE0',
      },
      tickSpacing: 10,
      swapRuleId: DEFAULT_SWAP_RULE_ID,
      liquidityRuleId: DEFAULT_LIQUIDITY_RULE_ID,
      token0: {
        address: '0x8B2B5c60A45E1b3A32f6431689b94BC3E87738C5',
        abi: MockToken.abi,
        symbol: 'USDC',
        decimals: 6,
        icon: usdcSrc,
      },
      token1: {
        address: '0xb97CBF42B59Ab198c76876C380D47b6734f9fe2B',
        abi: MockToken.abi,
        symbol: 'USDT',
        decimals: 6,
        icon: usdtSrc,
      },
    },
  ],
};

export const DEFAULT_CONFIG = polygonAmoyConfig;

export const CONFIG_MAP: Record<number, Config> = {
  [polygonAmoy.id]: polygonAmoyConfig,
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
