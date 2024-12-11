import { createPublicClient, parseUnits } from 'viem';

import {
  ContractConfig,
  PoolConfig,
  Slot0,
  SwapTypeEnum,
  TokenConfig,
} from '@/models';
import { calculateDelta, sortTokens } from '@/utils';

interface QuoterParams {
  publicClient: ReturnType<typeof createPublicClient>;
  quoter: ContractConfig;
}

interface GetQuotePayload {
  pool: PoolConfig;
  slot0: Slot0;
  token: TokenConfig;
  value: string;
  hookData: string;
  slippage: number;
}

interface GetQuoteResult {
  inValue: bigint;
  outValue: bigint;
  sqrtPriceX96After: bigint;
}

const useQuoter = (quoterParams: QuoterParams) => {
  const { publicClient, quoter } = quoterParams;

  const quoteExactSingle = async (
    swapType: SwapTypeEnum,
    payload: GetQuotePayload,
  ): Promise<GetQuoteResult> => {
    try {
      const functionName =
        swapType === SwapTypeEnum.EIFO
          ? 'quoteExactInputSingle'
          : 'quoteExactOutputSingle';

      const { pool, slot0, token, value, hookData, slippage } = payload;

      const [token0, token1] = sortTokens(pool.token0, pool.token1);

      const poolKey = [
        token0.address,
        token1.address,
        slot0.swapFee,
        pool.tickSpacing,
        pool.hook.address,
      ];

      const zeroForOne =
        swapType === SwapTypeEnum.EIFO
          ? token.address.toLowerCase() === token0.address.toLowerCase()
          : token.address.toLowerCase() !== token0.address.toLowerCase();

      const exactAmount = parseUnits(value, token.decimals);

      const delta = calculateDelta(slot0.sqrtPriceX96, slippage);

      const MIN_PRICE_LIMIT = slot0.sqrtPriceX96 - delta;
      const MAX_PRICE_LIMIT = slot0.sqrtPriceX96 + delta;

      const sqrtPriceLimitX96 = zeroForOne ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT;

      const params = [
        poolKey,
        zeroForOne,
        exactAmount,
        sqrtPriceLimitX96,
        hookData,
      ];

      const quoteResult = await publicClient.simulateContract({
        address: quoter.address,
        abi: quoter.abi,
        functionName,
        args: [params],
      });

      const deltaAmounts = quoteResult.result[0] as unknown as [bigint, bigint];
      const sqrtPriceX96After = quoteResult.result[1] as unknown as bigint;

      const token0ValueFromPoolPerspective = deltaAmounts[0];
      const token1ValueFromPoolPerspective = deltaAmounts[1];
      const token0ValueFromUserPerspective = -token0ValueFromPoolPerspective;
      const token1ValueFromUserPerspective = -token1ValueFromPoolPerspective;
      const absToken0ValueFromUserPerspective =
        token0ValueFromUserPerspective < 0
          ? -token0ValueFromUserPerspective
          : token0ValueFromUserPerspective;
      const absToken1ValueFromUserPerspective =
        token1ValueFromUserPerspective < 0
          ? -token1ValueFromUserPerspective
          : token1ValueFromUserPerspective;

      const result: GetQuoteResult = {
        inValue: zeroForOne
          ? absToken0ValueFromUserPerspective
          : absToken1ValueFromUserPerspective,
        outValue: zeroForOne
          ? absToken1ValueFromUserPerspective
          : absToken0ValueFromUserPerspective,
        sqrtPriceX96After,
      };

      return result;
    } catch (error: unknown) {
      console.log('Quoter failure');
      console.log(error);
    }

    const result: GetQuoteResult = {
      inValue: 0n,
      outValue: 0n,
      sqrtPriceX96After: 0n,
    };

    return result;
  };

  const quoteExactInputSingle = async (payload: GetQuotePayload) =>
    quoteExactSingle(SwapTypeEnum.EIFO, payload);

  const quoteExactOuputSingle = async (payload: GetQuotePayload) =>
    quoteExactSingle(SwapTypeEnum.EOFI, payload);

  return {
    quoteExactInputSingle,
    quoteExactOuputSingle,
  };
};

export { useQuoter };
