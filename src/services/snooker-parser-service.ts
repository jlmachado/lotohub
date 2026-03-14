
/**
 * @fileOverview Motor de parsing para metadados de Sinuca.
 * Extrai jogadores, torneios e fases a partir de títulos do YouTube.
 */

export interface ParsedSnookerMatch {
  playerA: string;
  playerB: string;
  eventTitle: string;
  bestOf: number;
  location?: string;
  tournamentName?: string;
  modality?: string;
  phase?: string;
  prize?: number | null;
  prizeLabel?: string;
  confidence: number;
  notes: string[];
}

export class SnookerParserService {
  /**
   * Normaliza uma string para geração de hash de sincronização.
   */
  static normalizeForHash(text: string): string {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  /**
   * Processa título e descrição para extrair dados do jogo.
   */
  static parse(title: string, description: string = ''): ParsedSnookerMatch {
    const notes: string[] = [];
    let confidence = 0.1;

    // Limpeza de ruídos comuns
    const cleanTitle = title.replace(/AO VIVO|LIVE|ASSISTA|AGORA|SN0OKER|SINUCA|TV SNOOKER BRASIL/gi, '').trim();
    const fullText = `${cleanTitle} ${description}`;

    // 1. Extração de Best Of
    const bestOf = this.extractBestOf(cleanTitle, notes);
    if (bestOf !== 9) confidence += 0.1;

    // 2. Extração de Modalidade e Fase
    const modality = this.extractModality(fullText, notes);
    const phase = this.extractPhase(cleanTitle, notes);
    if (modality) confidence += 0.1;
    if (phase) confidence += 0.1;

    // 3. Extração de Premiação
    const { prize, prizeLabel } = this.extractPrize(fullText, notes);
    if (prize) confidence += 0.1;

    // 4. Extração de Jogadores (Core)
    const players = this.extractPlayers(cleanTitle, notes);
    
    if (players) {
      confidence += 0.5;
      return {
        playerA: players.a,
        playerB: players.b,
        eventTitle: players.event || cleanTitle,
        tournamentName: players.event || 'Torneio Snooker Brasil',
        bestOf,
        modality,
        phase,
        prize,
        prizeLabel,
        confidence: Math.min(confidence, 1.0),
        notes
      };
    }

    // Fallback
    notes.push('Padrão de confronto não identificado.');
    return {
      playerA: 'Jogador A',
      playerB: 'Jogador B',
      eventTitle: cleanTitle || 'Desafio de Sinuca',
      tournamentName: 'Snooker Brasil',
      bestOf,
      modality,
      phase,
      prize,
      prizeLabel,
      confidence: Math.min(confidence, 0.3),
      notes
    };
  }

  private static extractPlayers(title: string, notes: string[]) {
    const patterns = [
      /(.+?)\s+(?:X|VS|VERSUS)\s+(.+?)(?:\s+[-|]\s+(.*))?$/i,
      /(.+?)\s+v\s+(.+?)(?:\s+[-|]\s+(.*))?$/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const a = this.cleanName(match[1]);
        const b = this.cleanName(match[2]);
        if (a && b) {
          notes.push(`Jogadores: ${a} vs ${b}`);
          return { a, b, event: match[3]?.trim() };
        }
      }
    }
    return null;
  }

  private static cleanName(name: string): string {
    return name.replace(/\([^)]*\)/g, '').replace(/\b(SP|RJ|MG|RS|PR|BA|CE|GO|DF)\b/gi, '').trim();
  }

  private static extractBestOf(text: string, notes: string[]): number {
    const match = text.match(/MD\s*(\d+)|BO\s*(\d+)|MELHOR\s*DE\s*(\d+)/i);
    if (match) {
      const val = parseInt(match[1] || match[2] || match[3]);
      notes.push(`MD${val} detectado`);
      return val;
    }
    return 9;
  }

  private static extractModality(text: string, notes: string[]) {
    if (/SIX\s*RED/i.test(text)) return 'Six Red';
    if (/SINUQUINHA/i.test(text)) return 'Sinuquinha';
    if (/MESÃO/i.test(text)) return 'Mesão';
    return undefined;
  }

  private static extractPhase(text: string, notes: string[]) {
    if (/FINAL/i.test(text)) return 'Grande Final';
    if (/SEMIFINAL/i.test(text)) return 'Semifinal';
    if (/QUARTAS/i.test(text)) return 'Quartas de Final';
    return undefined;
  }

  private static extractPrize(text: string, notes: string[]) {
    const match = text.match(/(?:R\$|PRIZE)\s*([\d.]+)\s*(MIL)?/i);
    if (match) {
      let val = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
      if (match[2]) val *= 1000;
      return { prize: val, prizeLabel: match[0] };
    }
    return { prize: null };
  }
}
