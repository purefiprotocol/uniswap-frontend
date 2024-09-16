import { polygonAmoy } from 'wagmi/chains';

export const DEFAULT_CHAIN = polygonAmoy;

export const CHAINS = [polygonAmoy] as const;

export const CHAIN_IDS: number[] = CHAINS.map((chain) => chain.id);
