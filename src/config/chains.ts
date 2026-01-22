import { AppKitNetwork, polygonAmoy } from '@reown/appkit/networks';

export const DEFAULT_CHAIN = polygonAmoy;

export const CHAINS: [AppKitNetwork, ...AppKitNetwork[]] = [polygonAmoy];

export const CHAIN_IDS: (number | string)[] = CHAINS.map((chain) => chain.id);
