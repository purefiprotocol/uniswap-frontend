import { FC } from 'react';
import { SwapCard } from '@/components';

import styles from './Home.module.scss';

const Home: FC = () => {
  return (
    <div className={styles.home}>
      <SwapCard />
    </div>
  );
};

export default Home;
