import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { CHAINS } from './chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'PureFi | Uniswap',
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
  chains: CHAINS,
});
