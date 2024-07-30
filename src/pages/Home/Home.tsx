import { FC } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@/components';

const Home: FC = () => {
  const account = useAccount();

  console.log(account);

  const renderBody = () => {
    if (account.isConnecting) {
      return <div>Loading...</div>;
    }

    if (account.isConnected) {
      return <div>Swap Card</div>;
    }

    return <ConnectButton />;
  };

  return (
    <div>
      <h2>Home</h2>
      <div>{renderBody()}</div>
    </div>
  );
};

export default Home;
