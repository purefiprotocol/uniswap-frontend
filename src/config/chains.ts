import { AppKitNetwork, polygonAmoy } from '@reown/appkit/networks';
import { polygonAmoy as polygonAmoyViem } from 'viem/chains';

export const DEFAULT_CHAIN = polygonAmoy;
export const DEFAULT_CHAIN_VIEM = polygonAmoyViem;

export const CHAINS: [AppKitNetwork, ...AppKitNetwork[]] = [polygonAmoy];

export const CHAIN_IDS: (number | string)[] = CHAINS.map((chain) => chain.id);
