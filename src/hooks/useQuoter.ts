import { createPublicClient, parseUnits } from 'viem';

import {
  ContractConfig,
  PoolConfig,
  Slot0,
  SwapTypeEnum,
  TokenConfig,
} from '@/models';
import { calculateDelta, sleep, sortTokens } from '@/utils';

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
  gasEstimate: bigint;
}

const useQuoter = (quoterParams: QuoterParams) => {
  const { publicClient, quoter } = quoterParams;

  const quoteExactSingle = async (
    swapType: SwapTypeEnum,
    payload: GetQuotePayload,
  ): Promise<GetQuoteResult> => {
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

    const params = [poolKey, zeroForOne, exactAmount, hookData];

    const sleepPromise = sleep(700);

    const quoteResultPromise = await publicClient.simulateContract({
      address: quoter.address,
      abi: quoter.abi,
      functionName,
      args: [params],
    });

    const [quoteResult] = await Promise.all([quoteResultPromise, sleepPromise]);

    const amount = quoteResult.result[0] as unknown as bigint;
    const gasEstimate = quoteResult.result[1] as unknown as bigint;

    const result: GetQuoteResult = {
      inValue: swapType === SwapTypeEnum.EIFO ? exactAmount : amount,
      outValue: swapType === SwapTypeEnum.EIFO ? amount : exactAmount,
      gasEstimate,
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
