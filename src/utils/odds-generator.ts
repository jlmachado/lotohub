/**
 * @fileOverview Gerador de Odds Automáticas para jogos sem dados de mercado.
 */

export interface AutoOdds {
  home: number;
  draw: number;
  away: number;
}

/**
 * Retorna um modelo de odds equilibrado.
 * Em um cenário real, esses valores poderiam ser baseados no ranking dos times.
 */
export function generateDefaultOdds(): AutoOdds {
  return {
    home: 2.20,
    draw: 3.20,
    away: 2.90
  };
}

/**
 * Verifica se as odds automáticas estão habilitadas nas configurações.
 */
export function isAutoOddsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const settings = localStorage.getItem('app:betting_limits:v1');
  if (!settings) return true;
  try {
    const parsed = JSON.parse(settings);
    return parsed.enableAutoOdds !== false;
  } catch {
    return true;
  }
}
