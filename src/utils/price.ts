import { nearestUsableTick, TickMath } from '@uniswap/v3-sdk';
import JSBI from 'jsbi';
import {
  BASE,
  DEFAULT_BALANCE_DECIMALS,
  DEFAULT_FEE_DECIMALS,
  DEFAULT_PRICE_DECIMALS,
  FEE_DEVIDER,
  MIN_BALANCE,
} from '@/constants';
import { Slot0 } from '@/models';

const Q = 2 ** 96;

const getPriceBySqrtX96 = (
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number,
) => {
  const precision = 1e18;
  return Number(
    (
      (Number((sqrtPriceX96 * BigInt(precision)) / BigInt(Q)) / precision) **
        2 /
      10 ** (decimals1 - decimals0)
    ).toFixed(decimals0),
  );
};

const getPriceByTick = (tick: number, decimals0: number, decimals1: number) => {
  const sqrtPriceX96 = TickMath.getSqrtRatioAtTick(tick);
  const price = getPriceBySqrtX96(
    BigInt(sqrtPriceX96.toString()),
    decimals0,
    decimals1,
  );
  return price;
};

const getPriceBySlot0 = (
  slot0: Slot0,
  decimals0: number,
  decimals1: number,
) => {
  return getPriceByTick(slot0.tick, decimals0, decimals1);
};

const correctPriceByPrice = (
  price: number | string,
  tickSpacing: number,
  decimals0: number,
  decimals1: number,
) => {
  if (typeof price === 'string') {
    price = Number(price);
  }

  const sqrtPrice = Math.sqrt(price);
  const sqrtPriceX96 = JSBI.BigInt(sqrtPrice * 2 ** 96);
  const tickCandidate = TickMath.getTickAtSqrtRatio(sqrtPriceX96);

  const theTick = nearestUsableTick(tickCandidate, tickSpacing);

  const priceByTick = getPriceByTick(theTick, decimals0, decimals1);

  return [priceByTick, theTick];
};

const correctPriceByTick = (
  tick: number,
  tickSpacing: number,
  decimals0: number,
  decimals1: number,
) => {
  const minTick = nearestUsableTick(tick, tickSpacing);
  const priceByTick = getPriceByTick(minTick, decimals0, decimals1);

  return [priceByTick, minTick];
};

const formatPrice = (price: number, decimals = DEFAULT_PRICE_DECIMALS) =>
  Number(price.toFixed(decimals));

const formatBalance = (
  formattedBalance: string,
  decimals = DEFAULT_BALANCE_DECIMALS,
) => {
  if (Number(formattedBalance) === 0) {
    return '0';
  }

  if (Number(formattedBalance) < MIN_BALANCE) {
    return '<0.0001';
  }

  return Number(Number(formattedBalance).toFixed(decimals)).toString();
};

const formatFee = (feeValue: string, decimals = DEFAULT_FEE_DECIMALS) => {
  return formatBalance(feeValue, decimals);
};

const parseFee = (fee: number) => fee / FEE_DEVIDER;

export {
  getPriceBySlot0,
  getPriceByTick,
  getPriceBySqrtX96,
  correctPriceByPrice,
  correctPriceByTick,
  formatPrice,
  formatBalance,
  formatFee,
  parseFee,
};
