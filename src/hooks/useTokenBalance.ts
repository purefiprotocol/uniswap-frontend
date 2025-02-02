import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { erc20Abi, formatUnits, zeroAddress } from 'viem';
import { REFETCH_BALANCE_INTERVAL } from '@/constants';

interface TokenBalancePayload {
  tokenAddress: `0x${string}`;
}

const useTokenBalance = (payload: TokenBalancePayload) => {
  const { tokenAddress } = payload;

  const { isConnected, address, chainId } = useAccount();

  const result = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address!],
        chainId,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
        chainId,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'symbol',
        chainId,
      },
    ],
    query: {
      select: (data) => {
        return {
          balance: data[0].toString(),
          decimals: data[1],
          symbol: data[2],
          formatted: formatUnits(data[0], data[1]),
        };
      },
      enabled:
        isConnected &&
        typeof address !== 'undefined' &&
        typeof chainId !== 'undefined' &&
        tokenAddress !== zeroAddress,
      refetchOnWindowFocus: true,
      refetchInterval: REFETCH_BALANCE_INTERVAL,
    },
  });

  const nativeResult = useBalance({
    address,
    chainId,
    query: {
      select: (data) => {
        return {
          balance: data.value.toString(),
          decimals: data.decimals,
          symbol: data.symbol,
          formatted: formatUnits(data.value, data.decimals),
        };
      },
      enabled:
        isConnected &&
        typeof address !== 'undefined' &&
        typeof chainId !== 'undefined' &&
        tokenAddress === zeroAddress,
      refetchOnWindowFocus: true,
      refetchInterval: REFETCH_BALANCE_INTERVAL,
    },
  });

  return tokenAddress !== zeroAddress ? result : nativeResult;
};

export { useTokenBalance };
