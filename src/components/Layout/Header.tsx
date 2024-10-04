import { FC, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Flex, Layout } from 'antd';

import { ConnectButton } from '../ConnectButton';
import { FaucetModal } from '../FaucetModal';

import logoSrc from '@/assets/icons/purefi-logo.svg';

import styles from './Layout.module.scss';

const Navbar: FC = () => {
  const [isFaucetModalOpen, setIsFaucetModalOpen] = useState(false);

  const openFaucetModal = () => {
    setIsFaucetModalOpen(true);
  };

  const closeFaucetModal = () => {
    setIsFaucetModalOpen(false);
  };

  return (
    <>
      <Layout.Header className={styles.header}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap="small">
            <div style={{ marginRight: 40 }}>
              <img className={styles.logo} src={logoSrc} alt="logo" />
            </div>
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
              <NavLink className={styles.nav__link} to="/kyc">
                KYC
              </NavLink>
            </div>
            <div className={styles.nav__item}>
              <button
                className={styles.nav__btn}
                type="button"
                onClick={openFaucetModal}
              >
                Faucets
              </button>
            </div>
          </Flex>
          <ConnectButton />
        </Flex>
      </Layout.Header>

      <FaucetModal
        title="Faucets"
        open={isFaucetModalOpen}
        onCancel={closeFaucetModal}
      />
    </>
  );
};

export default Navbar;
