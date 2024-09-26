import { useRef, useEffect } from 'react';
import { KycWidget } from '@purefi/kyc-sdk';

const Kyc = () => {
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    KycWidget.mount(widgetRef.current);

    return () => {
      KycWidget.unmount();
    };
  }, []);

  return <div ref={widgetRef} />;
};

export default Kyc;
