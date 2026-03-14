/**
 * @fileOverview Serviço de parsing e extração de metadados de títulos de sinuca.
 * Especializado nos padrões do canal TV Snooker Brasil.
 */

export interface ParsedSnookerMatch {
  playerA: string;
  playerB: string;
  eventTitle: string;
  bestOf: number;
  location?: string;
  category?: string;
  tournamentName?: string;
  confidence: number;
}

export class SnookerParserService {
  /**
   * Extrai informações detalhadas a partir do título de uma live.
   */
  static parseTitle(rawTitle: string): ParsedSnookerMatch {
    const cleanTitle = rawTitle.replace(/AO VIVO|LIVE|SNOOKER|SINUCA|ASSISTA|AGORA|COMPLETO/gi, '').trim();
    let confidence = 0.5;
    
    // 1. Extração de Best Of (Ex: MD9, Melhor de 7, etc)
    let bestOf = 9;
    const mdMatch = cleanTitle.match(/MD(\d+)|MELHOR DE (\d+)/i);
    if (mdMatch) {
      bestOf = parseInt(mdMatch[1] || mdMatch[2]);
      confidence += 0.1;
    }

    // 2. Tentativa de extrair Localização (Padrão: Em [Cidade], [Cidade]-[UF])
    const locMatch = cleanTitle.match(/EM\s+([A-ZÇÃÕÉÊÍÓÚ\s]+)|[-\s]([A-Z]{2})$/i);
    const location = locMatch ? (locMatch[1] || locMatch[2]).trim() : undefined;

    // 3. Extração de Jogadores (Padrão: A x B ou A vs B)
    // Regex flexível para capturar nomes mesmo com traços ou separadores
    const vsRegex = /(.+?)\s+(?:X|VS|VERSUS)\s+(.+?)(?:\s+[-|]\s+(.*))?$/i;
    const match = cleanTitle.match(vsRegex);

    if (match) {
      const pA = this.cleanName(match[1]);
      const pB = this.cleanName(match[2]);
      const tournament = (match[3] || 'Desafio de Sinuca').trim();
      
      confidence += 0.3;

      return {
        playerA: pA || 'Jogador A',
        playerB: pB || 'Jogador B',
        eventTitle: cleanTitle,
        tournamentName: tournament,
        bestOf,
        location,
        category: 'Profissional',
        confidence: Math.min(confidence, 1.0)
      };
    }

    // Fallback para títulos fora do padrão
    return {
      playerA: 'Jogador A',
      playerB: 'Jogador B',
      eventTitle: cleanTitle || 'Torneio Snooker Brasil',
      tournamentName: 'Snooker Brasil',
      bestOf,
      location,
      confidence: 0.2
    };
  }

  /**
   * Limpa sufixos e prefixos comuns de nomes de jogadores.
   */
  private static cleanName(name: string): string {
    if (!name) return "";
    return name
      .replace(/^[-\s|]+|[-|\s]+$/g, '')
      .split('(')[0] // Remove (SP), (MG) etc
      .split('-')[0] // Remove hífens de final de nome
      .trim();
  }
}
