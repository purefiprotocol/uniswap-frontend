import { FC, useEffect, useMemo, useState } from 'react';
import { Button, Collapse, Flex, Modal, StepProps, Steps } from 'antd';
import { useAccount } from 'wagmi';
import {
  BaseError,
  bytesToHex,
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  formatUnits,
  http,
  parseUnits,
  toBytes,
} from 'viem';
import { toast } from 'react-toastify';
import {
  PureFI,
  PureFIError,
  PureFIErrorCodes,
  PureFIPayload,
  SignatureType,
} from '@purefi/verifier-sdk';
import {
  CheckCircleOutlined,
  ExportOutlined,
  LoadingOutlined,
  PlusOutlined,
  SignatureOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import classNames from 'classnames';

import { useChainModal } from '@rainbow-me/rainbowkit';
import { TokenConfig } from '@/models';
import { DEFAULT_CHAIN, getConfig } from '@/config';

import {
  checkIfChainSupported,
  getTransactionLink,
  sleep,
  sortTokens,
} from '@/utils';

import { AutoHeight } from '../AutoHeight';
import { DashboardLink, TxnLink } from '../TxnLink';

import styles from './FaucetModal.module.scss';

interface FaucetModalProps {
  title: string;
  open: boolean;
  onCancel: () => void;
}

const FaucetModal: FC<FaucetModalProps> = (props) => {
  const { title, open, onCancel } = props;

  const account = useAccount();

  const { openChainModal } = useChainModal();

  const isWalletConnected = account.isConnected;
  const isChainSupported = checkIfChainSupported(account.chainId);
  const isReady = isWalletConnected && isChainSupported;

  const publicClientConfig = {
    chain: isReady ? account.chain : DEFAULT_CHAIN,
    transport: isReady ? custom(window.ethereum!) : http(),
  };

  const publicClient = createPublicClient(publicClientConfig);

  const theConfig = useMemo(
    () => getConfig(account.chainId),
    [account.chainId],
  );

  const { pools, faucet: nativeFaucet } = theConfig;

  const [pool, setPool] = useState(pools[0]);

  const [token0Loading, setToken0Loading] = useState(false);
  const [token1Loading, setToken1Loading] = useState(false);

  const [token0, token1] = sortTokens(pool.token0, pool.token1);

  const cancelHandler = () => {
    onCancel();
  };

  const reset = () => {
    setToken0Loading(false);
    setToken1Loading(false);
  };

  const afterCloseHandler = () => {
    reset();
  };

  const switchChainHandler = () => {
    openChainModal?.();
  };

  const faucetHandler = async (token: TokenConfig) => {
    if (token.faucet) {
      const isToken0 =
        token.address.toLowerCase() === token0.address.toLowerCase();
      try {
        if (isToken0) {
          setToken0Loading(true);
        } else {
          setToken1Loading(true);
        }

        const { address: contractAddress, abi, functionName } = token.faucet;

        const walletClient = createWalletClient({
          chain: account.chain!,
          transport: custom(window.ethereum!),
        });

        const [address] = await walletClient.getAddresses();

        const faucetHash = await walletClient.writeContract({
          address: contractAddress,
          abi,
          functionName,
          account: address,
          args: [],
        });

        const faucetReceipt = await publicClient.waitForTransactionReceipt({
          hash: faucetHash,
        });

        const isSuccess = faucetReceipt.status === 'success';

        const link = getTransactionLink(
          faucetReceipt.transactionHash,
          account.chain,
        );

        const toastContent = (
          <TxnLink href={link} title={`Faucet ${token.symbol}`} />
        );

        toast[isSuccess ? 'success' : 'error'](toastContent);
      } catch (error) {
        console.log('faucet error', error);
      } finally {
        if (isToken0) {
          setToken0Loading(false);
        } else {
          setToken1Loading(false);
        }
      }
    } else {
      toast.error('Faucet is not configured');
    }
  };

  const nativeHandler = (nativeFaucetUrl: string) => {
    window.open(nativeFaucetUrl);
  };

  const isFaucetDisabled = token0Loading || token1Loading;

  return (
    <Modal
      className={styles.modal}
      title={title}
      open={open}
      onCancel={cancelHandler}
      afterClose={afterCloseHandler}
      footer={null}
      style={{ top: 250, minWidth: '440px' }}
      maskClosable={false}
      destroyOnClose
    >
      <AutoHeight>
        <Flex gap="small" vertical>
          {isWalletConnected && (
            <>
              {!isChainSupported && (
                <Button
                  className={styles.button}
                  onClick={switchChainHandler}
                  block
                >
                  Switch Network
                </Button>
              )}

              {isChainSupported && (
                <>
                  {token0.faucet && (
                    <Button
                      className={styles.button}
                      onClick={() => faucetHandler(token0)}
                      disabled={isFaucetDisabled}
                      loading={token0Loading}
                      block
                    >
                      {token0.symbol} Faucet
                    </Button>
                  )}

                  {token1.faucet && (
                    <Button
                      className={styles.button}
                      onClick={() => faucetHandler(token1)}
                      disabled={isFaucetDisabled}
                      loading={token1Loading}
                      block
                    >
                      {token1.symbol} Faucet
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {nativeFaucet && (
            <Button
              className={styles.button}
              onClick={() => nativeHandler(nativeFaucet.url)}
            >
              {nativeFaucet.symbol} Faucet
              <ExportOutlined />
            </Button>
          )}
        </Flex>
      </AutoHeight>
    </Modal>
  );
};

export default FaucetModal;