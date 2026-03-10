/**
 * @fileOverview Persistência de configurações globais de apostas e mercados.
 */

export interface BettingLimits {
  minStake: number;
  maxStake: number;
  maxOdds: number;
  maxPotentialWin: number;
  maxSelections: number;
  houseMargin: number; // % extra de margem sobre as odds da API
}

export interface MarketSettings {
  id: string;
  name: string;
  enabled: boolean;
  enabledForLive: boolean;
  priority: number;
}

const LIMITS_KEY = 'app:betting_limits:v1';
const MARKETS_KEY = 'app:betting_markets:v1';

export const DEFAULT_LIMITS: BettingLimits = {
  minStake: 1.00,
  maxStake: 5000.00,
  maxOdds: 500.00,
  maxPotentialWin: 50000.00,
  maxSelections: 15,
  houseMargin: 5
};

export const DEFAULT_MARKETS: MarketSettings[] = [
  { id: '1X2', name: 'Vencedor 1X2', enabled: true, enabledForLive: true, priority: 1 },
  { id: 'OVER_UNDER', name: 'Total de Gols (Over/Under)', enabled: true, enabledForLive: true, priority: 2 },
  { id: 'BTTS', name: 'Ambos Marcam', enabled: true, enabledForLive: true, priority: 3 },
  { id: 'DOUBLE_CHANCE', name: 'Dupla Chance', enabled: true, enabledForLive: true, priority: 4 },
];

export const loadBettingLimits = (): BettingLimits => {
  if (typeof window === 'undefined') return DEFAULT_LIMITS;
  const stored = localStorage.getItem(LIMITS_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_LIMITS;
};

export const saveBettingLimits = (limits: BettingLimits) => {
  localStorage.setItem(LIMITS_KEY, JSON.stringify(limits));
};

export const loadMarketSettings = (): MarketSettings[] => {
  if (typeof window === 'undefined') return DEFAULT_MARKETS;
  const stored = localStorage.getItem(MARKETS_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_MARKETS;
};

export const saveMarketSettings = (markets: MarketSettings[]) => {
  localStorage.setItem(MARKETS_KEY, JSON.stringify(markets));
};
