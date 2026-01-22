import { createPublicClient, parseUnits } from 'viem';

import { ContractConfig, SwapTypeEnum } from '@/models';
import { sortTokens } from '@/utils';

interface LiquidityHelperParams {
  publicClient: ReturnType<typeof createPublicClient>;
  liquidityHelper: ContractConfig;
}

interface CalculateAmountsPayload {
  tick: number;
  sqrtPriceX96: bigint;
  tokenAmount: string;
  tickLower: number;
  tickUpper: number;
}

type CalculateAmountsResult = {
  liquidity: bigint;
  amountToken0: bigint;
  amountToken1: bigint;
};

const useLiquidityHelper = (liquidityHelperParams: LiquidityHelperParams) => {
  const { publicClient, liquidityHelper } = liquidityHelperParams;

  const calculateAmountsByAmountToken0 = async (
    payload: CalculateAmountsPayload,
  ): Promise<CalculateAmountsResult> => {
    try {
      const { tick, sqrtPriceX96, tokenAmount, tickLower, tickUpper } = payload;

      const args = [tick, sqrtPriceX96, tokenAmount, tickLower, tickUpper];

      const calcResult = await publicClient.simulateContract({
        address: liquidityHelper.address,
        abi: liquidityHelper.abi,
        functionName: 'calculateLiquidityExactAmount0',
        args,
      });

      const [liquidity, amountToken0, amountToken1] =
        calcResult.result as any as bigint[];

      const result: CalculateAmountsResult = {
        liquidity,
        amountToken0: amountToken0 < 0n ? -amountToken0 : amountToken0,
        amountToken1: amountToken1 < 0n ? -amountToken1 : amountToken1,
      };

      return result;
    } catch (error: unknown) {
      console.log('LiquidityHelper failure');
      console.log(error);

      const result: CalculateAmountsResult = {
        liquidity: 0n,
        amountToken0: 0n,
        amountToken1: 0n,
      };
      return result;
    }
  };

  const calculateAmountsByAmountToken1 = async (
    payload: CalculateAmountsPayload,
  ): Promise<CalculateAmountsResult> => {
    try {
      const { tick, sqrtPriceX96, tokenAmount, tickLower, tickUpper } = payload;

      const args = [tick, sqrtPriceX96, tokenAmount, tickLower, tickUpper];

      const calcResult = await publicClient.simulateContract({
        address: liquidityHelper.address,
        abi: liquidityHelper.abi,
        functionName: 'calculateLiquidityExactAmount1',
        args,
      });

      const [liquidity, amountToken0, amountToken1] =
        calcResult.result as any as bigint[];

      const result: CalculateAmountsResult = {
        liquidity,
        amountToken0: amountToken0 < 0n ? -amountToken0 : amountToken0,
        amountToken1: amountToken1 < 0n ? -amountToken1 : amountToken1,
      };

      return result;
    } catch (error: unknown) {
      console.log('LiquidityHelper  failure');
      console.log(error);

      const result: CalculateAmountsResult = {
        liquidity: 0n,
        amountToken0: 0n,
        amountToken1: 0n,
      };
      return result;
    }
  };

  return {
    calculateAmountsByAmountToken0,
    calculateAmountsByAmountToken1,
  };
};

export { useLiquidityHelper };
