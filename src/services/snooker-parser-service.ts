/**
 * @fileOverview Serviço de parsing e extração de metadados de títulos de sinuca.
 */

export interface ParsedSnookerMatch {
  playerA: string;
  playerB: string;
  eventTitle: string;
  bestOf: number;
  location?: string;
  category?: string;
}

export class SnookerParserService {
  /**
   * Extrai informações detalhadas a partir do título de uma live.
   */
  static parseTitle(rawTitle: string): ParsedSnookerMatch {
    const title = rawTitle.replace(/AO VIVO|LIVE|SNOOKER|SINUCA|ASSISTA|AGORA/gi, '').trim();
    
    // 1. Extração de Best Of (Ex: MD9, Melhor de 7, etc)
    let bestOf = 9;
    const mdMatch = title.match(/MD(\d+)|MELHOR DE (\d+)/i);
    if (mdMatch) {
      bestOf = parseInt(mdMatch[1] || mdMatch[2]);
    }

    // 2. Extração de Jogadores (Padrão: A x B ou A vs B)
    const vsRegex = /(.+?)\s+(?:X|VS|VERSUS)\s+(.+?)(?:\s+[-|]\s+(.*))?$/i;
    const match = title.match(vsRegex);

    if (match) {
      const pA = match[1].trim();
      const pB = match[2].trim();
      const extra = match[3] || 'Desafio de Sinuca';

      return {
        playerA: this.cleanName(pA),
        playerB: this.cleanName(pB),
        eventTitle: extra.trim(),
        bestOf,
        category: 'Profissional'
      };
    }

    // Fallback para títulos fora do padrão
    return {
      playerA: 'Jogador A',
      playerB: 'Jogador B',
      eventTitle: title || 'Torneio Snooker Brasil',
      bestOf
    };
  }

  /**
   * Limpa sufixos e prefixos comuns de nomes de jogadores.
   */
  private static cleanName(name: string): string {
    return name
      .replace(/^[-\s]+|[-|\s]+$/g, '')
      .split('(')[0] // Remove (SP), (MG) etc
      .trim();
  }
}
