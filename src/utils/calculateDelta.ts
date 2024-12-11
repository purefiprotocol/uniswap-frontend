export const calculateDelta = (value: bigint, slippage: number) => {
  const precision = 1e18;

  const delta =
    (value * BigInt(slippage * precision)) / BigInt(100 * precision);

  return delta;
};
