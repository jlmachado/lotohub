'use client';

import type { Aposta, JDBLoteria } from '@/context/AppContext';

export interface ResultadoBicho {
  premio: string;
  milhar: string;
  grupo: string;
  animal: string;
}

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

    const valorAposta = parseFloat(valor.replace(',', '.')) || 0;
    if (valorAposta <= 0) return 0;
    
    const loteriaConfig = loterias.find(l => l.id === loteriaId);
    if (!loteriaConfig) return 0;

    const modalidadeConfig = loteriaConfig.modalidades.find((m: any) => m.nome === modalidadeLabel);
    if (!modalidadeConfig) return 0;

    const baseMultiplier = parseFloat(modalidadeConfig.multiplicador);
    const divisorColocacao = getColocacaoDivisor(colocacaoId);
    const relevantResults = getRelevantResults(results, colocacaoId);

    if (modalidade === 'milhar-e-centena') {
        const numeroApostado = numeros[0];
        if (numeroApostado.length !== 4) return 0;

        const milharWins = relevantResults.some(r => r.milhar === numeroApostado);
        if (milharWins) {
            const mcModalidadeConfig = loteriaConfig.modalidades.find((m: any) => m.nome === 'MILHAR E CENTENA');
            const mcMultiplier = mcModalidadeConfig ? parseFloat(mcModalidadeConfig.multiplicador) : 5700;
            return (mcMultiplier / divisorColocacao) * valorAposta;
        }

        const centenaApostada = numeroApostado.slice(-3);
        const centenaWins = relevantResults.some(r => r.milhar.slice(-3) === centenaApostada);
        if (centenaWins) {
            const centenaModalidadeConfig = loteriaConfig.modalidades.find((m: any) => m.nome === 'CENTENA');
            const centenaMultiplier = centenaModalidadeConfig ? parseFloat(centenaModalidadeConfig.multiplicador) : 700;
            return (centenaMultiplier / divisorColocacao) * valorAposta;
        }
        return 0;
    }
    
    const isWinner = checkJogoDoBichoWin(betItem, results);
    if (isWinner) {
        const multiplicadorAjustado = baseMultiplier / divisorColocacao;
        return valorAposta * multiplicadorAjustado;
    }
    
    return 0;
};

const checkLoteriaUruguaiWin = (betItem: any, results: string[]): boolean => {
    const numDigits = parseInt(betItem.modalidade.charAt(0), 10);
    if (isNaN(numDigits) || numDigits <= 0) return false;
    const premioLimit = parseInt(betItem.premio, 10);
    const relevantResults = results.slice(0, premioLimit);
    return relevantResults.some(result => result.slice(-numDigits) === betItem.numero);
};

const checkSimpleLotteryWin = (betItem: any, drawResults: string[], requiredHits: number): boolean => {
    // The set of numbers from the official draw (e.g., 6 for Seninha).
    const winningNumbers = new Set(drawResults); 
    // The set of numbers the user selected for their bet (e.g., 14 for SENINHA 14D).
    const userNumbers = new Set(betItem.numeros as string[]); 

    // Sanity check: Ensure the number of drawn results matches the game's requirement.
    if (winningNumbers.size !== requiredHits) {
        return false;
    }

    // The winning condition is that the user's selection must contain ALL of the drawn numbers.
    // We loop through each of the official winning numbers.
    for (const num of winningNumbers) {
        // If any of the winning numbers is NOT in the user's selection, they have lost.
        if (!userNumbers.has(num)) {
            return false;
        }
    }

    // If the loop completes, it means all winning numbers were found in the user's selection. This is a win.
    return true; 
};

export const checkApostaWinner = (aposta: Aposta, drawResults: any, jdbLoterias: JDBLoteria[]): { isWinner: boolean, prize: number } => {
    if (!aposta.detalhes) return { isWinner: false, prize: 0 };

    let totalPrize = 0;

    aposta.detalhes.forEach((betItem: any) => {
        let prize = 0;
        switch (aposta.loteria) {
            case 'Jogo do Bicho':
                prize = calculateJogoDoBichoPrize(betItem, drawResults as ResultadoBicho[], jdbLoterias);
                break;
            case 'Loteria Uruguai':
                if (checkLoteriaUruguaiWin(betItem, drawResults as string[])) {
                     prize = betItem.retornoPossivel || 0;
                }
                break;
            case 'Seninha':
                if (checkSimpleLotteryWin(betItem, drawResults as string[], 6)) {
                     prize = betItem.retornoPossivel || 0;
                }
                break;
            case 'Quininha':
                 if (checkSimpleLotteryWin(betItem, drawResults as string[], 5)) {
                     prize = betItem.retornoPossivel || 0;
                }
                break;
            case 'Lotinha':
                 if (checkSimpleLotteryWin(betItem, drawResults as string[], 15)) {
                     prize = betItem.retornoPossivel || 0;
                }
                break;
        }
        totalPrize += prize;
    });

    return { isWinner: totalPrize > 0, prize: totalPrize };
}
