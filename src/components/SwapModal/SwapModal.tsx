import { FC, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Button,
  Collapse,
  Flex,
  Modal,
  StepProps,
  Steps,
  Typography,
} from 'antd';
import { useAccount } from 'wagmi';
import {
  BaseError,
  Chain,
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  formatUnits,
  http,
  maxUint256,
  parseUnits,
} from 'viem';
import { toast } from 'react-toastify';
import {
  PureFI,
  PureFIError,
  PureFIErrorCodes,
  createDomain,
  createRuleV5Types,
  PureFIRuleV5Payload,
  RuleV5Data,
  RuleV5Payload,
} from '@purefi/kyc-sdk';

import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  SignatureOutlined,
  SolutionOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import classNames from 'classnames';

import {
  ContractConfig,
  PoolConfig,
  TokenConfig,
  Slot0,
  SwapTypeEnum,
} from '@/models';
import {
  abortController,
  calculateDelta,
  checkIfChainSupported,
  getTransactionLink,
  sleep,
} from '@/utils';
import { DEFAULT_CHAIN_VIEM } from '@/config';

import { AutoHeight } from '../AutoHeight';
import { DashboardLink, TxnLink } from '../TxnLink';

import styles from './SwapModal.module.scss';

interface SwapModalProps {
  title: string;
  open: boolean;
  inValue: string;
  inToken: TokenConfig;
  outValue: string;
  outToken: TokenConfig;
  token0: TokenConfig;
  token1: TokenConfig;
  pool: PoolConfig;
  router: ContractConfig;
  poolManagerViewer: ContractConfig;
  swapType: SwapTypeEnum;
  slot0: Slot0;
  slippage: number;
  onCancel: () => void;
}

const INITIAL_STEPS: StepProps[] = [
  {
    title: 'Allowance',
    status: 'process',
  },
  {
    title: 'PureFi',
    status: 'wait',
  },
  {
    title: 'Simulation',
    status: 'wait',
  },
  {
    title: 'Swap',
    status: 'wait',
  },
];

const INITIAL_PUREFI_STEPS: StepProps[] = [
  {
    title: 'Signature',
    status: 'process',
    icon: <SignatureOutlined />,
  },
  {
    title: 'Verification',
    status: 'wait',
    icon: <SolutionOutlined />,
  },
];

type SwapSteps = 0 | 1 | 2 | 3;
type PurefiSteps = 0 | 1;

