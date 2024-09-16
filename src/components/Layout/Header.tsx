import { FC } from 'react';
import { NavLink } from 'react-router-dom';
import { Flex, Layout } from 'antd';
import { ConnectButton } from '../ConnectButton';
import logoSrc from '@/assets/icons/purefi-logo.svg';

import styles from './Layout.module.scss';

const Navbar: FC = () => {
  return (
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
        </Flex>
        <ConnectButton />
      </Flex>
    </Layout.Header>
  );
};

export default Navbar;
