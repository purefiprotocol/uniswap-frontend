/* eslint-disable no-nested-ternary */
import { FC, useState, useEffect, useMemo } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useDebouncedCallback } from 'use-debounce';
import {
  createPublicClient,
  custom,
  formatUnits,
  http,
  parseUnits,
  Chain,
} from 'viem';
import {
  NumberFormatValues,
  NumericFormat,
  SourceInfo,
} from 'react-number-format';
import classNames from 'classnames';

import {
  Button,
  Card,
  Col,
  Collapse,
  Flex,
  Radio,
  RadioChangeEvent,
  Row,
} from 'antd';
import { QuestionCircleOutlined, SwapOutlined } from '@ant-design/icons';

import { useConnectModal, useTokenBalance, useQuoter } from '@/hooks';
import { DEFAULT_CHAIN_VIEM, getConfig } from '@/config';
import { Slot0, SwapTypeEnum, TokenConfig } from '@/models';
import {
  DEBOUNCE_DELAY,
  DEFAULT_SLIPPAGE,
  FEE_DEVIDER,
  REFETCH_PRICE_INTERVAL,
} from '@/constants';
import {
  sortTokens,
  getPriceBySlot0,
  formatBalance,
  parseFee,
  formatPrice,
  checkIfChainSupported,
  formatFee,
  getPriceBySqrtX96,
  abortController,
} from '@/utils';

import { SwapModal } from '../SwapModal';

import styles from './SwapCard.module.scss';

