import { FC, useMemo } from 'react';
import { Button, Space, Typography } from 'antd';
import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { createPublicClient, custom, http } from 'viem';
import { checkIfChainSupported } from '@/utils';
import { DEFAULT_CHAIN_VIEM, getConfig } from '@/config';
import { useConnectModal } from '@/hooks';

import styles from './Positions.module.scss';

const { Text, Title } = Typography;

const Positions: FC = () => {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();

  const isWalletConnected = account.isConnected;
  const isChainSupported = checkIfChainSupported(account.chainId);
  const isReady = isWalletConnected && isChainSupported;

  const publicClientConfig = {
    chain: isReady ? account.chain : DEFAULT_CHAIN_VIEM,
    transport: isReady ? custom((window as any).ethereum!) : http(),
  };

  const publicClient = createPublicClient(publicClientConfig);

  const theConfig = useMemo(
    () => getConfig(account.chainId),
    [account.chainId],
  );

  const positions = useReadContract({});

  const connectWalletHandler = () => {
    openConnectModal?.();
  };

  const switchChainHandler = () => {
    switchChain?.({ chainId: DEFAULT_CHAIN_VIEM.id });
  };

  return (
    <div className={styles.positions}>
      <Space direction="vertical">
        <Title level={2} style={{ marginBottom: 0 }}>
          Positions
        </Title>
        <Text style={{ color: 'gray' }}>
          View and manage your liquidity positions
        </Text>
      </Space>
    </div>
  );
};

export default Positions;