const SwapModal: FC<SwapModalProps> = (props) => {
  const {
    title,
    open,
    inValue,
    inToken,
    outValue,
    outToken,
    token0,
    token1,
    pool,
    router,
    poolManagerViewer,
    swapType,
    slot0,
    slippage,
    onCancel,
  } = props;

  const navigate = useNavigate();
  const account = useAccount();

  const isWalletConnected = account.isConnected;
  const isChainSupported = checkIfChainSupported(account.chainId);
  const isReady = isWalletConnected && isChainSupported;

  const publicClientConfig = {
    chain: isReady ? account.chain : DEFAULT_CHAIN_VIEM,
    transport: isReady ? custom((window as any).ethereum!) : http(),
  };

  const publicClient = createPublicClient(publicClientConfig);

  const [step, setStep] = useState<SwapSteps>(0);
  const [stepItems, setStepItems] = useState<StepProps[]>(
    JSON.parse(JSON.stringify(INITIAL_STEPS)),
  );

  const [purefiStep, setPurefiStep] = useState<PurefiSteps>(0);
  const [purefiStepItems, setPurefiStepItems] =
    useState<StepProps[]>(INITIAL_PUREFI_STEPS);

  const [step1Loading, setStep1Loading] = useState(true);
  const [approveLoading, setApproveLoading] = useState(false);
  const [currentAllowance, setCurrentAllowance] = useState<bigint | null>(null);
  const [step21Loading, setStep21Loading] = useState(false);
  const [step22Loading, setStep22Loading] = useState(false);
  const [step3Loading, setStep3Loading] = useState(false);
  const [step4Loading, setStep4Loading] = useState(false);
  const [swapCompleted, setSwapCompleted] = useState(false);

  const [frozenInValue, setFrozenInValue] = useState('');
  const [frozenOutValue, setFrozenOutValue] = useState('');

  const [approveLoadingMessage, setApproveLoadingMessage] = useState(
    'Confirm approve transaction',
  );
  const [swapLoadingMessage, setSwapLoadingMessage] = useState(
    'Confirm swap transaction',
  );

  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [purefiError, setPurefiError] = useState<string | null>(null);
  const [isKycAllowed, setIsKycAllowed] = useState(false);

  const [purefiPayload, setPurefiPayload] =
    useState<PureFIRuleV5Payload | null>(null);
  const [purefiData, setPurefiData] = useState<string | null>(null);

  const reset = () => {
    setStep(0);
    setPurefiStep(0);
    setStepItems(JSON.parse(JSON.stringify(INITIAL_STEPS)));
    setPurefiStepItems([
      {
        title: 'Signature',
        status: 'process',
        icon: <SignatureOutlined />,
      },
      {
        title: 'Verification',
        status: 'wait',
        icon: <SolutionOutlined />,
      },
    ]);

    setApproveLoading(false);
    setCurrentAllowance(null);
    setStep1Loading(true);
    setStep21Loading(false);
    setStep22Loading(false);
    setStep3Loading(false);
    setStep4Loading(false);

    setFrozenInValue('');
    setFrozenOutValue('');

    setPurefiPayload(null);
    setPurefiData(null);

    setSimulationError(null);
    setSwapError(null);
    setPurefiError(null);
    setIsKycAllowed(false);

    setSwapCompleted(false);

    setApproveLoadingMessage('Confirm approve transaction');
    setSwapLoadingMessage('Confirm swap transaction');
  };

  const getAllowance = async () => {
    const walletClient = createWalletClient({
      chain: account.chain!,
      transport: custom((window as any).ethereum!),
    });

    const [address] = await walletClient.getAddresses();

    const allowancePromise = publicClient.readContract({
      address: inToken.address,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address, router.address],
    });

    const sleepPromise = sleep(1000);

    const [allowance] = await Promise.all([allowancePromise, sleepPromise]);

    return allowance;
  };

  const afterOpenChangeHandler = async (isOpen: boolean) => {
    if (isOpen) {
      try {
        setStep1Loading(true);
        setStepItems((prev) => {
          const step1 = prev[0];
          step1.status = 'process';
          const newSteps = [step1, ...prev.slice(1)];
          return newSteps;
        });
        const theAllowance = await getAllowance();

        setCurrentAllowance(theAllowance);

        if (theAllowance >= parseUnits(inValue, inToken.decimals)) {
          setStep(1);
          setStepItems((prev) => {
            const step1 = prev[0];
            step1.status = 'finish';

            const step2 = prev[1];
            step2.status = 'process';
            const newSteps = [step1, step2, ...prev.slice(2)];
            return newSteps;
          });

          setFrozenInValue(inValue);
          setFrozenOutValue(outValue);
        } else {
          setStepItems((prev) => {
            const step1 = prev[0];
            step1.status = 'process';

            const newSteps = [step1, ...prev.slice(1)];
            return newSteps;
          });
        }
      } catch (error) {
        console.log(error);
      } finally {
        setStep1Loading(false);
      }
    }
  };

  const approveHandler = async () => {
    try {
      const walletClient = createWalletClient({
        chain: account.chain!,
        transport: custom((window as any).ethereum!),
      });

      setApproveLoading(true);

      setStepItems((prev) => {
        const step1 = prev[0];
        step1.status = 'process';

        const newSteps = [step1, ...prev.slice(1)];
        return newSteps;
      });

      const [address] = await walletClient.getAddresses();

      const approveHash = await walletClient.writeContract({
        address: inToken.address,
        abi: erc20Abi,
        functionName: 'approve',
        account: address,
        args: [router.address, maxUint256],
      });

      setApproveLoadingMessage('Approve transaction in progress');

      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveHash,
      });

      const isSuccess = approveReceipt.status === 'success';

      const link = getTransactionLink(
        approveReceipt.transactionHash,
        account.chain,
      );

      const toastContent = <TxnLink href={link} title="Approve" />;

      if (isSuccess) {
        toast.success(toastContent);

        const theAllowance = await getAllowance();
        setCurrentAllowance(theAllowance);

        if (theAllowance >= parseUnits(inValue, inToken.decimals)) {
          setStep(1);
          setStepItems((prev) => {
            const step1 = prev[0];
            step1.status = 'finish';

            const step2 = prev[1];
            step2.status = 'process';
            const newSteps = [step1, step2, ...prev.slice(2)];
            return newSteps;
          });

          setFrozenInValue(inValue);
          setFrozenOutValue(outValue);
        }
      } else {
        toast.error(toastContent);

        setStepItems((prev) => {
          const step1 = prev[0];
          step1.status = 'error';

          const newSteps = [step1, ...prev.slice(1)];
          return newSteps;
        });
      }
    } catch (error: unknown) {
      const theError = error as BaseError;
      toast.error(theError.shortMessage);

      setStepItems((prev) => {
        const step1 = prev[0];
        step1.status = 'error';

        const newSteps = [step1, ...prev.slice(1)];
        return newSteps;
      });

      setApproveLoadingMessage('Confrim approve transaction');
    } finally {
      setApproveLoading(false);
    }
  };

  const cancelHandler = () => {
    onCancel();
  };

  const signMessageHandler = async () => {
    try {
      const walletClient = createWalletClient({
        chain: account.chain!,
        transport: custom((window as any).ethereum!),
      });

      setStep21Loading(true);

      setPurefiStepItems((prev) => {
        const step1 = prev[0];
        step1.status = 'process';

        const newSteps = [step1, ...prev.slice(1)];
        return newSteps;
      });

      const [address] = await walletClient.getAddresses();

      const domain = createDomain('PureFi', account.chainId!);

      const ruleV5Payload: RuleV5Payload = {
        ruleId: pool.liquidityRuleId,
        from: account.address!,
        to: router.address,
        tokenData0: {
          address: inToken.address,
          value: parseUnits(inValue, inToken.decimals).toString(),
          decimals: inToken.decimals.toString(),
        },
        packageType: '32',
      };

      const ruleV5Data: RuleV5Data = {
        account: {
          address: account.address!,
        },
        chain: {
          id: account.chainId!.toString(),
        },
        payload: ruleV5Payload,
      };

      const v5RuleTypes = createRuleV5Types(ruleV5Payload);

      const signature = await walletClient.signTypedData({
        account: address,
        domain,
        types: v5RuleTypes,
        primaryType: 'Data',
        message: ruleV5Data,
      });

      const payload: PureFIRuleV5Payload = {
        message: ruleV5Data,
        signature,
      };

      setPurefiPayload(payload);

      setPurefiStep(1);

      setPurefiStepItems((prev) => {
        const step1 = prev[0];
        step1.status = 'finish';

        const step2 = prev[1];
        step2.status = 'process';

        const newSteps = [step1, step2];
        return newSteps;
      });
    } catch (error: unknown) {
      const theError = error as BaseError;
      toast.error(theError.shortMessage);

      setPurefiStepItems((prev) => {
        const step1 = prev[0];
        step1.status = 'error';

        const newSteps = [step1, ...prev.slice(1)];
        return newSteps;
      });
    } finally {
      setStep21Loading(false);
    }
  };

  const verifyData = async () => {
    if (!isKycAllowed) {
      try {
        setStep22Loading(true);

        await sleep(500);

        const data = await PureFI.verifyRuleV5(purefiPayload!);

        setPurefiData(data);

        setPurefiStepItems((prev) => {
          const step1 = prev[0];
          const step2 = prev[1];
          step2.status = 'finish';

          const newSteps = [step1, step2];
          return newSteps;
        });

        setStepItems((prev) => {
          const step1 = prev[0];
          const step2 = prev[1];
          const step3 = prev[2];
          const step4 = prev[3];
          step2.status = 'finish';
          step3.status = 'process';

          const newSteps = [step1, step2, step3, step4];
          return newSteps;
        });

        setStep(2);
      } catch (error: unknown) {
        const theError = error as PureFIError;

        setPurefiError(theError.message);

        if (theError.code === PureFIErrorCodes.FORBIDDEN) {
          setIsKycAllowed(true);
        }

        setPurefiStepItems((prev) => {
          const step1 = prev[0];
          const step2 = prev[1];
          step2.status = 'error';

          const newSteps = [step1, step2];
          return newSteps;
        });
      } finally {
        setStep22Loading(false);
      }
    }
  };

  const simulateHandler = async () => {
    try {
      const walletClient = createWalletClient({
        chain: account.chain!,
        transport: custom((window as any).ethereum!),
      });

      setStep3Loading(true);

      setStepItems((prev) => {
        const step1 = prev[0];
        const step2 = prev[1];
        const step3 = prev[2];
        const step4 = prev[3];
        step3.status = 'process';

        const newSteps = [step1, step2, step3, step4];
        return newSteps;
      });

      const [address] = await walletClient.getAddresses();

      const parsedInValue = parseUnits(frozenInValue, inToken.decimals);
      const parsedOutValue = parseUnits(frozenOutValue, outToken.decimals);

      const zeroForOne =
        token0.address.toLowerCase() === inToken.address.toLowerCase();

      const totalFee = slot0.swapFee + slot0.protocolFee;

      const delta = calculateDelta(slot0.sqrtPriceX96, slippage);

      const MIN_PRICE_LIMIT = slot0.sqrtPriceX96 - delta;
      const MAX_PRICE_LIMIT = slot0.sqrtPriceX96 + delta;

      const sqrtPriceLimitX96 = zeroForOne ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT;

      // currency0, currency1, fee, tickSpacing, hooks
      const poolKey = [
        token0.address,
        token1.address,
        totalFee,
        pool.tickSpacing,
        pool.hook.address,
      ];

      const amountSpecified =
        swapType === SwapTypeEnum.EIFO
          ? BigInt(-1) * parsedInValue
          : parsedOutValue;

      // zeroForOne, amountSpecified, sqrtPriceLimitX96
      const swapParams = [zeroForOne, amountSpecified, sqrtPriceLimitX96];

      // takeClaims, settleUsingBurn
      const testSettings = [false, false];

      const args = [poolKey, swapParams, testSettings, purefiData];

      const simulationPromise = publicClient.simulateContract({
        account: address,
        address: router.address,
        abi: router.abi,
        functionName: 'swap',
        args,
      });

      const sleepPromise = sleep(1000);

      await Promise.all([simulationPromise, sleepPromise]);

      setStep(3);

      setStepItems((prev) => {
        const step1 = prev[0];
        const step2 = prev[1];
        const step3 = prev[2];
        const step4 = prev[3];
        step3.status = 'finish';
        step4.status = 'process';

        const newSteps = [step1, step2, step3, step4];
        return newSteps;
      });
    } catch (error: unknown) {
      const theError = error as BaseError;

      setStepItems((prev) => {
        const step1 = prev[0];
        const step2 = prev[1];
        const step3 = prev[2];
        const step4 = prev[3];
        step3.status = 'error';

        const newSteps = [step1, step2, step3, step4];
        return newSteps;
      });

      setSimulationError(theError.shortMessage);
    } finally {
      setStep3Loading(false);
    }
  };

  const proceedAnywayHandler = () => {
    setSimulationError(null);
    setStep(3);

    setStepItems((prev) => {
      const step1 = prev[0];
      const step2 = prev[1];
      const step3 = prev[2];
      const step4 = prev[3];
      step3.status = 'error';
      step4.status = 'process';

      const newSteps = [step1, step2, step3, step4];
      return newSteps;
    });
  };

  const swapHandler = async () => {
    try {
      const walletClient = createWalletClient({
        chain: account.chain!,
        transport: custom((window as any).ethereum!),
      });

      setStep4Loading(true);
      setSwapError(null);

      setStepItems((prev) => {
        const step1 = prev[0];
        const step2 = prev[1];
        const step3 = prev[2];
        const step4 = prev[3];
        step4.status = 'process';

        const newSteps = [step1, step2, step3, step4];
        return newSteps;
      });

      const [address] = await walletClient.getAddresses();

      const parsedInValue = parseUnits(frozenInValue, inToken.decimals);
      const parsedOutValue = parseUnits(frozenOutValue, outToken.decimals);

      const zeroForOne =
        token0.address.toLowerCase() === inToken.address.toLowerCase();

      const delta = calculateDelta(slot0.sqrtPriceX96, slippage);

      const MIN_PRICE_LIMIT = slot0.sqrtPriceX96 - delta;
      const MAX_PRICE_LIMIT = slot0.sqrtPriceX96 + delta;

      const sqrtPriceLimitX96 = zeroForOne ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT;

      // currency0, currency1, fee, tickSpacing, hooks
      const poolKey: any[] = [
        token0.address,
        token1.address,
        slot0.swapFee,
        pool.tickSpacing,
        pool.hook.address,
      ];

      const amountSpecified =
        swapType === SwapTypeEnum.EIFO
          ? BigInt(-1) * parsedInValue
          : parsedOutValue;

      // zeroForOne, amountSpecified, sqrtPriceLimitX96
      const swapParams: any[] = [
        zeroForOne,
        amountSpecified,
        sqrtPriceLimitX96,
      ];

      // takeClaims, settleUsingBurn
      const testSettings = [false, false];

      const args = [poolKey, swapParams, testSettings, purefiData];

      const swapHash = await walletClient.writeContract({
        account: address,
        address: router.address,
        abi: router.abi,
        functionName: 'swap',
        args,
      });

      setSwapLoadingMessage('Swap transaction in progress');

      const swapReceipt = await publicClient.waitForTransactionReceipt({
        hash: swapHash,
      });

      const isSuccess = swapReceipt.status === 'success';

      const link = getTransactionLink(
        swapReceipt.transactionHash,
        account.chain,
      );

      const toastContent = <TxnLink href={link} title="Swap" />;

      if (isSuccess) {
        toast.success(toastContent);
        setStepItems((prev) => {
          const step1 = prev[0];
          const step2 = prev[1];
          const step3 = prev[2];
          const step4 = prev[3];
          step4.status = 'finish';

          const newSteps = [step1, step2, step3, step4];
          return newSteps;
        });

        setSwapCompleted(true);
      } else {
        toast.error(toastContent);
        setStepItems((prev) => {
          const step1 = prev[0];
          const step2 = prev[1];
          const step3 = prev[2];
          const step4 = prev[3];
          step4.status = 'error';

          const newSteps = [step1, step2, step3, step4];
          return newSteps;
        });

        setSwapError('Transaction reverted');
      }
    } catch (error: unknown) {
      const theError = error as BaseError;

      console.log(theError);

      setStepItems((prev) => {
        const step1 = prev[0];
        const step2 = prev[1];
        const step3 = prev[2];
        const step4 = prev[3];
        step4.status = 'error';

        const newSteps = [step1, step2, step3, step4];
        return newSteps;
      });

      setSwapLoadingMessage('Confirm swap transaction');

      if (!theError.shortMessage.toLowerCase().includes('user rejected')) {
        setSwapError(theError.shortMessage);
      } else {
        toast.error(theError.shortMessage);
      }
    } finally {
      setStep4Loading(false);
    }
  };

  const finishHandler = () => {
    onCancel();
  };

  useEffect(() => {
    if (step === 1) {
      signMessageHandler();
    } else if (step === 2) {
      simulateHandler();
    } else if (step === 3) {
      swapHandler();
    }
  }, [step]);

  useEffect(() => {
    if (purefiStep === 1) {
      verifyData();
    }
  }, [purefiStep]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, []);

  const specialClassName = classNames({
    [styles.special]: !step4Loading && !swapError && !swapCompleted,
  });

  const allowanceClassName = classNames({
    [styles.allowance]: true,
    [styles.allowance__ok]:
      currentAllowance !== null &&
      currentAllowance >= parseUnits(inValue, inToken.decimals),
  });

  return (
    <Modal
      className={styles.modal}
      title={title}
      open={open}
      onCancel={cancelHandler}
      footer={null}
      style={{ top: 150, minWidth: '440px' }}
      maskClosable={false}
      afterOpenChange={afterOpenChangeHandler}
      destroyOnClose
    >
      <div className={styles.steps__container}>
        <Steps
          className={styles.steps}
          size="small"
          labelPlacement="vertical"
          items={stepItems}
        />
      </div>

      <AutoHeight>
        {step === 0 && (
          <div className={styles.step}>
            <div className={styles.step__body}>
              <div>
                {step1Loading && (
                  <div className={styles.loader__container}>
                    <div className={styles.loader__message}>
                      Checking allowance
                    </div>
                    <div className={styles.loader__spinner}>
                      <LoadingOutlined />
                    </div>
                  </div>
                )}

                {!step1Loading && (
                  <>
                    {approveLoading && (
                      <div className={styles.loader__container}>
                        <div className={styles.loader__message}>
                          {approveLoadingMessage}
                        </div>
                        <div className={styles.loader__spinner}>
                          <LoadingOutlined />
                        </div>
                        {approveLoadingMessage.includes('Confirm') && (
                          <div className={styles.loader__hint}>
                            Proceed in your wallet
                          </div>
                        )}
                      </div>
                    )}

                    {!approveLoading && (
                      <Flex gap="small" vertical>
                        <Flex
                          className={allowanceClassName}
                          gap="small"
                          vertical
                        >
                          <Flex className={styles.item} justify="space-between">
                            <div
                              className={`${styles.item__title} ${styles.item__title_margin}`}
                            >
                              Current allowance
                            </div>
                            <div className={styles.white}>
                              {currentAllowance !== null && (
                                <Typography.Text
                                  style={{ maxWidth: '100%' }}
                                  ellipsis={{ suffix: ` ${inToken.symbol}` }}
                                >
                                  {formatUnits(
                                    currentAllowance,
                                    inToken.decimals,
                                  )}
                                </Typography.Text>
                              )}
                            </div>
                          </Flex>

                          <Flex className={styles.item} justify="space-between">
                            <div className={styles.item__title_margin}>
                              Required allowance
                            </div>
                            <div className={styles.white}>
                              <Typography.Text
                                style={{ maxWidth: '100%' }}
                                ellipsis={{ suffix: ` ${inToken.symbol}` }}
                              >
                                {inValue.toString()}
                              </Typography.Text>
                            </div>
                          </Flex>
                        </Flex>
                      </Flex>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className={styles.step__footer}>
              <Button
                className={styles.theButton}
                onClick={approveHandler}
                disabled={step1Loading || approveLoading}
                block
              >
                {step1Loading && 'Checking...'}
                {!step1Loading && `Approve ${inToken.symbol}`}
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className={styles.step}>
            <div className={styles.step__body}>
              <Flex justify="center">
                <Steps
                  className={styles.purefiSteps}
                  size="small"
                  items={purefiStepItems}
                />
              </Flex>

              {purefiStep === 0 && (
                <div>
                  <div className={styles.loader__container}>
                    <div className={styles.loader__message}>Sign message</div>
                    {step21Loading && (
                      <>
                        <div className={styles.loader__spinner}>
                          <LoadingOutlined />
                        </div>
                        <div className={styles.loader__hint}>
                          Proceed in your wallet
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {purefiStep === 1 && (
                <div>
                  {step22Loading && (
                    <div className={styles.loader__container}>
                      <div className={styles.loader__message}>
                        Verification in progress
                      </div>
                      <div className={styles.loader__spinner}>
                        <LoadingOutlined />
                      </div>
                    </div>
                  )}

                  {!step22Loading && purefiError && (
                    <div className={styles.loader__container}>
                      <div className={styles.loader__message}>
                        {purefiError}
                      </div>
                      <div className={styles.loader__spinner}>
                        {isKycAllowed && (
                          <WarningOutlined style={{ color: '#e6a700' }} />
                        )}
                        {!isKycAllowed && (
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.step__footer}>
              {purefiStep === 0 && (
                <Button
                  className={styles.theButton}
                  onClick={signMessageHandler}
                  disabled={step21Loading}
                  block
                >
                  Sign
                </Button>
              )}

              {purefiStep === 1 && (
                <>
                  {!!purefiError && isKycAllowed && (
                    <Button
                      className={styles.theButton}
                      onClick={() => {
                        navigate('/kyc');
                      }}
                      block
                    >
                      Start verification
                    </Button>
                  )}

                  {!isKycAllowed && (
                    <Button
                      className={styles.theButton}
                      onClick={verifyData}
                      disabled={step22Loading}
                      block
                    >
                      {step22Loading && 'Verifying...'}
                      {!step22Loading && 'Verify'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.step}>
            <div className={styles.step__body}>
              <div>
                {step3Loading && (
                  <div className={styles.loader__container}>
                    <div className={styles.loader__message}>
                      Simulation in progress
                    </div>
                    <div className={styles.loader__spinner}>
                      <LoadingOutlined />
                    </div>
                  </div>
                )}

                {!step3Loading && simulationError && (
                  <Flex gap="small" vertical style={{ padding: 30 }}>
                    <div style={{ fontSize: 20, color: '#ff4d4f' }}>
                      Simulation failed
                    </div>
                    <Collapse
                      className={styles.details}
                      items={[
                        {
                          key: '1',
                          label: <div>Show details</div>,
                          children: <div>{simulationError}</div>,
                        },
                      ]}
                      expandIconPosition="end"
                      bordered={false}
                      ghost
                    />
                  </Flex>
                )}
              </div>
            </div>

            <div className={styles.step__footer}>
              <Button
                className={styles.theButton}
                onClick={simulateHandler}
                disabled={step3Loading}
                block
              >
                {step3Loading && 'Simulating...'}
                {!step3Loading && 'Simulate'}
              </Button>

              {simulationError && (
                <Button
                  className={styles.theButton2}
                  onClick={proceedAnywayHandler}
                  disabled={step3Loading}
                  block
                >
                  Proceed Anyway
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.step}>
            <div className={styles.step__body}>
              <div className={specialClassName}>
                {step4Loading && (
                  <div className={styles.loader__container}>
                    <div className={styles.loader__message}>
                      {swapLoadingMessage}
                    </div>
                    <div className={styles.loader__spinner}>
                      <LoadingOutlined />
                    </div>
                    {swapLoadingMessage.includes('Confirm') && (
                      <div className={styles.loader__hint}>
                        Proceed in your wallet
                      </div>
                    )}
                  </div>
                )}

                {!step4Loading && swapError && (
                  <Flex gap="small" vertical style={{ padding: 30 }}>
                    <div style={{ fontSize: 20, color: '#ff4d4f' }}>
                      Swap failed
                    </div>
                    <div>{swapError}</div>
                  </Flex>
                )}

                {!step4Loading && !swapError && swapCompleted && (
                  <Flex gap="small" vertical style={{ padding: '0 30px' }}>
                    <div className={styles.loader__container}>
                      <div className={styles.loader__message}>
                        Swap completed!
                      </div>
                      <div className={styles.loader__success}>
                        <CheckCircleOutlined />
                      </div>
                    </div>
                  </Flex>
                )}

                {!swapError && (
                  <div className={styles.finish}>
                    <span className={styles.inValue}>{frozenInValue}</span>
                    <span className={styles.symbol}> {inToken.symbol}</span>
                    <span className={styles.arrow}>
                      <ArrowRightOutlined />
                    </span>
                    <span className={styles.inValue}>{frozenOutValue}</span>
                    <span className={styles.symbol}> {outToken.symbol}</span>

                    <div className={styles.swapType}>
                      {swapType === SwapTypeEnum.EIFO
                        ? 'Exact Input for Output'
                        : 'Exact Output for Input'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.step__footer}>
              {!swapCompleted && (
                <Button
                  className={styles.theButton}
                  onClick={swapHandler}
                  disabled={step4Loading}
                  block
                >
                  Swap
                </Button>
              )}

              {swapCompleted && (
                <Button
                  className={styles.theButton}
                  onClick={finishHandler}
                  block
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        )}
      </AutoHeight>
    </Modal>
  );
};

export default SwapModal;
