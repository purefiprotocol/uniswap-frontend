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
  bytesToHex,
  createPublicClient,
  createWalletClient,
  custom,
  erc20Abi,
  formatUnits,
  http,
  maxUint256,
  parseUnits,
  toBytes,
  zeroAddress,
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
  CheckCircleOutlined,
  LoadingOutlined,
  SignatureOutlined,
  SolutionOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import classNames from 'classnames';

import { DEFAULT_CHAIN_VIEM, infuraRpcUrl } from '@/config';

import { ContractConfig, PoolConfig, TokenConfig, Slot0 } from '@/models';
import { checkIfChainSupported, getTransactionLink, sleep } from '@/utils';

import { AutoHeight } from '../AutoHeight';
import { TxnLink } from '../TxnLink';

import styles from './LiquidityModal.module.scss';

interface LiquidityModalProps {
  title: string;
  open: boolean;
  leftToken: TokenConfig;
  leftTokenAmount: string;
  rightToken: TokenConfig;
  rightTokenAmount: string;
  tickLower: number;
  tickUpper: number;
  token0: TokenConfig;
  token1: TokenConfig;
  poolManager: ContractConfig;
  pool: PoolConfig;
  router: ContractConfig;
  routerHelper: ContractConfig;
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
    title: 'Liquidity',
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

type LiquiditySteps = 0 | 1 | 2 | 3;
type PurefiSteps = 0 | 1;

const LiquidityModal: FC<LiquidityModalProps> = (props) => {
  const {
    title,
    open,
    leftToken,
    leftTokenAmount,
    rightToken,
    rightTokenAmount,
    tickLower,
    tickUpper,
    token0,
    token1,
    poolManager,
    pool,
    router,
    routerHelper,
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
    transport: isReady ? custom((window as any).ethereum!) : http(infuraRpcUrl),
  };

  const publicClient = createPublicClient(publicClientConfig);

  const [step, setStep] = useState<LiquiditySteps>(0);
  const [stepItems, setStepItems] = useState<StepProps[]>(
    JSON.parse(JSON.stringify(INITIAL_STEPS)),
  );

  const [purefiStep, setPurefiStep] = useState<PurefiSteps>(0);
  const [purefiStepItems, setPurefiStepItems] =
    useState<StepProps[]>(INITIAL_PUREFI_STEPS);

  const [step1Loading, setStep1Loading] = useState(true);
  const [approveLoading, setApproveLoading] = useState(false);
  const [currentAllowanceLeft, setCurrentAllowanceLeft] = useState<
    bigint | null
  >(null);
  const [currentAllowanceRight, setCurrentAllowanceRight] = useState<
    bigint | null
  >(null);
  const [step21Loading, setStep21Loading] = useState(false);
  const [step22Loading, setStep22Loading] = useState(false);
  const [step3Loading, setStep3Loading] = useState(false);
  const [step4Loading, setStep4Loading] = useState(false);
  const [addCompleted, setAddCompleted] = useState(false);
  const [addTxnLink, setAddTxnLink] = useState<string | null>(null);

  const [frozenLeftTokenAmount, setFrozenLeftTokenAmount] = useState('');
  const [frozenRightTokenAmount, setFrozenRightTokenAmount] = useState('');
  const [frozenTickLower, setFrozenTickLower] = useState<number | null>(null);
  const [frozenTickUpper, setFrozenTickUpper] = useState<number | null>(null);

  const [approveLoadingMessage, setApproveLoadingMessage] = useState(
    'Confirm approve transaction',
  );
  const [addLoadingMessage, setAddLoadingMessage] = useState(
    'Confirm transaction',
  );

  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
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
    setCurrentAllowanceLeft(null);
    setCurrentAllowanceRight(null);
    setStep1Loading(true);
    setStep21Loading(false);
    setStep22Loading(false);
    setStep3Loading(false);
    setStep4Loading(false);

    setFrozenLeftTokenAmount('');
    setFrozenRightTokenAmount('');

    setFrozenTickLower(null);
    setFrozenTickUpper(null);

    setPurefiPayload(null);
    setPurefiData(null);

    setSimulationError(null);
    setAddError(null);
    setPurefiError(null);
    setIsKycAllowed(false);
    setAddCompleted(false);
    setAddTxnLink(null);

    setApproveLoadingMessage('Confirm approve transaction');
    setAddLoadingMessage('Confirm transaction');
  };

