'use client';

import type { Aposta, JDBLoteria } from '@/context/AppContext';

/**
 * Tabela de Aliases para padronização de nomes de bancas vindo do Scraper.
 */
const BANK_ALIASES: Record<string, string> = {
  "RIO DE JANEIRO": "PT Rio",
  "PT RIO": "PT Rio",
  "PARATODOS": "Paratodos Bahia",
  "MALUCA": "Maluca Bahia",
  "LOOK": "Look Goiás",
  "PT SP": "PT São Paulo",
  "BANDEIRANTES": "Bandeirantes São Paulo",
  "PNT": "PNT São Paulo",
  "LBR": "LBR Brasília",
  "ALVORADA": "Alvorada Minas",
  "CAMINHO DA SORTE": "Caminho da Sorte Paraíba",
  "LOTECE": "Lotece Ceará",
  "POPULAR": "Popular Pernambuco",
  "PT-PR": "PT Paraná",
  "NATAL": "Natal Rio Grande do Norte",
  "RS GAUCHA": "RS Gaúcha",
  "SERGIPE": "Sergipe"
};

/**
 * Normaliza strings para comparação segura (remove acentos, espaços e padroniza caixa)
 */
export const normalizeString = (str: string): string => {
  if (!str) return '';
  let normalized = str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Aplica Aliases se existir
  return BANK_ALIASES[normalized] || normalized;
};

/**
 * Verifica se um item de aposta pertence a um resultado específico.
 */
export const isJDBItemEligible = (item: any, result: any, apostaCreatedAt: string): boolean => {
  if (!item || !result) return false;

  const itemEstado = normalizeString(item.estadoLabel || '');
  const resEstado = normalizeString(result.stateName || result.stateCode || '');
  const itemLoteria = normalizeString(item.loteriaLabel || item.loteria || '');
  const resLoteria = normalizeString(result.extractionName || '');

  const stateMatch = itemEstado === resEstado || resEstado.includes(itemEstado) || itemEstado.includes(resEstado);
  const bankMatch = itemLoteria === resLoteria || resLoteria.includes(itemLoteria) || itemLoteria.includes(resLoteria);

  if (!stateMatch || !bankMatch) return false;
  if (item.horario !== result.time) return false;

  const betDate = new Date(apostaCreatedAt);
  if (item.dataAposta === 'amanha') {
    betDate.setDate(betDate.getDate() + 1);
  }
  const intendedDateStr = betDate.toISOString().split('T')[0];
  
  return intendedDateStr === result.date;
};

const getColocacaoDivisor = (colocacaoId: string | undefined): number => {
    if (!colocacaoId) return 1;
    if (colocacaoId === '1-premio') return 1;
    const match = colocacaoId.match(/1-ao-(\d+)-premio/);
    return match ? parseInt(match[1], 10) : 1;
};

/**
 * Motor de verificação para um único item de bilhete.
 */
export const checkSingleItemWinner = (
  item: any, 
  result: any, 
  jdbLoterias: JDBLoteria[]
): { isWinner: boolean, prize: number } => {
    const prizes = Array.isArray(result.prizes) ? result.prizes : [];
    const limit = getColocacaoDivisor(item.colocacao);
    const relevantPrizes = prizes.slice(0, limit);

    const valorAposta = parseFloat(String(item.valor || '0').replace(',', '.')) || 0;
    
    // Busca multiplicador oficial da loteria
    const loteriaConfig = jdbLoterias.find(l => normalizeString(l.nome) === normalizeString(item.loteriaLabel));
    let mult = 0;
    if (loteriaConfig) {
      const mod = loteriaConfig.modalidades.find(m => normalizeString(m.nome) === normalizeString(item.modalidadeLabel));
      if (mod) mult = parseFloat(mod.multiplicador);
    }

    // Fallback para multiplicadores padrão se não achar no config
    if (!mult) {
      const defaults: Record<string, number> = { milhar: 5000, centena: 700, dezena: 60, grupo: 18 };
      mult = defaults[item.modalidade] || 0;
    }

    const winningMilhares = relevantPrizes.map(p => p.milhar || p.valor);
    const winningGroups = relevantPrizes.map(p => p.grupo);

    let isWinner = false;

    switch(item.modalidade) {
      case 'milhar':
        isWinner = winningMilhares.includes(item.numeros[0]);
        break;
      case 'centena':
        isWinner = winningMilhares.some(m => m.slice(-3) === item.numeros[0]);
        break;
      case 'dezena':
        isWinner = winningMilhares.some(m => m.slice(-2) === item.numeros[0]);
        break;
      case 'grupo':
        isWinner = winningGroups.includes(item.numeros[0]);
        break;
      default:
        // Uruguai / Genérica
        if (item.premio && item.numero) {
          const numDigits = item.modalidadeLabel?.includes('3') ? 3 : item.modalidadeLabel?.includes('2') ? 2 : 1;
          const relevant = prizes.slice(0, parseInt(item.premio)).map(p => p.milhar || p.valor);
          isWinner = relevant.some(r => r.slice(-numDigits) === item.numero);
          return { isWinner, prize: isWinner ? (item.retornoPossivel || 0) : 0 };
        }
    }

    const prize = isWinner ? (valorAposta * mult) / limit : 0;
    return { isWinner, prize };
};
