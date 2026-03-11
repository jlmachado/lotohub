/**
 * @fileOverview Serviço de Liquidação de Apostas de Futebol.
 */

import { FootballBet } from '@/context/AppContext';
import { LedgerService } from './ledger-service';
import { upsertUser, getUsers } from '@/utils/usersStorage';

export class FootballSettlementService {
  /**
   * Liquida um bilhete individual comparando com o placar final.
   */
  static settleBet(bet: FootballBet, finalMatches: any[]): FootballBet {
    if (bet.status !== 'OPEN') return bet;

    let allWon = true;
    let anyLost = false;

    for (const selection of bet.items) {
      const match = finalMatches.find(m => m.id === selection.matchId);
      if (!match || !match.isFinished) {
        allWon = false;
        continue;
      }

      const isWin = this.checkSelection(selection, match);
      if (!isWin) {
        anyLost = true;
        break;
      }
    }

    if (anyLost) return { ...bet, status: 'LOST' };
    if (allWon) {
      this.payWinner(bet);
      return { ...bet, status: 'WON' };
    }

    return bet;
  }

  private static checkSelection(selection: any, match: any): boolean {
    const { scoreHome, scoreAway } = match;
    
    switch (selection.market) {
      case 'Vencedor do Jogo':
      case 'Vencedor 1X2':
        if (selection.selection === 'Casa' && scoreHome > scoreAway) return true;
        if (selection.selection === 'Empate' && scoreHome === scoreAway) return true;
        if (selection.selection === 'Fora' && scoreAway > scoreHome) return true;
        return false;
      
      case 'Ambas Marcam':
        const bothMarked = scoreHome > 0 && scoreAway > 0;
        return selection.selection === 'Sim' ? bothMarked : !bothMarked;

      default:
        return false;
    }
  }

  private static payWinner(bet: FootballBet) {
    const users = getUsers();
    const user = users.find(u => u.id === bet.userId);
    if (!user) return;

    const newBalance = user.saldo + bet.potentialWin;
    upsertUser({ terminal: user.terminal, saldo: newBalance });

    LedgerService.addEntry({
      bancaId: bet.bancaId,
      userId: user.id,
      terminal: user.terminal,
      tipoUsuario: user.tipoUsuario,
      modulo: 'Futebol',
      type: 'BET_WIN',
      amount: bet.potentialWin,
      balanceBefore: user.saldo,
      balanceAfter: newBalance,
      referenceId: bet.id,
      description: `Prêmio Futebol: Bilhete ${bet.id.substring(0,8)}`
    });
  }
}
