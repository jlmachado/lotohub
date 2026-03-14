'use client';

import type { Aposta, JDBLoteria } from '@/context/AppContext';

export interface ResultadoBicho {
  premio: string;
  milhar: string;
  grupo: string;
  animal: string;
}

/**
 * Normaliza strings para comparação segura (remove acentos, espaços e padroniza caixa)
 */
export const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Verifica se um item de aposta pertence a um resultado específico.
 * Validando: Data, Estado, Banca e Horário.
 */
export const isJDBItemEligible = (item: any, result: any, apostaCreatedAt: string): boolean => {
  if (!item || !result) return false;

  // 1. Normalização de Nomes de Estado
  const itemEstado = normalizeString(item.estadoLabel || '');
  const resEstado = normalizeString(result.stateName || result.stateCode || '');
  
  // 2. Normalização de Nomes de Banca/Loteria
  const itemLoteria = normalizeString(item.loteriaLabel || item.loteria || '');
  const resLoteria = normalizeString(result.extractionName || '');

  // Comparação de Estado e Banca (Busca parcial para nomes como "PTSP São Paulo")
  const stateMatch = itemEstado === resEstado || resEstado.includes(itemEstado) || itemEstado.includes(resEstado);
  const bankMatch = itemLoteria === resLoteria || resLoteria.includes(itemLoteria) || itemLoteria.includes(resLoteria);

  if (!stateMatch || !bankMatch) return false;

  // 3. Comparação de Horário (HH:mm)
  if (item.horario !== result.time) return false;

  // 4. Comparação de Data (YYYY-MM-DD)
  // Resolve a data pretendida do sorteio baseada na criação e no campo dataAposta
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

const getRelevantResults = (results: ResultadoBicho[], colocacaoId: string): ResultadoBicho[] => {
    const colocacaoLimit = getColocacaoDivisor(colocacaoId);
    return results.slice(0, colocacaoLimit);
}

const checkJogoDoBichoWin = (betItem: any, results: ResultadoBicho[]): boolean => {
    const { colocacao: colocacaoId, modalidade, numeros } = betItem;
    if (!colocacaoId || !modalidade || !numeros) return false;
    
    const relevantResults = getRelevantResults(results, colocacaoId);
    const winningGroups = new Set(relevantResults.map(r => r.grupo).filter(Boolean));
    const winningDezenas = new Set(relevantResults.map(r => r.milhar.slice(-2)));

    switch(modalidade) {
        case 'milhar':
        case 'centena':
        case 'dezena': {
            const length = { milhar: 4, centena: 3, dezena: 2 }[modalidade as 'milhar' | 'centena' | 'dezena'];
            const winningNumbers = relevantResults.map(r => r.milhar.slice(-length));
            return numeros.some((num: string) => winningNumbers.includes(num));
        }
        case 'milhar-e-centena': {
            const numeroApostado = numeros[0];
            if (numeroApostado.length !== 4) return false;
            const centenaApostada = numeroApostado.slice(-3);
            return relevantResults.some(r => r.milhar === numeroApostado || r.milhar.slice(-3) === centenaApostada);
        }
        case 'grupo': {
            return numeros.some((group: string) => winningGroups.has(group));
        }
        case 'dupla-de-grupo':
        case 'passe':
        case 'passe-vai-vem':
        case 'passe-seco':
        case 'terno-de-grupo': {
            const userGroups = new Set(numeros);
            const requiredSize = modalidade.includes('terno') ? 3 : 2;
            if (userGroups.size < requiredSize) return false;
            
            const allUserGroupsFound = [...userGroups].every(g => winningGroups.has(g));
            return allUserGroupsFound;
        }
        case 'duque-de-dezena':
        case 'terno-de-dezena': {
            const userDezenas = new Set(numeros);
            const requiredSize = modalidade.includes('terno') ? 3 : 2;
            if (userDezenas.size < requiredSize) return false;

            const allUserDezenasFound = [...userDezenas].every(d => winningDezenas.has(d));
            return allUserDezenasFound;
        }
        default: return false;
    }
};

const calculateJogoDoBichoPrize = (betItem: any, results: ResultadoBicho[], loterias: JDBLoteria[]): number => {
    const { loteria: loteriaId, modalidade, modalidadeLabel, numeros, colocacao: colocacaoId, valor } = betItem;
    if (!colocacaoId || !modalidade || !numeros || !loteriaId) return 0;

    const valorAposta = parseFloat(String(valor || '0').replace(',', '.')) || 0;
    if (valorAposta <= 0) return 0;
    
    const loteriaConfig = loterias.find(l => 
      normalizeString(l.id) === normalizeString(loteriaId) || 
      normalizeString(l.nome) === normalizeString(betItem.loteriaLabel)
    );

    let baseMultiplier = 0;
    if (loteriaConfig) {
      const modalidadeConfig = loteriaConfig.modalidades.find((m: any) => 
        normalizeString(m.nome) === normalizeString(modalidadeLabel) ||
        normalizeString(m.nome) === normalizeString(modalidade)
      );
      if (modalidadeConfig) baseMultiplier = parseFloat(modalidadeConfig.multiplicador);
    }

    if (!baseMultiplier) {
      const defaultMults: Record<string, number> = {
        'milhar': 5000, 'centena': 700, 'dezena': 60, 'grupo': 18,
        'milhar-e-centena': 5700, 'dupla-de-grupo': 160, 'terno-de-grupo': 1300,
        'duque-de-dezena': 300, 'terno-de-dezena': 5000, 'passe': 90
      };
      baseMultiplier = defaultMults[modalidade] || 0;
    }

    const divisorColocacao = getColocacaoDivisor(colocacaoId);
    const relevantResults = getRelevantResults(results, colocacaoId);

    if (modalidade === 'milhar-e-centena') {
        const numeroApostado = numeros[0];
        if (numeroApostado.length !== 4) return 0;
        const milharWins = relevantResults.some(r => r.milhar === numeroApostado);
        if (milharWins) return (baseMultiplier / divisorColocacao) * valorAposta;
        const centenaApostada = numeroApostado.slice(-3);
        const centenaWins = relevantResults.some(r => r.milhar.slice(-3) === centenaApostada);
        if (centenaWins) return (700 / divisorColocacao) * valorAposta;
        return 0;
    }
    
    const isWinner = checkJogoDoBichoWin(betItem, results);
    if (isWinner) {
        return valorAposta * (baseMultiplier / divisorColocacao);
    }
    
    return 0;
};

/**
 * Motor de verificação para um único item de bilhete.
 */
export const checkSingleItemWinner = (
  item: any, 
  result: any, 
  jdbLoterias: JDBLoteria[]
): { isWinner: boolean, prize: number } => {
    const simpleResults = (result.prizes || []).map((p: any) => ({
      premio: `${p.position}º`,
      milhar: p.milhar,
      grupo: p.grupo,
      animal: p.animal
    }));

    if (item.modalidade) {
      // Jogo do Bicho
      const isWinner = checkJogoDoBichoWin(item, simpleResults);
      return { 
        isWinner, 
        prize: isWinner ? calculateJogoDoBichoPrize(item, simpleResults, jdbLoterias) : 0 
      };
    } else if (item.premio && item.numero) {
      // Uruguai ou Genérica
      const numDigits = item.modalidadeLabel?.includes('3') ? 3 : item.modalidadeLabel?.includes('2') ? 2 : 1;
      const premioLimit = parseInt(item.premio, 10);
      const relevantResults = (result.prizes || []).slice(0, premioLimit).map((p: any) => p.milhar);
      if (relevantResults.some((r: string) => r.slice(-numDigits) === item.numero)) {
        return { isWinner: true, prize: item.retornoPossivel || 0 };
      }
    }

    return { isWinner: false, prize: 0 };
};

/**
 * @deprecated Use checkSingleItemWinner no novo fluxo granular.
 */
export const checkApostaWinner = (
  aposta: Aposta, 
  result: any, 
  jdbLoterias: JDBLoteria[]
): { isWinner: boolean, prize: number, eligibleItemsCount: number } => {
    if (!aposta.detalhes || !Array.isArray(aposta.detalhes)) return { isWinner: false, prize: 0, eligibleItemsCount: 0 };

    let totalPrize = 0;
    let eligibleItemsCount = 0;

    aposta.detalhes.forEach((item: any) => {
        if (!isJDBItemEligible(item, result, aposta.createdAt)) return;
        eligibleItemsCount++;
        const { isWinner, prize } = checkSingleItemWinner(item, result, jdbLoterias);
        totalPrize += prize;
    });

    return { isWinner: totalPrize > 0, prize: totalPrize, eligibleItemsCount };
}