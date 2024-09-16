import { TokenConfig } from '@/models';

const compareTokens = (token0: `0x${string}`, token1: `0x${string}`) => {
  return token0.toLowerCase() < token1.toLowerCase() ? -1 : 1;
};

const sortTokenAddresses = (token0: `0x${string}`, token1: `0x${string}`) => {
  return compareTokens(token0, token1) < 0
    ? [token0, token1]
    : [token1, token0];
};

const sortTokens = (token0: TokenConfig, token1: TokenConfig) => {
  return compareTokens(token0.address, token1.address) < 0
    ? [token0, token1]
    : [token1, token0];
};

export { sortTokenAddresses, sortTokens };
