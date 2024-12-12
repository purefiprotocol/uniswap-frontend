/* eslint-disable no-nested-ternary */
/* eslint-disable jsx-a11y/control-has-associated-label */
import { FC, useState, useEffect, useMemo } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';

import {
  createPublicClient,
  custom,
  formatUnits,
  http,
  parseUnits,
} from 'viem';
import { nearestUsableTick, TickMath } from '@uniswap/v3-sdk';

import { useDebouncedCallback } from 'use-debounce';
import {
  NumberFormatValues,
  NumericFormat,
  SourceInfo,
} from 'react-number-format';

import { Button, Card, Col, Flex, Radio, RadioChangeEvent, Row } from 'antd';
import {
  CheckOutlined,
  MinusOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import classNames from 'classnames';

import { useConnectModal, useLiquidityHelper, useTokenBalance } from '@/hooks';
import { DEFAULT_CHAIN, getConfig } from '@/config';
import {
  DirectionEnum,
  FeeTierEnum,
  PercentageEnum,
  Slot0,
  TokenConfig,
} from '@/models';
import {
  DEBOUNCE_DELAY,
  DEFAULT_PRICE_DECIMALS,
  DEFAULT_SLIPPAGE,
  FEE_DEVIDER,
  REFETCH_PRICE_INTERVAL,
} from '@/constants';
import {
  sortTokens,
  checkIfChainSupported,
  getPriceBySlot0,
  formatPrice,
  formatBalance,
  correctPriceByPrice,
  correctPriceByTick,
  abortController,
} from '@/utils';

import { AutoHeight } from '../AutoHeight';
import { LiquidityModal } from '../LiquidityModal';

import styles from './LiquidityCard.module.scss';

const SwapCard: FC = () => {
  const account = useAccount();

  const isWalletConnected = account.isConnected;
  const isChainSupported = checkIfChainSupported(account.chainId);
  const isReady = isWalletConnected && isChainSupported;
  const isReadOnlyMode = isWalletConnected && !isChainSupported;

  const publicClientConfig = {
    chain: isReady ? account.chain : DEFAULT_CHAIN,
    transport: isReady ? custom((window as any).ethereum!) : http(),
  };

  const publicClient = createPublicClient(publicClientConfig);

  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const theConfig = useMemo(
    () => getConfig(account.chainId),
    [account.chainId],
  );

  const { liquidityRouter, poolManagerViewer, liquidityHelper, pools } =
    theConfig;

  const { calculateAmountsByAmountToken0, calculateAmountsByAmountToken1 } =
    useLiquidityHelper({
      publicClient,
      liquidityHelper,
    });

  const [pool, setPool] = useState(pools[0]);

  const [slot0, setSlot0] = useState<Slot0 | null>(null);
  const [timer, setTimer] = useState(0);

  const [token0, token1] = sortTokens(pool.token0, pool.token1);

  const [tickLower, setTickLower] = useState(
    nearestUsableTick(TickMath.MIN_TICK, pool.tickSpacing),
  );
  const [tickUpper, setTickUpper] = useState(
    nearestUsableTick(TickMath.MAX_TICK, pool.tickSpacing),
  );

  const [leftToken, setLeftToken] = useState<TokenConfig>(token0);
  const [rightToken, setRightToken] = useState<TokenConfig>(token1);

  const [direction, setDirection] = useState<DirectionEnum>(DirectionEnum.LEFT);

  const [isPoolStateUpdating, setIsPoolStateUpdating] = useState(false);
  const [liquidity, setLiquidity] = useState(BigInt(0));

  const [isLeftTokenRecalculating, setIsLeftTokenRecalculating] =
    useState(false);
  const [isRightTokenRecalculating, setIsRightTokenRecalculating] =
    useState(false);

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [leftTokenAmount, setLeftTokenAmount] = useState('');
  const [rightTokenAmount, setRightTokenAmount] = useState('');

  const [lastChanged, setLastChanged] = useState('');

  const [slippage, setSlippage] = useState(
    Number(localStorage.getItem('slippage')) || DEFAULT_SLIPPAGE,
  );

  const [activeTierId, setActiveTierId] = useState(
    FeeTierEnum.VERY_STABLE_PAIRS,
  );

  const [activePercentage, setActivePercentage] =
    useState<PercentageEnum | null>(PercentageEnum.ONE);

  const currentPrice = useMemo(() => {
    if (slot0) {
      const price = getPriceBySlot0(slot0);

      if (leftToken.address.toLowerCase() === token0.address.toLowerCase()) {
        return formatPrice(price);
      }

      return formatPrice(1 / price);
    }

    return formatPrice(0);
  }, [slot0, leftToken, rightToken]);

  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false);

  const openLiquidityModal = () => {
    setIsLiquidityModalOpen(true);
  };

  const closeLiquidityModal = () => {
    setIsLiquidityModalOpen(false);
    abortController.abort();
  };

  const slippageChangeHandler = (e: RadioChangeEvent) => {
    setSlippage(e.target.value);
    localStorage.setItem('slippage', e.target.value);
  };

  const connectWalletHandler = () => {
    openConnectModal?.();
  };

  const switchChainHandler = () => {
    switchChain?.({ chainId: DEFAULT_CHAIN.id });
  };

  useEffect(() => {
    closeLiquidityModal();
  }, [account.chainId, account.address]);

  useEffect(() => {
    if (!isChainSupported || account.address) {
      setMinPrice('');
      setMaxPrice('');
      setLeftTokenAmount('');
      setRightTokenAmount('');
      setTickLower(nearestUsableTick(TickMath.MIN_TICK, pool.tickSpacing));
      setTickUpper(nearestUsableTick(TickMath.MAX_TICK, pool.tickSpacing));
    }
  }, [isChainSupported, account.address]);

  useEffect(() => {
    if (slot0) {
      // TODO handle full range
      if (activePercentage === PercentageEnum.FULL) {
        setMinPrice('0');
        setMaxPrice('∞');
      } else if (activePercentage !== null) {
        let price = getPriceBySlot0(slot0);

        if (leftToken.address.toLowerCase() !== token0.address.toLowerCase()) {
          price = 1 / price;
        }
        const delta = (price * activePercentage) / 100;
        const newMinPrice = price - delta;
        const newMaxPrice = price + delta;

        setMinPrice(formatPrice(newMinPrice).toString());
        setMaxPrice(formatPrice(newMaxPrice).toString());
      }
    } else {
      setMinPrice('');
      setMaxPrice('');
    }
  }, [slot0, activePercentage, leftToken]);

  useEffect(() => {
    const helper = async () => {
      if (lastChanged === 'leftToken') {
        if (leftTokenAmount === '') {
          setRightTokenAmount('');
        } else if (slot0) {
          setIsRightTokenRecalculating(true);

          if (tickLower !== tickUpper) {
            const isToken0 =
              leftToken.address.toLowerCase() === token0.address.toLowerCase();

            const calclulateAmout = isToken0
              ? calculateAmountsByAmountToken0
              : calculateAmountsByAmountToken1;

            const tokenAmount = parseUnits(
              leftTokenAmount,
              leftToken.decimals,
            ).toString();

            const payload = {
              tick: slot0.tick,
              sqrtPriceX96: slot0.sqrtPriceX96,
              tokenAmount,
              tickLower,
              tickUpper,
            };

            const {
              amountToken0: newAmountToken0,
              amountToken1: newAmountToken1,
            } = await calclulateAmout(payload);

            const newRightTokenAmount = isToken0
              ? newAmountToken1
              : newAmountToken0;

            const parsedNewRightTokenAmount = formatUnits(
              newRightTokenAmount,
              rightToken.decimals,
            );

            setRightTokenAmount(parsedNewRightTokenAmount);
          }

          setIsRightTokenRecalculating(false);
        }
      }
    };
    helper();
  }, [leftTokenAmount, minPrice, maxPrice, slot0]);

  useEffect(() => {
    const helper = async () => {
      if (lastChanged === 'rightToken') {
        if (rightTokenAmount === '') {
          setLeftTokenAmount('');
        } else if (!!slot0) {
          setIsLeftTokenRecalculating(true);

          if (tickLower !== tickUpper) {
            const isToken0 =
              rightToken.address.toLowerCase() === token0.address.toLowerCase();

            const calclulateAmout = isToken0
              ? calculateAmountsByAmountToken0
              : calculateAmountsByAmountToken1;

            const tokenAmount = parseUnits(
              rightTokenAmount,
              rightToken.decimals,
            ).toString();

            const payload = {
              tick: slot0.tick,
              sqrtPriceX96: slot0.sqrtPriceX96,
              tokenAmount,
              tickLower,
              tickUpper,
            };

            const {
              amountToken0: newAmountToken0,
              amountToken1: newAmountToken1,
            } = await calclulateAmout(payload);

            const newLeftTokenAmount = isToken0
              ? newAmountToken1
              : newAmountToken0;

            const parsedNewLeftTokenAmount = formatUnits(
              newLeftTokenAmount,
              leftToken.decimals,
            );

            setLeftTokenAmount(parsedNewLeftTokenAmount);
          }

          setIsLeftTokenRecalculating(false);
        }
      }
    };
    helper();
  }, [rightTokenAmount, minPrice, maxPrice, slot0]);

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

  const changeDirectionHandler = () => {
    if (!isReadOnlyMode) {
      setDirection((prev) => {
        return prev === DirectionEnum.LEFT
          ? DirectionEnum.RIGHT
          : DirectionEnum.LEFT;
      });

      setLeftToken(rightToken);
      setRightToken(leftToken);

      const prevLeftTokenAmount = leftTokenAmount;

      setLeftTokenAmount(rightTokenAmount);
      setRightTokenAmount(prevLeftTokenAmount);

      setLastChanged((prev) =>
        prev === 'leftToken' ? 'rightToken' : 'leftToken',
      );
    }
  };

  const allowedHandler = (values: NumberFormatValues) => {
    return Number(values.formattedValue) >= 0;
  };

  const leftTokenBalanceInfo = useTokenBalance({
    tokenAddress: leftToken.address,
  });

  const rightTokenBalanceInfo = useTokenBalance({
    tokenAddress: rightToken.address,
  });

  const canSetMaxValueLeftToken =
    !!leftTokenBalanceInfo?.data &&
    Number(leftTokenBalanceInfo.data?.formatted) > 0;

  const canSetMaxValueRightToken =
    !!rightTokenBalanceInfo?.data &&
    Number(rightTokenBalanceInfo.data?.formatted) > 0;

  const maxLeftTokenHandler = () => {
    if (!isReadOnlyMode) {
      if (
        !!leftTokenBalanceInfo?.data &&
        Number(leftTokenBalanceInfo.data?.formatted) > 0
      ) {
        const newLeftValue = leftTokenBalanceInfo.data.formatted;
        setLeftTokenAmount(newLeftValue);
        setLastChanged('leftToken');
      }
    }
  };

  const maxRightTokenHandler = () => {
    if (!isReadOnlyMode) {
      if (
        !!rightTokenBalanceInfo?.data &&
        Number(rightTokenBalanceInfo.data?.formatted) > 0
      ) {
        const newInValue = rightTokenBalanceInfo.data.formatted;
        setRightTokenAmount(newInValue);
        setLastChanged('rightToken');
      }
    }
  };

  const leftTokenAmountChangeHandlerDebounced = useDebouncedCallback(
    (values: NumberFormatValues, sourceInfo: SourceInfo) => {
      if (sourceInfo.source === 'event') {
        if (values.formattedValue !== '') {
          const newToken0Amount = Number(values.formattedValue).toString();
          setLeftTokenAmount(newToken0Amount);
          setLastChanged('leftToken');
        } else {
          setLeftTokenAmount('');
        }
      } else {
        //
      }
    },
    DEBOUNCE_DELAY,
  );

  const rightTokenAmountChangeHandlerDebounced = useDebouncedCallback(
    (values: NumberFormatValues, sourceInfo: SourceInfo) => {
      if (sourceInfo.source === 'event') {
        if (values.formattedValue !== '') {
          const newToken1Amount = Number(values.formattedValue).toString();
          setRightTokenAmount(newToken1Amount);
          setLastChanged('rightToken');
        } else {
          setRightTokenAmount('');
        }
      } else {
        //
      }
    },
    DEBOUNCE_DELAY,
  );

  const minPriceChangeHandlerDebounced = useDebouncedCallback(
    (values: NumberFormatValues, sourceInfo: SourceInfo) => {
      if (sourceInfo.source === 'event') {
        setActivePercentage(null);
      }

      if (values.formattedValue !== '') {
        const [newMinPriceValue, minTick] = correctPriceByPrice(
          values.formattedValue,
          pool.tickSpacing,
        );

        setTickLower(minTick);

        const newMinPriceValueFormatted = Number(
          newMinPriceValue.toFixed(DEFAULT_PRICE_DECIMALS),
        ).toString();

        setMinPrice(newMinPriceValueFormatted);
      } else {
        setMinPrice('');
      }
    },
    DEBOUNCE_DELAY,
  );

  const maxPriceChangeHandlerDebounced = useDebouncedCallback(
    (values: NumberFormatValues, sourceInfo: SourceInfo) => {
      if (sourceInfo.source === 'event') {
        setActivePercentage(null);
      }
      if (values.formattedValue !== '') {
        const [newMaxPriceValue, minTick] = correctPriceByPrice(
          values.formattedValue,
          pool.tickSpacing,
        );

        setTickUpper(minTick);

        const newMaxPriceValueFormatted = Number(
          newMaxPriceValue.toFixed(DEFAULT_PRICE_DECIMALS),
        ).toString();

        setMaxPrice(newMaxPriceValueFormatted);
      } else {
        setMaxPrice('');
      }
    },
    DEBOUNCE_DELAY,
  );

  const isLeftTokenInputEmpty =
    Number(leftTokenAmount) === 0 && !!slot0 && !(tickUpper < slot0.tick);
  const isRightTokenInputEmpty =
    Number(rightTokenAmount) === 0 && !!slot0 && !(tickLower > slot0.tick);

  const isInputEmpty = isLeftTokenInputEmpty || isRightTokenInputEmpty;

  const isTokenLeftBalanceSufficient = leftTokenBalanceInfo?.data?.balance
    ? Number(leftTokenBalanceInfo.data.formatted) >= Number(leftTokenAmount)
    : false;

  const isTokenRightBalanceSufficient = rightTokenBalanceInfo?.data?.balance
    ? Number(rightTokenBalanceInfo.data.formatted) >= Number(rightTokenAmount)
    : false;

  const isBalanceSufficient =
    isTokenLeftBalanceSufficient && isTokenRightBalanceSufficient;

  const isLoading = isPoolStateUpdating;

  const isAddLiquidityDisabled =
    isInputEmpty || !isBalanceSufficient || isLoading || isLiquidityModalOpen;

  const feeTierChangeHandler = (tierId: FeeTierEnum) => {
    if (!isReadOnlyMode) {
      setActiveTierId(tierId);
    }
  };

  const percentageChangeHandler = (percentage: PercentageEnum) => {
    if (!isReadOnlyMode) {
      setActivePercentage(percentage);
    }
  };

  const minPriceIncreaseHandler = () => {
    if (!isReadOnlyMode) {
      setActivePercentage(null);
      const [priceByTick, minTick] = correctPriceByTick(
        tickLower + pool.tickSpacing,
        pool.tickSpacing,
      );

      const newMinPriceValueFormatted = Number(
        priceByTick.toFixed(DEFAULT_PRICE_DECIMALS),
      ).toString();

      setTickLower(minTick);

      setMinPrice(newMinPriceValueFormatted);
    }
  };

  const minPriceDecreaseHandler = () => {
    if (!isReadOnlyMode) {
      setActivePercentage(null);

      const [priceByTick, minTick] = correctPriceByTick(
        tickLower - pool.tickSpacing,
        pool.tickSpacing,
      );

      const newMinPriceValueFormatted = Number(
        priceByTick.toFixed(DEFAULT_PRICE_DECIMALS),
      ).toString();

      setTickLower(minTick);

      setMinPrice(newMinPriceValueFormatted);
    }
  };

  const maxPriceIncreaseHandler = () => {
    if (!isReadOnlyMode) {
      setActivePercentage(null);

      const [priceByTick, minTick] = correctPriceByTick(
        tickUpper + pool.tickSpacing,
        pool.tickSpacing,
      );

      const newMaxPriceValueFormatted = Number(
        priceByTick.toFixed(DEFAULT_PRICE_DECIMALS),
      ).toString();

      setTickUpper(minTick);

      setMaxPrice(newMaxPriceValueFormatted);
    }
  };

  const maxPriceDecreaseHandler = () => {
    if (!isReadOnlyMode) {
      setActivePercentage(null);

      const [priceByTick, minTick] = correctPriceByTick(
        tickUpper - pool.tickSpacing,
        pool.tickSpacing,
      );

      const newMaxPriceValueFormatted = Number(
        priceByTick.toFixed(DEFAULT_PRICE_DECIMALS),
      ).toString();

      setTickUpper(minTick);

      setMaxPrice(newMaxPriceValueFormatted);
    }
  };

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

  const renderRateText = () => {
    if (!slot0) {
      return null;
    }

    return `1 ${leftToken.symbol} = ${currentPrice} ${rightToken.symbol} [Tick ${slot0.tick}]`;
  };

  const renderHelperText = () => {
    if (!slot0) {
      return null;
    }

    return `${rightToken.symbol} for ${leftToken.symbol}`;
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

  const tierClassName = (tierId: FeeTierEnum) => {
    return classNames({
      [styles.tier]: true,
      [styles.tier__active]: activeTierId === tierId,
    });
  };

  const percentageClassName = (percentage: PercentageEnum) => {
    return classNames({
      [styles.percentage]: true,
      [styles.percentage__active]: activePercentage === percentage,
    });
  };

  const minPriceInputClassName = classNames({
    [styles.priceInput]: true,
  });

  const maxPriceInputClassName = classNames({
    [styles.priceInput]: true,
  });

  const leftTokenAmountClassName = classNames({
    [styles.amountInput]: true,
  });

  const leftTokenWrapperClassName = classNames({
    [styles.tokenWrapper]: true,
    [styles.tokenWrapper__hidden]: !!slot0 && tickUpper < slot0.tick,
  });

  const rightTokenAmountClassName = classNames({
    [styles.amountInput]: true,
  });

  const rightTokenWrapperClassName = classNames({
    [styles.tokenWrapper]: true,
    [styles.tokenWrapper__hidden]: !!slot0 && tickLower > slot0.tick,
  });

  return (
    <>
      <Card
        className={styles.card}
        title="Liquidity"
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
        <Flex gap="small" vertical style={{ marginTop: 14 }}>
          <div className={styles.subtitle}>Pool Pair</div>

          <Flex gap="middle">
            <div className={styles.asset}>
              <div className={styles.icon_wrapper}>{renderIcon(leftToken)}</div>
              <div>{renderSymbol(leftToken)}</div>
            </div>

            <div className={styles.asset}>
              <div className={styles.icon_wrapper}>
                {renderIcon(rightToken)}
              </div>
              <div>{renderSymbol(rightToken)}</div>
            </div>
          </Flex>
        </Flex>

        <Flex gap="small" vertical style={{ marginTop: 14 }}>
          <div className={styles.subtitle}>Fee Tiers</div>

          <Flex className={styles.tiers} gap="small">
            <button
              type="button"
              className={tierClassName(FeeTierEnum.VERY_STABLE_PAIRS)}
              onClick={feeTierChangeHandler.bind(
                this,
                FeeTierEnum.VERY_STABLE_PAIRS,
              )}
            >
              <Flex gap="small" align="space-between" vertical>
                <Flex gap="middle" justify="space-between" align="center">
                  <div>{FeeTierEnum.VERY_STABLE_PAIRS / FEE_DEVIDER}%</div>
                  <div className={styles.check_mark}>
                    <CheckOutlined />
                  </div>
                </Flex>
                <div className={styles.tier_desc}>For very stable pairs</div>
              </Flex>
            </button>

            <button
              type="button"
              className={tierClassName(FeeTierEnum.STABLE_PAIRS)}
              onClick={feeTierChangeHandler.bind(
                this,
                FeeTierEnum.STABLE_PAIRS,
              )}
              disabled
            >
              <Flex gap="small" justify="space-between" vertical>
                <Flex gap="middle" justify="space-between" align="center">
                  <div>{FeeTierEnum.STABLE_PAIRS / FEE_DEVIDER}%</div>
                  <div className={styles.check_mark}>
                    <CheckOutlined />
                  </div>
                </Flex>

                <div className={styles.tier_desc}>For stable pairs</div>
              </Flex>
            </button>

            <button
              type="button"
              className={tierClassName(FeeTierEnum.MOST_PAIRS)}
              onClick={feeTierChangeHandler.bind(this, FeeTierEnum.MOST_PAIRS)}
              disabled
            >
              <Flex gap="small" justify="space-between" vertical>
                <Flex gap="middle" justify="space-between" align="center">
                  <div>{FeeTierEnum.MOST_PAIRS / FEE_DEVIDER}%</div>
                  <div className={styles.check_mark}>
                    <CheckOutlined />
                  </div>
                </Flex>

                <div className={styles.tier_desc}>For most pairs</div>
              </Flex>
            </button>

            <button
              type="button"
              className={tierClassName(FeeTierEnum.EXOTIC_PAIRS)}
              onClick={feeTierChangeHandler.bind(
                this,
                FeeTierEnum.EXOTIC_PAIRS,
              )}
              disabled
            >
              <Flex gap="small" justify="space-between" vertical>
                <Flex gap="middle" justify="space-between" align="center">
                  <div>{FeeTierEnum.EXOTIC_PAIRS / FEE_DEVIDER}%</div>
                  <div className={styles.check_mark}>
                    <CheckOutlined />
                  </div>
                </Flex>

                <div className={styles.tier_desc}>For exotic pairs</div>
              </Flex>
            </button>
          </Flex>
        </Flex>

        <Flex gap="small" vertical style={{ marginTop: 14 }}>
          <div className={styles.subtitle}>Current Price</div>

          <AutoHeight>
            {renderRateText() && (
              <div className={styles.currentPrice}>{renderRateText()}</div>
            )}
          </AutoHeight>
        </Flex>

        <Flex gap="small" vertical style={{ marginTop: 28 }}>
          <Row gutter={16} align="middle">
            <Col className="gutter-row" span={12}>
              <Flex gap="middle" align="center">
                <div className={styles.subtitle}>Price Range</div>
                <div className={styles.priceByToken}>
                  <Radio.Group
                    value={direction}
                    onChange={changeDirectionHandler}
                    buttonStyle="solid"
                  >
                    <Radio.Button value={DirectionEnum.LEFT}>
                      {token0.symbol}
                    </Radio.Button>
                    <Radio.Button value={DirectionEnum.RIGHT}>
                      {token1.symbol}
                    </Radio.Button>
                  </Radio.Group>
                </div>
              </Flex>
            </Col>

            <Col className="gutter-row" span={12}>
              <Flex
                className={styles.percentages}
                justify="flex-end"
                gap="small"
              >
                <button
                  type="button"
                  className={percentageClassName(PercentageEnum.ONE)}
                  onClick={percentageChangeHandler.bind(
                    this,
                    PercentageEnum.ONE,
                  )}
                >
                  <Flex gap="small" align="center" justify="center">
                    <div>&#177;{PercentageEnum.ONE}%</div>
                  </Flex>
                </button>

                <button
                  type="button"
                  className={percentageClassName(PercentageEnum.FIVE)}
                  onClick={percentageChangeHandler.bind(
                    this,
                    PercentageEnum.FIVE,
                  )}
                >
                  <Flex gap="small" align="center" justify="center">
                    <div>&#177;{PercentageEnum.FIVE}%</div>
                  </Flex>
                </button>

                <button
                  type="button"
                  className={percentageClassName(PercentageEnum.TEN)}
                  onClick={percentageChangeHandler.bind(
                    this,
                    PercentageEnum.TEN,
                  )}
                >
                  <Flex gap="small" align="center" justify="center">
                    <div>&#177;{PercentageEnum.TEN}%</div>
                  </Flex>
                </button>

                <button
                  type="button"
                  className={percentageClassName(PercentageEnum.FULL)}
                  onClick={percentageChangeHandler.bind(
                    this,
                    PercentageEnum.FULL,
                  )}
                  disabled
                >
                  <Flex gap="small" align="center" justify="center">
                    <div>Full Range</div>
                  </Flex>
                </button>
              </Flex>
            </Col>
          </Row>

          <Flex gap="small" justify="space-between">
            <div className={styles.priceWrapper}>
              <Flex>
                <div style={{ width: '100%' }}>
                  <div className={styles.priceWrapper_hint}>
                    <span>Low price</span>
                    <b style={{ color: '#fff' }}>[Tick {tickLower}]</b>
                  </div>
                  <NumericFormat
                    name="minPrice"
                    className={minPriceInputClassName}
                    value={minPrice}
                    onValueChange={minPriceChangeHandlerDebounced}
                    placeholder="0"
                    isAllowed={allowedHandler}
                    allowedDecimalSeparators={['.', ',']}
                    valueIsNumericString
                    allowLeadingZeros={false}
                    allowNegative={false}
                    readOnly={isReadOnlyMode}
                    decimalScale={DEFAULT_PRICE_DECIMALS}
                    required
                  />
                  <div className={styles.priceWrapper_hint}>
                    {renderHelperText()}
                  </div>
                </div>
                <Flex vertical justify="space-between">
                  <button
                    className={styles.increaseButton}
                    type="button"
                    onClick={minPriceIncreaseHandler}
                  >
                    <PlusOutlined />
                  </button>

                  <button
                    className={styles.increaseButton}
                    type="button"
                    onClick={minPriceDecreaseHandler}
                  >
                    <MinusOutlined />
                  </button>
                </Flex>
              </Flex>
            </div>

            <div className={styles.priceWrapper}>
              <Flex>
                <div style={{ width: '100%' }}>
                  <div className={styles.priceWrapper_hint}>
                    <span>High price</span>
                    <b style={{ color: '#fff' }}> [Tick {tickUpper}]</b>
                  </div>
                  <NumericFormat
                    name="maxPrice"
                    className={maxPriceInputClassName}
                    value={maxPrice}
                    onValueChange={maxPriceChangeHandlerDebounced}
                    placeholder="0"
                    isAllowed={allowedHandler}
                    allowedDecimalSeparators={['.', ',']}
                    valueIsNumericString
                    allowLeadingZeros={false}
                    allowNegative={false}
                    readOnly={isReadOnlyMode}
                    decimalScale={DEFAULT_PRICE_DECIMALS}
                    required
                  />
                  <div className={styles.priceWrapper_hint}>
                    {renderHelperText()}
                  </div>
                </div>
                <Flex vertical justify="space-between">
                  <button
                    className={styles.increaseButton}
                    type="button"
                    onClick={maxPriceIncreaseHandler}
                  >
                    <PlusOutlined />
                  </button>

                  <button
                    className={styles.increaseButton}
                    type="button"
                    onClick={maxPriceDecreaseHandler}
                  >
                    <MinusOutlined />
                  </button>
                </Flex>
              </Flex>
            </div>
          </Flex>
        </Flex>

        <Flex gap="small" vertical style={{ marginTop: 14 }}>
          <div className={styles.subtitle}>Deposit Amounts</div>

          <Flex gap="small" justify="space-between">
            <Flex className={leftTokenWrapperClassName} gap="small" vertical>
              <Row gutter={16} align="middle">
                <Col className="gutter-row" span={16}>
                  <NumericFormat
                    name="leftTokenAmount"
                    className={leftTokenAmountClassName}
                    value={leftTokenAmount}
                    onValueChange={leftTokenAmountChangeHandlerDebounced}
                    placeholder="0"
                    isAllowed={allowedHandler}
                    allowedDecimalSeparators={['.', ',']}
                    valueIsNumericString
                    allowLeadingZeros={false}
                    allowNegative={false}
                    readOnly={isReadOnlyMode}
                    required
                  />
                </Col>
                <Col className="gutter-row" span={8}>
                  <Flex align="center" justify="flex-end">
                    <div className={styles.asset2}>
                      <div className={styles.icon_wrapper}>
                        {renderIcon(leftToken)}
                      </div>
                      <div className={styles.symbol_wrapper}>
                        {renderSymbol(leftToken)}
                      </div>
                    </div>
                  </Flex>
                </Col>
              </Row>

              <Flex align="center" justify="flex-end">
                <div className={styles.balance}>
                  <span>{renderBalanceText(leftTokenBalanceInfo)}</span>
                  {canSetMaxValueLeftToken && (
                    <button
                      className={styles.maxButton}
                      type="button"
                      onClick={maxLeftTokenHandler}
                    >
                      Max
                    </button>
                  )}
                </div>
              </Flex>
            </Flex>

            <Flex className={rightTokenWrapperClassName} gap="small" vertical>
              <Row gutter={16} align="middle">
                <Col className="gutter-row" span={16}>
                  <NumericFormat
                    name="rightTokenAmount"
                    className={rightTokenAmountClassName}
                    value={rightTokenAmount}
                    onValueChange={rightTokenAmountChangeHandlerDebounced}
                    placeholder="0"
                    isAllowed={allowedHandler}
                    allowedDecimalSeparators={['.', ',']}
                    valueIsNumericString
                    allowLeadingZeros={false}
                    allowNegative={false}
                    readOnly={isReadOnlyMode}
                    required
                  />
                </Col>
                <Col className="gutter-row" span={8}>
                  <Flex align="center" justify="flex-end">
                    <div className={styles.asset2}>
                      <div className={styles.icon_wrapper}>
                        {renderIcon(rightToken)}
                      </div>
                      <div>{renderSymbol(rightToken)}</div>
                    </div>
                  </Flex>
                </Col>
              </Row>
              <Flex align="center" justify="flex-end">
                <div className={styles.balance}>
                  <span>{renderBalanceText(rightTokenBalanceInfo)}</span>
                  {canSetMaxValueRightToken && (
                    <button
                      className={styles.maxButton}
                      type="button"
                      onClick={maxRightTokenHandler}
                    >
                      Max
                    </button>
                  )}
                </div>
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        <div className={styles.footer}>
          {!isWalletConnected && (
            <div style={{ marginTop: 14 }}>
              <Button
                className={styles.swapButton}
                onClick={connectWalletHandler}
                block
              >
                Connect Wallet
              </Button>
            </div>
          )}

          {isWalletConnected && (
            <>
              {!isChainSupported && (
                <div style={{ marginTop: 14 }}>
                  <Button
                    className={styles.swapButton}
                    onClick={switchChainHandler}
                    block
                  >
                    Switch Network
                  </Button>
                </div>
              )}

              {isChainSupported && (
                <div style={{ marginTop: 14 }}>
                  <Button
                    className={styles.swapButton}
                    onClick={openLiquidityModal}
                    disabled={isAddLiquidityDisabled}
                    block
                  >
                    {isInputEmpty
                      ? 'Enter an amount'
                      : isBalanceSufficient
                        ? 'Add Liquidity'
                        : isTokenLeftBalanceSufficient
                          ? `Insufficient ${rightToken.symbol} balance`
                          : `Insufficient ${leftToken.symbol} balance`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {isLiquidityModalOpen && (
        <LiquidityModal
          title="Add Liquidity Flow"
          open={isLiquidityModalOpen}
          leftToken={leftToken}
          leftTokenAmount={leftTokenAmount}
          rightToken={rightToken}
          rightTokenAmount={rightTokenAmount}
          tickLower={tickLower}
          tickUpper={tickUpper}
          token0={token0}
          token1={token1}
          pool={pool}
          router={liquidityRouter}
          slot0={slot0!}
          slippage={slippage}
          onCancel={closeLiquidityModal}
        />
      )}
    </>
  );
};

export default SwapCard;
