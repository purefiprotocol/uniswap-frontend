import { useAppKit } from '@reown/appkit/react';

const useConnectModal = () => {
  const { open, close } = useAppKit();

  return {
    openConnectModal: () => open({ view: 'Connect' }),
  };
};

export { useConnectModal };