const SwapCard: FC = () => {
  const account = useAccount();

  const isWalletConnected = account.isConnected;
  const isChainSupported = checkIfChainSupported(account.chainId);
  const isReady = isWalletConnected && isChainSupported;

  const publicClientConfig = {
    chain: isReady ? account.chain : DEFAULT_CHAIN_VIEM,
    transport: isReady ? custom((window as any).ethereum!) : http(),
  };

  const publicClient = createPublicClient(publicClientConfig);

  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const theConfig = useMemo(
    () => getConfig(account.chainId),
    [account.chainId],
  );

  const { swapRouter, quoter, poolManagerViewer, pools } = theConfig;

  const { quoteExactInputSingle, quoteExactOuputSingle } = useQuoter({
    publicClient,
    quoter,
  });

  const [pool, setPool] = useState(pools[0]);

  const [token0, token1] = sortTokens(pool.token0, pool.token1);

  const [slot0, setSlot0] = useState<Slot0 | null>(null);
  const [liquidity, setLiquidity] = useState<bigint>(BigInt(0));

  const [isPoolStateUpdating, setIsPoolStateUpdating] = useState(false);
  const [isInRecalculating, setIsInRecalculating] = useState(false);
  const [isOutRecalculating, setIsOutRecalculating] = useState(false);

  const [inValue, setInValue] = useState('');
  const [outValue, setOutValue] = useState('');

  const [priceImpact, setPriceImpact] = useState(0);
  const [swapType, setSwapType] = useState<SwapTypeEnum>(SwapTypeEnum.EIFO);

  const [inToken, setInToken] = useState<TokenConfig>(token0);
  const [outToken, setOutToken] = useState<TokenConfig>(token1);

  const [timer, setTimer] = useState(0);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  const openSwapModal = () => {
    setIsSwapModalOpen(true);
  };

  const closeSwapModal = () => {
    setIsSwapModalOpen(false);
    abortController.abort();
  };

  const [slippage, setSlippage] = useState(
    Number(localStorage.getItem('slippage')) || DEFAULT_SLIPPAGE,
  );

  const slippageChangeHandler = (e: RadioChangeEvent) => {
    setSlippage(e.target.value);
    localStorage.setItem('slippage', e.target.value);
  };

  const inBalanceInfo = useTokenBalance({
    tokenAddress: inToken.address,
  });

  const outBalanceInfo = useTokenBalance({
    tokenAddress: outToken.address,
  });

  const connectWalletHandler = () => {
    openConnectModal?.();
  };

  const switchChainHandler = () => {
    switchChain?.({ chainId: DEFAULT_CHAIN_VIEM.id });
  };

  const maxHandler = () => {
    if (!!inBalanceInfo?.data && Number(inBalanceInfo.data?.formatted) > 0) {
      const newInValue = inBalanceInfo.data.formatted;
      setInValue(newInValue);
      setSwapType(SwapTypeEnum.EIFO);
    }
  };

  const allowedHandler = (values: NumberFormatValues) => {
    return Number(values.formattedValue) >= 0;
  };

  const inValueChangeHandlerDebounced = useDebouncedCallback(
    (values: NumberFormatValues, sourceInfo: SourceInfo) => {
      if (sourceInfo.source === 'event') {
        setSwapType(SwapTypeEnum.EIFO);
        if (values.formattedValue !== '') {
          const newInValue = Number(
            Number(values.formattedValue).toFixed(inToken.decimals),
          ).toString();
          setInValue(newInValue);
        } else {
          setInValue('');
        }
      } else {
        //
      }
    },
    DEBOUNCE_DELAY,
  );

  const outValueChangeHandlerDebounced = useDebouncedCallback(
    (values: NumberFormatValues, sourceInfo: SourceInfo) => {
      if (sourceInfo.source === 'event') {
        setSwapType(SwapTypeEnum.EOFI);
        if (values.formattedValue !== '') {
          const newOutValue = Number(
            Number(values.formattedValue).toFixed(outToken.decimals),
          ).toString();
          setOutValue(newOutValue);
        } else {
          setOutValue('');
        }
      } else {
        //
      }
    },
    DEBOUNCE_DELAY,
  );

  const swapAssetsHandler = () => {
    setInToken(outToken);
    setOutToken(inToken);
    if (swapType === SwapTypeEnum.EIFO) {
      setOutValue(inValue);
    } else {
      setInValue(outValue);
    }
    setSwapType((prev) => {
      return prev === SwapTypeEnum.EIFO ? SwapTypeEnum.EOFI : SwapTypeEnum.EIFO;
    });
  };

  useEffect(() => {
    closeSwapModal();
  }, [account.chainId, account.address]);

  useEffect(() => {
    if (!isChainSupported || account.address) {
      setInValue('');
      setOutValue('');
      setSwapType(SwapTypeEnum.EIFO);
    }
  }, [isChainSupported, account.address]);

  useEffect(() => {
    const helper = async () => {
      if (swapType === SwapTypeEnum.EIFO) {
        if (inValue === '') {
          setOutValue('');
        } else if (!!slot0) {
          setIsOutRecalculating(true);

          const quotePayload = {
            pool,
            slot0,
            token: inToken,
            value: inValue,
            hookData: `0x`,
            slippage,
          };

          const result = await quoteExactInputSingle(quotePayload);

          setIsOutRecalculating(false);

          const priceAfter = getPriceBySqrtX96(result.sqrtPriceX96After);
          const priceCurrent = getPriceBySlot0(slot0);

          const newPriceImpact =
            ((priceAfter - priceCurrent) / priceCurrent) * 100;

          setPriceImpact(newPriceImpact);

          setOutValue(formatUnits(result.outValue, outToken.decimals));
        }
      }
    };
    helper();
  }, [inToken, inValue, swapType, slot0, token0]);

  useEffect(() => {
    const helper = async () => {
      if (swapType === SwapTypeEnum.EOFI) {
        if (outValue === '') {
          setInValue('');
        } else if (!!slot0) {
          setIsInRecalculating(true);

          const quotePayload = {
            pool,
            slot0,
            token: outToken,
            value: outValue,
            hookData: `0x`,
            slippage,
          };

          const result = await quoteExactOuputSingle(quotePayload);

          setIsInRecalculating(false);

          const priceAfter = getPriceBySqrtX96(result.sqrtPriceX96After);
          const priceCurrent = getPriceBySlot0(slot0);

          const newPriceImpact =
            ((priceAfter - priceCurrent) / priceCurrent) * 100;

          setPriceImpact(newPriceImpact);

          setInValue(formatUnits(result.inValue, inToken.decimals));
        }
      }
    };
    helper();
  }, [outToken, outValue, swapType, slot0, token0]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, REFETCH_PRICE_INTERVAL);

    return () => {
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const updatePoolState = async (poolId: `0x${string}`) => {
      try {
        setIsPoolStateUpdating(true);

        const slot0Array = await publicClient.readContract({
          address: poolManagerViewer.address,
          abi: poolManagerViewer.abi,
          functionName: 'getSlot0',
          args: [poolId],
        });

        const [sqrtPriceX96, tick, protocolFee, swapFee] =
          slot0Array as unknown as [bigint, number, number, number];

        const newSlot0 = {
          sqrtPriceX96,
          tick,
          protocolFee,
          swapFee,
        };

        const liquidityResult = await publicClient.readContract({
          address: poolManagerViewer.address,
          abi: poolManagerViewer.abi,
          functionName: 'getLiquidity',
          args: [pool.id],
        });

        const newLiquidity = liquidityResult as unknown as bigint;

        if (!slot0 || JSON.stringify(newSlot0) !== JSON.stringify(slot0)) {
          setSlot0(newSlot0);
        }
        setLiquidity(newLiquidity);
      } catch (error) {
        console.log(error);
      } finally {
        setIsPoolStateUpdating(false);
      }
    };

    updatePoolState(pool.id);
  }, [timer, pool, poolManagerViewer]);

  const renderSymbol = (token: TokenConfig) => {
    return token.symbol;
  };

  const renderIcon = (token: TokenConfig) => {
    if (token.icon) {
      return (
        <img className={styles.icon} src={token.icon} alt={token.symbol} />
      );
    }

    return <QuestionCircleOutlined />;
  };

  const renderBalanceText = (balanceInfo: any) => {
    if (!isReady) {
      return null;
    }

    const {
      data: balance,
      isError: isBalanceError,
      error: balanceError,
      isLoading: isBalanceLoading,
    } = balanceInfo;

    let value = '---';

    if (balance?.formatted) {
      value = formatBalance(balance.formatted);
    } else if (isBalanceLoading) {
      value = 'Loading...';
    } else if (isBalanceError) {
      value = 'Error';
    } else {
      value = 'Unknown';
    }

    return `Balance: ${value}`;
  };

  const renderRateText = () => {
    if (!slot0) {
      return null;
    }

    const price = getPriceBySlot0(slot0);

    if (token0.address === inToken.address) {
      return `1 ${token0.symbol} = ${formatPrice(price)} ${token1.symbol}`;
    }

    return `1 ${token1.symbol} = ${formatPrice(1 / price)} ${token0.symbol}`;
  };

  const renderFeeText = (fee: number) => {
    if (!slot0) {
      return '---';
    }

    if (swapType === SwapTypeEnum.EIFO) {
      const feeValue =
        (parseUnits(outValue, outToken.decimals) * BigInt(fee)) /
        BigInt(100 * FEE_DEVIDER);

      const feeValueStr = formatUnits(feeValue, outToken.decimals);
      const feeValueFormatted = formatFee(feeValueStr);

      return `${feeValueFormatted} ${outToken.symbol}`;
    }

    const feeValue =
      (parseUnits(inValue, inToken.decimals) * BigInt(fee)) /
      BigInt(100 * FEE_DEVIDER);

    const feeValueStr = formatUnits(feeValue, inToken.decimals);
    const feeValueFormatted = formatFee(feeValueStr);

    return `${feeValueFormatted} ${inToken.symbol}`;
  };

  const isInInputEmpty = Number(inValue) === 0;

  const isBalanceSufficient = inBalanceInfo?.data?.balance
    ? Number(inBalanceInfo.data.formatted) >= Number(inValue)
    : false;

  const isLoading = isPoolStateUpdating;

  const isSwapDisabled =
    isInInputEmpty || !isBalanceSufficient || isLoading || isSwapModalOpen;

  const canSetMaxValue =
    !!inBalanceInfo?.data && Number(inBalanceInfo.data?.formatted) > 0;

  const outInputClassName = classNames({
    [styles.input]: true,
    [styles.input__busy]: isOutRecalculating,
  });

  const inInputClassName = classNames({
    [styles.input]: true,
    [styles.input__busy]: isInRecalculating,
  });

  return (
    <>
      <Card
        className={styles.card}
        title="Swap"
        extra={
          <Flex align="center" gap="small" className={styles.slippage}>
            <span>Slippage</span>
            <Radio.Group
              name="slippage"
              value={slippage}
              onChange={slippageChangeHandler}
              buttonStyle="solid"
            >
              <Radio.Button value={DEFAULT_SLIPPAGE}>
                {DEFAULT_SLIPPAGE}%
              </Radio.Button>
            </Radio.Group>
          </Flex>
        }
        bordered={false}
      >
        <Flex className={styles.token} gap="small" vertical>
          <div className={styles.title}>You pay</div>
          <Row gutter={16} align="middle">
            <Col className="gutter-row" span={16}>
              <NumericFormat
                name="in"
                className={inInputClassName}
                value={inValue}
                onValueChange={inValueChangeHandlerDebounced}
                placeholder="0"
                isAllowed={allowedHandler}
                allowedDecimalSeparators={['.', ',']}
                valueIsNumericString
                allowLeadingZeros={false}
                allowNegative={false}
                readOnly={isWalletConnected && !isChainSupported}
                required
              />
            </Col>
            <Col className="gutter-row" span={8}>
              <Flex align="center" justify="flex-end">
                <div className={styles.asset}>
                  <div className={styles.icon_wrapper}>
                    {renderIcon(inToken)}
                  </div>
                  <div className={styles.symbol_wrapper}>
                    {renderSymbol(inToken)}
                  </div>
                </div>
              </Flex>
            </Col>
          </Row>
          <Flex align="center" justify="flex-end">
            <div className={styles.balance}>
              <span>{renderBalanceText(inBalanceInfo)}</span>
              {canSetMaxValue && (
                <button
                  className={styles.maxButton}
                  type="button"
                  onClick={maxHandler}
                >
                  Max
                </button>
              )}
            </div>
          </Flex>
        </Flex>

        <div className={styles.switch}>
          <Button
            onClick={swapAssetsHandler}
            className={styles.raplaceButton}
            icon={<SwapOutlined />}
          />
        </div>

        <Flex className={styles.token} gap="small" vertical>
          <div className={styles.title}>You receive</div>
          <Row gutter={16} align="middle">
            <Col className="gutter-row" span={16}>
              <NumericFormat
                name="out"
                className={outInputClassName}
                value={outValue}
                onValueChange={outValueChangeHandlerDebounced}
                placeholder="0"
                isAllowed={allowedHandler}
                allowedDecimalSeparators={['.', ',']}
                valueIsNumericString
                allowLeadingZeros={false}
                allowNegative={false}
                readOnly={isWalletConnected && !isChainSupported}
                required
              />
            </Col>
            <Col className="gutter-row" span={8}>
              <Flex align="center" justify="flex-end">
                <div className={styles.asset}>
                  <div className={styles.icon_wrapper}>
                    {renderIcon(outToken)}
                  </div>
                  <div>{renderSymbol(outToken)}</div>
                </div>
              </Flex>
            </Col>
          </Row>
          <Flex align="center" justify="flex-end">
            <div className={styles.balance}>
              <span>{renderBalanceText(outBalanceInfo)}</span>
            </div>
          </Flex>
        </Flex>

        <div className={styles.footer}>
          {!isWalletConnected && (
            <Button
              className={styles.swapButton}
              onClick={connectWalletHandler}
              block
            >
              Connect Wallet
            </Button>
          )}

          {isWalletConnected && (
            <>
              {!isChainSupported && (
                <Button
                  className={styles.swapButton}
                  onClick={switchChainHandler}
                  block
                >
                  Switch Network
                </Button>
              )}

              {isChainSupported && (
                <Button
                  className={styles.swapButton}
                  onClick={openSwapModal}
                  disabled={isSwapDisabled}
                  block
                >
                  {isInInputEmpty
                    ? 'Enter an amount'
                    : isBalanceSufficient
                      ? 'Swap'
                      : `Insufficient ${inToken.symbol} balance`}
                </Button>
              )}
            </>
          )}
        </div>

        {!isInInputEmpty && !!slot0 && (
          <Collapse
            className={styles.details}
            items={[
              {
                key: '1',
                label: <div className={styles.rate}>{renderRateText()}</div>,
                children: (
                  <>
                    <Flex className={styles.item} justify="space-between">
                      <div>Swap type</div>
                      <div className={styles.white}>
                        {swapType === SwapTypeEnum.EIFO
                          ? 'Exact Input for Output'
                          : 'Exact Output for Input'}
                      </div>
                    </Flex>
                    <Flex className={styles.item} justify="space-between">
                      <div>Swap fee ({parseFee(slot0.swapFee)}%)</div>
                      <div className={styles.white}>
                        {renderFeeText(slot0.swapFee)}
                      </div>
                    </Flex>
                    <Flex className={styles.item} justify="space-between">
                      <div>Protocol fee ({parseFee(slot0.protocolFee)}%)</div>
                      <div className={styles.white}>
                        {renderFeeText(slot0.protocolFee)}
                      </div>
                    </Flex>
                    <Flex className={styles.item} justify="space-between">
                      <div>Max. slippage</div>
                      <div className={styles.white}>{slippage}%</div>
                    </Flex>
                  </>
                ),
              },
            ]}
            expandIconPosition="end"
            bordered={false}
            ghost
          />
        )}
      </Card>

      {isSwapModalOpen && (
        <SwapModal
          title="Swap Flow"
          open={isSwapModalOpen}
          inValue={inValue}
          inToken={inToken}
          outValue={outValue}
          outToken={outToken}
          token0={token0}
          token1={token1}
          pool={pool}
          router={swapRouter}
          poolManagerViewer={poolManagerViewer}
          swapType={swapType}
          slot0={slot0!}
          slippage={slippage}
          onCancel={closeSwapModal}
        />
      )}
    </>
  );
};

export default SwapCard;
