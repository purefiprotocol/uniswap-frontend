import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

import { CHAINS } from './chains';

const PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

const wagmiMetadata = {
  name: 'PureFi | Uniswap',
  description: 'PureFi | Uniswap',
  url: 'https://stage.dex.purefi.io',
  icons: [
    'https://user-images.githubusercontent.com/23620645/136548302-6bf7f6e0-8236-44bf-b75a-9c067e9347da.png',
  ],
};

const wagmiAdapter = new WagmiAdapter({
  networks: CHAINS,
  projectId: PROJECT_ID,
});

const infuraRpcUrl = `https://bsc-mainnet.infura.io/v3/a5f583e4696b4f738f0cb5b52384b0f5`;

export { wagmiAdapter, wagmiMetadata, PROJECT_ID, infuraRpcUrl };
