import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { HttpTransport } from 'viem';
import { http } from 'wagmi';
import { CHAINS } from './chains';

const transports: Record<number, HttpTransport> = {};

CHAINS.forEach((chain) => {
  transports[chain.id] = http();
});

export const wagmiConfig = getDefaultConfig({
  appName: 'PureFi | Uniswap',
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
  chains: CHAINS,
  transports,
});