  const getAllowanceLeft = async () => {
    const walletClient = createWalletClient({
      chain: account.chain!,
      transport: custom((window as any).ethereum!),
    });

    if (leftToken.address === zeroAddress) {
      return 0n;
    }

    const [address] = await walletClient.getAddresses();

    const allowancePromise = publicClient.readContract({
      address: leftToken.address,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address, router.address],
    });

    const sleepPromise = sleep(500);

    const [allowance] = await Promise.all([allowancePromise, sleepPromise]);

    return allowance;
  };

  const getAllowanceRight = async () => {
    const walletClient = createWalletClient({
      chain: account.chain!,
      transport: custom((window as any).ethereum!),
    });

    const [address] = await walletClient.getAddresses();

    if (rightToken.address === zeroAddress) {
      return 0n;
    }

    const allowancePromise = publicClient.readContract({
      address: rightToken.address,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address, router.address],
    });

    const sleepPromise = sleep(500);

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
        setFrozenTickLower(tickLower);
        setFrozenTickUpper(tickUpper);

        const leftAllowance = await getAllowanceLeft();
        const rightAllowance = await getAllowanceRight();

        setCurrentAllowanceLeft(leftAllowance);
        setCurrentAllowanceRight(rightAllowance);

        const isLeftAllowanceOk =
          leftToken.address === zeroAddress
            ? true
            : leftAllowance >= parseUnits(leftTokenAmount, leftToken.decimals);
        const isRightAllowanceOk =
          rightToken.address === zeroAddress
            ? true
            : rightAllowance >=
              parseUnits(rightTokenAmount, rightToken.decimals);

        if (isLeftAllowanceOk) {
          setFrozenLeftTokenAmount(leftTokenAmount);
        }

        if (isRightAllowanceOk) {
          setFrozenRightTokenAmount(rightTokenAmount);
        }

        if (isLeftAllowanceOk && isRightAllowanceOk) {
          setStep(1);
          setStepItems((prev) => {
            const step1 = prev[0];
            step1.status = 'finish';

            const step2 = prev[1];
            step2.status = 'process';
            const newSteps = [step1, step2, ...prev.slice(2)];
            return newSteps;
          });
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

  const leftApproveHandler = async () => {
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

      setApproveLoadingMessage(
        `Approve ${leftToken.symbol} transaction in progress`,
      );

      const approveHash = await walletClient.writeContract({
        address: leftToken.address,
        abi: erc20Abi,
        functionName: 'approve',
        account: address,
        args: [router.address, maxUint256],
      });

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

        const leftAllowance = await getAllowanceLeft();
        setCurrentAllowanceLeft(leftAllowance);

        const isLeftAllowanceOk =
          leftToken.address === zeroAddress
            ? true
            : leftAllowance >= parseUnits(leftTokenAmount, leftToken.decimals);

        if (isLeftAllowanceOk) {
          setFrozenLeftTokenAmount(leftTokenAmount);
        }

        const isRightAllowanceOk =
          rightToken.address === zeroAddress
            ? true
            : currentAllowanceRight !== null &&
              currentAllowanceRight >=
                parseUnits(rightTokenAmount, rightToken.decimals);

        if (isRightAllowanceOk) {
          setFrozenRightTokenAmount(rightTokenAmount);
        }

        if (isLeftAllowanceOk && isRightAllowanceOk) {
          setStep(1);
          setStepItems((prev) => {
            const step1 = prev[0];
            step1.status = 'finish';

            const step2 = prev[1];
            step2.status = 'process';
            const newSteps = [step1, step2, ...prev.slice(2)];
            return newSteps;
          });
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

  const rightApproveHandler = async () => {
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

      setApproveLoadingMessage(
        `Approve ${rightToken.symbol} transaction in progress`,
      );

      const approveHash = await walletClient.writeContract({
        address: rightToken.address,
        abi: erc20Abi,
        functionName: 'approve',
        account: address,
        args: [router.address, maxUint256],
      });

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

        const rightAllowance = await getAllowanceRight();
        setCurrentAllowanceRight(rightAllowance);

        const isRightAllowanceOk =
          rightToken.address === zeroAddress
            ? true
            : rightAllowance >=
              parseUnits(rightTokenAmount, rightToken.decimals);

        if (isRightAllowanceOk) {
          setFrozenRightTokenAmount(rightTokenAmount);
        }

        const isLeftAllowanceOk =
          leftToken.address === zeroAddress
            ? true
            : currentAllowanceLeft !== null &&
              currentAllowanceLeft >=
                parseUnits(leftTokenAmount, leftToken.decimals);

        if (isLeftAllowanceOk) {
          setFrozenLeftTokenAmount(leftTokenAmount);
        }

        if (isRightAllowanceOk && isLeftAllowanceOk) {
          setStep(1);
          setStepItems((prev) => {
            const step1 = prev[0];
            step1.status = 'finish';

            const step2 = prev[1];
            step2.status = 'process';
            const newSteps = [step1, step2, ...prev.slice(2)];
            return newSteps;
          });
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
          address: leftToken.address,
          value: parseUnits(leftTokenAmount, leftToken.decimals).toString(),
          decimals: leftToken.decimals.toString(),
        },
        tokenData1: {
          address: rightToken.address,
          value: parseUnits(rightTokenAmount, rightToken.decimals).toString(),
          decimals: rightToken.decimals.toString(),
        },
        packageType: '48',
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

      const ruleV5Types = createRuleV5Types(ruleV5Payload);

      const signature = await walletClient.signTypedData({
        account: address,
        domain,
        types: ruleV5Types,
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

      const poolKey: any[] = [
        token0.address,
        token1.address,
        slot0.swapFee,
        pool.tickSpacing,
        pool.hook.address,
      ];

      const amounts = [
        parseUnits(frozenLeftTokenAmount, leftToken.decimals).toString(),
        parseUnits(frozenRightTokenAmount, rightToken.decimals).toString(),
      ];

      const isToken0 =
        leftToken.address.toLowerCase() === token0.address.toLowerCase();

      if (!isToken0) {
        amounts.reverse();
      }

      const calculateLiquidityDeltaArgs = [
        poolManager.address,
        poolKey,
        frozenTickLower,
        frozenTickUpper,
        ...amounts,
      ];

      const liquidityDelta = await publicClient.readContract({
        account: address,
        address: routerHelper.address,
        abi: routerHelper.abi,
        functionName: 'calculateLiquidityDelta',
        args: calculateLiquidityDeltaArgs,
      });

      const liquidityParams = [
        frozenTickLower,
        frozenTickUpper,
        liquidityDelta,
        bytesToHex(toBytes(0, { size: 32 })),
      ];

      const settleUsingBurn = false;
      const takeClaims = false;

      const args = [
        poolKey,
        liquidityParams,
        purefiData,
        settleUsingBurn,
        takeClaims,
      ];

      const simulationPromise = publicClient.simulateContract({
        account: address,
        address: router.address,
        abi: router.abi,
        functionName: 'modifyLiquidity',
        args,
        value: [leftToken.address, rightToken.address].some(
          (item) => item === zeroAddress,
        )
          ? parseUnits(frozenLeftTokenAmount, leftToken.decimals)
          : undefined,
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

  const addLiquidityHandler = async () => {
    try {
      const walletClient = createWalletClient({
        chain: account.chain!,
        transport: custom((window as any).ethereum!),
      });

      setStep4Loading(true);
      setAddError(null);

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

      const poolKey: any[] = [
        token0.address,
        token1.address,
        slot0.swapFee,
        pool.tickSpacing,
        pool.hook.address,
      ];

      const amounts = [
        parseUnits(frozenLeftTokenAmount, leftToken.decimals).toString(),
        parseUnits(frozenRightTokenAmount, rightToken.decimals).toString(),
      ];

      const isToken0 =
        leftToken.address.toLowerCase() === token0.address.toLowerCase();

      if (!isToken0) {
        amounts.reverse();
      }

      const calculateLiquidityDeltaArgs = [
        poolManager.address,
        poolKey,
        frozenTickLower,
        frozenTickUpper,
        ...amounts,
      ];

      const liquidityDelta = await publicClient.readContract({
        account: address,
        address: routerHelper.address,
        abi: routerHelper.abi,
        functionName: 'calculateLiquidityDelta',
        args: calculateLiquidityDeltaArgs,
      });

      const liquidityParams = [
        frozenTickLower,
        frozenTickUpper,
        liquidityDelta,
        bytesToHex(toBytes(0, { size: 32 })),
      ];

      const settleUsingBurn = false;
      const takeClaims = false;

      const args = [
        poolKey,
        liquidityParams,
        purefiData,
        settleUsingBurn,
        takeClaims,
      ];

      const addHash = await walletClient.writeContract({
        account: address,
        address: router.address,
        abi: router.abi,
        functionName: 'modifyLiquidity',
        args,
        value: [leftToken.address, rightToken.address].some(
          (item) => item === zeroAddress,
        )
          ? parseUnits(frozenLeftTokenAmount, leftToken.decimals)
          : undefined,
      });

      const link = getTransactionLink(addHash, account.chain);

      setAddTxnLink(link);

      setAddLoadingMessage('Transaction in progress');

      const addReceipt = await publicClient.waitForTransactionReceipt({
        hash: addHash,
      });

      const isSuccess = addReceipt.status === 'success';

      if (isSuccess) {
        setStepItems((prev) => {
          const step1 = prev[0];
          const step2 = prev[1];
          const step3 = prev[2];
          const step4 = prev[3];
          step4.status = 'finish';

          const newSteps = [step1, step2, step3, step4];
          return newSteps;
        });

        setAddCompleted(true);
      } else {
        const toastContent = <TxnLink href={link} title="Add Liquidity" />;

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

        setAddError('Transaction reverted');
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

      setAddLoadingMessage('Confirm transaction');

      if (!theError.shortMessage.toLowerCase().includes('user rejected')) {
        setAddError(theError.shortMessage);
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
      addLiquidityHandler();
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
    [styles.special]: !step4Loading && !addError && !addCompleted,
  });

  const leftAllowanceClassName = classNames({
    [styles.allowance]: true,
    [styles.allowance__ok]:
      currentAllowanceLeft !== null &&
      (leftToken.address === zeroAddress
        ? true
        : currentAllowanceLeft >=
          parseUnits(leftTokenAmount, leftToken.decimals)),
  });

  const rightAllowanceClassName = classNames({
    [styles.allowance]: true,
    [styles.allowance__ok]:
      currentAllowanceRight !== null &&
      (rightToken.address === zeroAddress
        ? true
        : currentAllowanceRight >=
          parseUnits(rightTokenAmount, rightToken.decimals)),
  });

  return (
    <Modal
      className={styles.modal}
      title={title}
      open={open}
      onCancel={cancelHandler}
      footer={null}
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
                      <Flex gap="middle" vertical>
                        {leftToken.address !== zeroAddress && (
                          <Flex
                            className={leftAllowanceClassName}
                            gap="small"
                            vertical
                          >
                            <Flex
                              className={styles.item}
                              justify="space-between"
                            >
                              <div
                                className={`${styles.item__title} ${styles.item__title_margin}`}
                              >
                                Current allowance
                              </div>
                              <div className={styles.white}>
                                {currentAllowanceLeft !== null && (
                                  <Typography.Text
                                    style={{ maxWidth: '100%' }}
                                    ellipsis={{
                                      suffix: ` ${leftToken.symbol}`,
                                    }}
                                  >
                                    {formatUnits(
                                      currentAllowanceLeft,
                                      leftToken.decimals,
                                    )}
                                  </Typography.Text>
                                )}
                              </div>
                            </Flex>

                            <Flex
                              className={styles.item}
                              justify="space-between"
                            >
                              <div className={styles.item__title_margin}>
                                Required allowance
                              </div>
                              <div className={styles.white}>
                                <Typography.Text
                                  style={{ maxWidth: '100%' }}
                                  ellipsis={{ suffix: ` ${leftToken.symbol}` }}
                                >
                                  {leftTokenAmount.toString()}
                                </Typography.Text>
                              </div>
                            </Flex>
                          </Flex>
                        )}

                        {rightToken.address !== zeroAddress && (
                          <Flex
                            className={rightAllowanceClassName}
                            gap="small"
                            vertical
                          >
                            <Flex
                              className={styles.item}
                              justify="space-between"
                            >
                              <div className={styles.item__title}>
                                Current allowance
                              </div>
                              <div className={styles.white}>
                                {currentAllowanceRight !== null && (
                                  <Typography.Text
                                    style={{ maxWidth: '100%' }}
                                    ellipsis={{
                                      suffix: ` ${rightToken.symbol}`,
                                    }}
                                  >
                                    {formatUnits(
                                      currentAllowanceRight,
                                      rightToken.decimals,
                                    )}
                                  </Typography.Text>
                                )}
                              </div>
                            </Flex>

                            <Flex
                              className={styles.item}
                              justify="space-between"
                            >
                              <div className={styles.item__title_margin}>
                                Required allowance
                              </div>
                              <div className={styles.white}>
                                <Typography.Text
                                  style={{ maxWidth: '100%' }}
                                  ellipsis={{ suffix: ` ${rightToken.symbol}` }}
                                >
                                  {rightTokenAmount.toString()}
                                </Typography.Text>
                              </div>
                            </Flex>
                          </Flex>
                        )}
                      </Flex>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className={styles.step__footer}>
              {step1Loading && (
                <Button
                  className={styles.theButton}
                  onClick={leftApproveHandler}
                  disabled={step1Loading}
                  block
                >
                  Checking...
                </Button>
              )}
              {!step1Loading && (
                <>
                  {currentAllowanceLeft !== null &&
                    leftToken.address !== zeroAddress &&
                    currentAllowanceLeft <
                      parseUnits(leftTokenAmount, leftToken.decimals) && (
                      <Button
                        className={styles.theButton}
                        onClick={leftApproveHandler}
                        disabled={step1Loading || approveLoading}
                        block
                      >
                        Approve {leftToken.symbol}
                      </Button>
                    )}

                  {currentAllowanceRight !== null &&
                    rightToken.address !== zeroAddress &&
                    currentAllowanceRight <
                      parseUnits(rightTokenAmount, rightToken.decimals) && (
                      <Button
                        className={styles.theButton}
                        onClick={rightApproveHandler}
                        disabled={step1Loading || approveLoading}
                        style={{ marginTop: '10px' }}
                        block
                      >
                        Approve {rightToken.symbol}
                      </Button>
                    )}
                </>
              )}
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
                    <div className={styles.loader__message}>Simulation</div>
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
                      {addLoadingMessage}
                    </div>
                    <div className={styles.loader__spinner}>
                      <LoadingOutlined />
                    </div>
                    {addLoadingMessage.includes('Confirm') && (
                      <div className={styles.loader__hint}>
                        Proceed in your wallet
                      </div>
                    )}
                  </div>
                )}

                {!step4Loading && addError && (
                  <Flex gap="small" vertical style={{ padding: '0 30px' }}>
                    <div className={styles.loader__container}>
                      <div className={styles.loader__message}>
                        <div style={{ marginBottom: 5 }}>
                          Transaction failed
                        </div>
                        {!!addTxnLink && (
                          <a
                            href={addTxnLink}
                            target="_blank"
                            rel="noreferrer noopener"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                            }}
                          >
                            <div>Explorer</div>
                            <div style={{ marginLeft: 5 }}>
                              <ExportOutlined style={{ fontSize: 14 }} />
                            </div>
                          </a>
                        )}
                      </div>
                      <div className={styles.loader__success}>
                        <CloseCircleOutlined
                          style={{ fontSize: 54, color: '#ff4d4f' }}
                        />
                      </div>
                      <div>{addError}</div>
                    </div>
                  </Flex>
                )}

                {!step4Loading && !addError && addCompleted && (
                  <Flex gap="small" vertical style={{ padding: '0 30px' }}>
                    <div className={styles.loader__container}>
                      <div className={styles.loader__message}>
                        <div style={{ marginBottom: 5 }}>Liquidity added!</div>
                        {!!addTxnLink && (
                          <a
                            href={addTxnLink}
                            target="_blank"
                            rel="noreferrer noopener"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                            }}
                          >
                            <div>Explorer</div>
                            <div style={{ marginLeft: 5 }}>
                              <ExportOutlined style={{ fontSize: 14 }} />
                            </div>
                          </a>
                        )}
                      </div>
                      <div className={styles.loader__success}>
                        <CheckCircleOutlined />
                      </div>
                    </div>
                  </Flex>
                )}

                {!addError && (
                  <div className={styles.finish}>
                    <div>
                      <span>{Number(frozenLeftTokenAmount)}</span>
                      <span className={styles.symbol}> {leftToken.symbol}</span>
                    </div>

                    <div className={styles.and}>AND</div>

                    <div>
                      <span>{Number(frozenRightTokenAmount)}</span>
                      <span className={styles.symbol}>
                        {' '}
                        {rightToken.symbol}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.step__footer}>
              {addError || addCompleted ? (
                <Button
                  className={styles.theButton}
                  onClick={finishHandler}
                  block
                >
                  Done
                </Button>
              ) : (
                <Button
                  className={styles.theButton}
                  onClick={addLiquidityHandler}
                  disabled={step4Loading}
                  block
                >
                  Add Liquidity
                </Button>
              )}
            </div>
          </div>
        )}
      </AutoHeight>
    </Modal>
  );
};

export default LiquidityModal;
