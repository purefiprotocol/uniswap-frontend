import React, { FC, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KycWidget } from '@purefi/kyc-sdk';
import { toast } from 'react-toastify';
import { ConfigProvider } from 'antd';
import { bsc } from 'viem/chains';
import {
  wagmiAdapter,
  PROJECT_ID,
  wagmiMetadata,
  CHAINS,
  DEFAULT_CHAIN,
} from './config';
import { Layout } from './components';
import { Home, Kyc, Liquidity, NotFound, Positions } from './pages';
import bscSrc from './assets/icons/bsc.png';

const queryClient = new QueryClient();

const theme = {
  token: {
    colorText: '#ffffff',
    fontSize: 16,
    colorBgMask: 'rgba(0, 0, 0, 0.75)',
  },
  components: {
    Layout: {
      headerPadding: '0 20px',
      bodyBg: 'transparent',
      headerBg: 'transparent',
      footerBg: 'transparent',
    },
    Card: {
      headerBg: '#1e1f23',
      colorBgContainer: 'transparent',
    },
    Modal: {
      contentBg: '#1e1f23',
      headerBg: '#1e1f23',
    },
    Steps: {
      colorText: '#ffffff',
      colorTextDescription: '#ffffff',
      colorSplit: 'gray',
    },
  },
};

createAppKit({
  adapters: [wagmiAdapter],
  networks: CHAINS,
  defaultNetwork: DEFAULT_CHAIN,
  projectId: PROJECT_ID,
  metadata: wagmiMetadata,
  allowUnsupportedChain: false,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#fc72ff',
  },
  chainImages: {
    [bsc.id]: bscSrc,
  },
  termsConditionsUrl: `${window.location.origin}/terms.pdf`,
  allWallets: 'SHOW',
  features: {
    swaps: false,
    onramp: false,
    email: false,
    socials: false,
    emailShowWallets: false,
    analytics: true,
  },
});

const App: FC = () => {
  useEffect(() => {
    KycWidget.setConfig({
      issuerUrl: import.meta.env.VITE_API_URL,
      onSuccess: toast.success,
      onWarning: toast.warn,
      onError: toast.error,
      onInfo: toast.info,
    });
  }, []);

  return (
    <React.StrictMode>
      <ConfigProvider theme={theme}>
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="/liquidity" element={<Liquidity />} />
                  <Route path="/positions" element={<Positions />} />
                  <Route path="/kyc" element={<Kyc />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </QueryClientProvider>
        </WagmiProvider>
      </ConfigProvider>
    </React.StrictMode>
  );
};

export default App;
