import { FC } from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';

const ConnectButton: FC = () => {
  // const { isConnected, isConnecting, connect, disconnect } = useWallet();

  const isConnected = false;
  const isConnecting = false;

  const connectHandler = () => {
    console.log('connectHandler');
  };

  const disconnectHandler = () => {
    console.log('disconnectHandler');
  };

  return (
    <div>
      <RainbowConnectButton />
    </div>
  );
};

export default ConnectButton;
