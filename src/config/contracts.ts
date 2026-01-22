import { polygonAmoy } from 'viem/chains';
import { Config } from '@/models';
import { DEFAULT_LIQUIDITY_RULE_ID, DEFAULT_SWAP_RULE_ID } from '@/constants';

import PoolManager from '@/abi/PoolManager.json';
import PoolManagerViewer from '@/abi/PoolManagerViewer.json';
import PurefiSwapRouter from '@/abi/PurefiSwapRouter.json';
import Quoter from '@/abi/Quoter.json';
import PureFiModifyLiquidityRouter from '@/abi/PureFiModifyLiquidityRouter.json';
import LiquidityHelper from '@/abi/LiquidityHelper.json';
import MockToken from '@/abi/MockToken.json';
import FaucetAbi from '@/abi/FaucetAbi.json';

import usdcSrc from '@/assets/icons/usdc.png';
import usdtSrc from '@/assets/icons/usdt.png';

const polygonAmoyConfig: Config = {
  swapRouter: {
    address: '0x62D340AA89e3953063cF3884693d23cdbb5105cd',
    abi: PurefiSwapRouter.abi,
  },
  liquidityRouter: {
    address: '0x4c2840fFb488CF3651ed5967FFb6C90e3bFbffc2',
    abi: PureFiModifyLiquidityRouter.abi,
  },
  liquidityHelper: {
    address: '0x2A08567d2930EfFb2ea318d40e09Ce8d8178db6e',
    abi: LiquidityHelper.abi,
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
        faucet: {
          address: '0xDFCc24Bf7f18489C163193aA92Af5a6b0C254Bee',
          abi: FaucetAbi.abi,
          functionName: 'giveMeTokens',
        },
      },
      token1: {
        address: '0xb97CBF42B59Ab198c76876C380D47b6734f9fe2B',
        abi: MockToken.abi,
        symbol: 'USDT',
        decimals: 6,
        icon: usdtSrc,
        faucet: {
          address: '0xd2392701faaEf592d3c45442994dD1C6ebC2664d',
          abi: FaucetAbi.abi,
          functionName: 'giveMeTokens',
        },
      },
    },
  ],
  faucet: {
    symbol: 'POL',
    url: 'https://faucet.polygon.technology',
  },
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
