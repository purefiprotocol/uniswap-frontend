import { FC } from 'react';
import { LiquidityCard } from '@/components';

import styles from './Liquidity.module.scss';

const Liquidity: FC = () => {
  return (
    <div className={styles.liquidity}>
      <LiquidityCard />
    </div>
  );
};

export default Liquidity;
