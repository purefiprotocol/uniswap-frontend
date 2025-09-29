import { useAppKit } from '@reown/appkit/react';

const useConnectModal = () => {
  const { open, close } = useAppKit();

  return {
    openConnectModal: () => {
      console.log('connect view');
      open({ view: 'Connect' });
    },
  };
};

export { useConnectModal };
