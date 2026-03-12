/**
 * @fileOverview Serviço de Liquidação de Apostas de Futebol.
 * Cruza resultados reais da ESPN com bilhetes abertos no sistema.
 */

import { FootballBet } from '@/context/AppContext';
import { LedgerService } from './ledger-service';
import { upsertUser, getUsers, User } from '@/utils/usersStorage';

export interface SettlementResult {
  betId: string;
  status: 'WON' | 'LOST' | 'VOID';
  payout: number;
}

export class FootballSettlementService {
  /**
   * Processa a liquidação de uma lista de apostas baseada no estado atual dos jogos.
   */
  static settleBets(bets: FootballBet[], unifiedMatches: any[]): FootballBet[] {
    return bets.map(bet => {
      if (bet.status !== 'OPEN') return bet;

      let wonAll = true;
      let lostAny = false;
      let pendingAny = false;

      for (const selection of bet.items) {
        const match = unifiedMatches.find(m => m.id === selection.matchId);
        
        if (!match || !match.isFinished) {
          pendingAny = true;
          continue;
        }

        const isWin = this.evaluateSelection(selection, match);
        if (isWin) {
          // Keep wonAll true
        } else {
          lostAny = true;
          wonAll = false;
          break;
        }
      }

      if (lostAny) {
        return { ...bet, status: 'LOST', settledAt: new Date().toISOString() };
      }

      if (wonAll && !pendingAny) {
        this.processPayout(bet);
        return { ...bet, status: 'WON', settledAt: new Date().toISOString() };
      }

      return bet;
    });
  }

  /**
   * Avalia uma seleção individual contra o resultado do jogo.
   */
  private static evaluateSelection(selection: any, match: any): boolean {
    const homeScore = match.scoreHome;
    const awayScore = match.scoreAway;

    switch (selection.id.split('-')[1]) { // Ex: matchId-1X2-Casa
      case '1X2':
        if (selection.selection === 'Casa') return homeScore > awayScore;
        if (selection.selection === 'Empate') return homeScore === awayScore;
        if (selection.selection === 'Fora') return awayScore > homeScore;
        break;
      
      case 'DC':
        if (selection.selection === 'Casa ou Empate') return homeScore >= awayScore;
        if (selection.selection === 'Casa ou Fora') return homeScore !== awayScore;
        if (selection.selection === 'Empate ou Fora') return awayScore >= homeScore;
        break;

      case 'OU25':
        const total = homeScore + awayScore;
        if (selection.selection === 'Mais de 2.5') return total > 2.5;
        if (selection.selection === 'Menos de 2.5') return total < 2.5;
        break;

      case 'BTTS':
        const bothScored = homeScore > 0 && awayScore > 0;
        if (selection.selection === 'Sim') return bothScored;
        if (selection.selection === 'Não') return !bothScored;
        break;
    }

    return false;
  }

  /**
   * Realiza o pagamento real ao usuário e registra no Ledger.
   */
  private static processPayout(bet: FootballBet) {
    const allUsers = getUsers();
    const user = allUsers.find(u => u.id === bet.userId);
    if (!user) return;

    const newBalance = user.saldo + bet.potentialWin;
    
    // Atualiza saldo do usuário
    upsertUser({ terminal: user.terminal, saldo: newBalance });

    // Registra no Ledger
    LedgerService.addEntry({
      bancaId: bet.bancaId,
      userId: user.id,
      terminal: user.terminal,
      tipoUsuario: user.tipoUsuario,
      modulo: 'Futebol',
      type: 'BET_WIN',
      amount: bet.potentialWin,
      balanceBefore: user.saldo + user.bonus,
      balanceAfter: newBalance + user.bonus,
      referenceId: bet.id,
      description: `Prêmio Futebol: Bilhete #${bet.id.substring(0,8)}`
    });
  }
}
