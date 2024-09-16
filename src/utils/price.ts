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

function getBaseLog(x: number, y: number) {
  return Math.log(y) / Math.log(x);
}

const getPriceBySlot0 = (slot0: Slot0) => {
  return BASE ** slot0.tick;
};

const getPriceByTick = (tick: number) => {
  return BASE ** tick;
};

const correctPriceByPrice = (price: number | string, tickSpacing: number) => {
  if (typeof price === 'string') {
    price = Number(price);
  }

  const sqrtPrice = Math.sqrt(price);
  const sqrtPriceX96 = JSBI.BigInt(sqrtPrice * 2 ** 96);
  const minTickCandidate = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
  const minTick = nearestUsableTick(minTickCandidate, tickSpacing);
  const priceByTick = getPriceByTick(minTick);

  return [priceByTick, minTick];
};

const correctPriceByTick = (tick: number, tickSpacing: number) => {
  const minTick = nearestUsableTick(tick, tickSpacing);
  const priceByTick = getPriceByTick(minTick);

  return [priceByTick, minTick];
};

const getPriceBySqrtX96 = (sqrtPriceX96: bigint) => {
  const precision = 1e18;
  return (
    (Number((sqrtPriceX96 * BigInt(precision)) / BigInt(2 ** 96)) /
      precision) **
    2
  );
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
