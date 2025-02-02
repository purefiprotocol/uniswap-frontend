import { FC, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Button, Drawer, Flex, Layout } from 'antd';
import { useMediaQuery } from 'react-responsive';
import { MenuOutlined } from '@ant-design/icons';

import { getConfig } from '@/config';
import { ConnectButton } from '../ConnectButton';
import { FaucetModal } from '../FaucetModal';

import logoSrc1 from '@/assets/icons/purefi-logo.svg';
import logoSrc2 from '@/assets/icons/purefi.svg';

import styles from './Layout.module.scss';

const Navbar: FC = () => {
  const account = useAccount();

  const theConfig = useMemo(
    () => getConfig(account.chainId),
    [account.chainId],
  );

  const { faucet: nativeFaucet } = theConfig;

  const [isFaucetModalOpen, setIsFaucetModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isMobile = useMediaQuery({
    query: '(max-width: 992px)',
  });

  const openDrawer = () => {
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const openFaucetModal = () => {
    setIsFaucetModalOpen(true);
  };

  const closeFaucetModal = () => {
    setIsFaucetModalOpen(false);
  };

  const logoSrc = isMobile ? logoSrc2 : logoSrc1;

  return (
    <>
      <Layout.Header className={styles.header}>
        <Flex align="center" justify="space-between">
          <Flex align="baseline" gap="small">
            <div className={styles.nav__logo}>
              <img className={styles.logo} src={logoSrc} alt="logo" />
            </div>

            {isMobile && (
              <div className={styles.drawer__button_wrapper}>
                <Button className={styles.drawer__button} onClick={openDrawer}>
                  <MenuOutlined />
                </Button>
              </div>
            )}

            {!isMobile && (
              <>
                <div className={styles.nav__item}>
                  <NavLink className={styles.nav__link} to="/">
                    Trade
                  </NavLink>
                </div>
                <div className={styles.nav__item}>
                  <NavLink className={styles.nav__link} to="/liquidity">
                    Liquidity
                  </NavLink>
                </div>
                <div className={styles.nav__item}>
                  <NavLink className={styles.nav__link_soon} to="/positions">
                    Positions
                  </NavLink>
                </div>
                <div className={styles.nav__item}>
                  <NavLink className={styles.nav__link} to="/kyc">
                    KYC
                  </NavLink>
                </div>
                {!!nativeFaucet && (
                  <div className={styles.nav__item}>
                    <button
                      className={styles.nav__btn}
                      type="button"
                      onClick={openFaucetModal}
                    >
                      Faucets
                    </button>
                  </div>
                )}
              </>
            )}
          </Flex>
          <ConnectButton />
        </Flex>
      </Layout.Header>

      <Drawer
        title="Menu"
        placement="bottom"
        key="bottom"
        className={styles.drawer}
        onClose={closeDrawer}
        open={isDrawerOpen}
        closable
      >
        <Flex vertical>
          <div className={styles.nav__item}>
            <NavLink className={styles.nav__link} to="/" onClick={closeDrawer}>
              Trade
            </NavLink>
          </div>
          <div className={styles.nav__item}>
            <NavLink
              className={styles.nav__link}
              to="/liquidity"
              onClick={closeDrawer}
            >
              Liquidity
            </NavLink>
          </div>
          <div className={styles.nav__item}>
            <NavLink
              className={styles.nav__link}
              to="/positions"
              onClick={closeDrawer}
            >
              Positions
            </NavLink>
          </div>
          <div className={styles.nav__item}>
            <NavLink
              className={styles.nav__link}
              to="/kyc"
              onClick={closeDrawer}
            >
              KYC
            </NavLink>
          </div>

          {!!nativeFaucet && (
            <div className={styles.nav__item}>
              <button
                className={styles.nav__btn}
                type="button"
                onClick={() => {
                  closeDrawer();
                  openFaucetModal();
                }}
              >
                Faucets
              </button>
            </div>
          )}
        </Flex>
      </Drawer>

      <FaucetModal
        title="Faucets"
        open={isFaucetModalOpen}
        onCancel={closeFaucetModal}
      />
    </>
  );
};

export default Navbar;
