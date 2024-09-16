import React, { FC, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { PureFI } from '@purefi/verifier-sdk';
import { ConfigProvider } from 'antd';
import { wagmiConfig } from './config';
import { Layout } from './components';
import { Home, Liquidity, NotFound } from './pages';

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
  }, []);

  return (
    <React.StrictMode>
      <ConfigProvider theme={theme}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
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
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ConfigProvider>
    </React.StrictMode>
  );
};

export default App;
