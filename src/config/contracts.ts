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
    address: '0xa4a22f14441F7119Cb4866A302FD39a03C55c942',
    abi: PurefiSwapRouter.abi,
  },
  liquidityRouter: {
    address: '0xb2fCA63255CA2A7fb884a1C0624c38AE7E5E239D',
    abi: PureFiModifyLiquidityRouter.abi,
  },
  liquidityHelper: {
    address: '0x2A08567d2930EfFb2ea318d40e09Ce8d8178db6e',
    abi: LiquidityHelper.abi,
  },
  liquidityHelper2: {
    address: '0xa831dC3F242EC3eFb441e7bA4348E0f581e7aCB1',
    abi: PureFiModifyLiquidityRouter.abi,
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
    address: '0x169f7adf12b4322094C57680e17b432A88A31AF4',
    abi: Quoter.abi,
  },
  pools: [
    {
      id: '0x16109bea5934a9b4d887ee56caa07374970d64e0e05c47a481337cb5a646bcde',
      hook: {
        address: '0x21D433dbF92b183A9954944DdB4744fA24AF0fE0',
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
    symbol: 'POL (MATIC)',
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
