import { AppKitNetwork, bsc } from '@reown/appkit/networks';
import { bsc as bscViem } from 'viem/chains';

export const DEFAULT_CHAIN = bsc;
export const DEFAULT_CHAIN_VIEM = bscViem;

export const CHAINS: [AppKitNetwork, ...AppKitNetwork[]] = [bsc];

export const CHAIN_IDS: (number | string)[] = CHAINS.map((chain) => chain.id);
