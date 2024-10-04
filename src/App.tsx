import React, { FC, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { PureFI, KycWidget } from '@purefi/kyc-sdk';
import { toast } from 'react-toastify';
import { ConfigProvider } from 'antd';
import { wagmiConfig } from './config';
import { Layout } from './components';
import { Home, Kyc, Liquidity, NotFound } from './pages';

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
      colorText: 'white',
      colorTextDescription: 'white',
      colorSplit: 'gray',
    },
  },
};

const App: FC = () => {
  useEffect(() => {
    PureFI.setIssuerUrl('https://stage.issuer.app.purefi.io');
    KycWidget.setConfig({
      onSuccess: toast.success,
      onWarning: toast.warn,
      onError: toast.error,
      onInfo: toast.info,
    });
  }, []);

  return (
    <React.StrictMode>
      <ConfigProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: '#fc72ff',
                borderRadius: 'medium',
              })}
            >
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="/liquidity" element={<Liquidity />} />
                    <Route path="/kyc" element={<Kyc />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </RainbowKitProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </ConfigProvider>
    </React.StrictMode>
  );
};

export default App;
