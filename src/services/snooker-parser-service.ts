/**
 * @fileOverview Motor de parsing Multiprofil para metadados de Sinuca.
 * Extrai jogadores, torneios e fases a partir de títulos do YouTube conforme o canal.
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

export type ParseProfile = 'tv_snooker_brasil' | 'junior_snooker' | 'generic';

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
   * Processa título e descrição para extrair dados do jogo baseado no perfil do canal.
   */
  static parse(title: string, description: string = '', profile: ParseProfile = 'generic'): ParsedSnookerMatch {
    const notes: string[] = [];
    let confidence = 0.1;

    // Limpeza global de ruídos
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
    if (prize) confidence += 0.15;

    // 4. Extração de Jogadores baseada no perfil
    let players = null;
    if (profile === 'junior_snooker') {
      players = this.extractPlayersJunior(cleanTitle, notes);
    } else {
      players = this.extractPlayersGeneric(cleanTitle, notes);
    }
    
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

  private static extractPlayersGeneric(title: string, notes: string[]) {
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

  private static extractPlayersJunior(title: string, notes: string[]) {
    // Junior Snooker costuma usar "DESAFIO - NOME X NOME" ou títulos mais "treta"
    const patterns = [
      /(?:DESAFIO|TIRA-TEIMA|FINAL|SEMIFINAL)?\s*[-|]?\s*(.+?)\s*(?:X|VS)\s*(.+?)(?:\s+[-|]\s+(.*))?$/i,
      /AO\s+VIVO\s+(.+?)\s*(?:X|VS)\s*(.+?)(?:\s+.*)?$/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const a = this.cleanName(match[1]);
        const b = this.cleanName(match[2]);
        if (a && b && a.length < 25 && b.length < 25) {
          notes.push(`Jogadores (Junior Profile): ${a} vs ${b}`);
          return { a, b, event: match[3]?.trim() };
        }
      }
    }
    return null;
  }

  private static cleanName(name: string): string {
    return name
      .replace(/\([^)]*\)/g, '')
      .replace(/\b(SP|RJ|MG|RS|PR|BA|CE|GO|DF|SC|PE|RN|AL|MA|PI|AM|PA|ES|MT|MS)\b/gi, '')
      .replace(/DESAFIO|AO VIVO|FINAL|SEMIFINAL|TRETA|VALENDO|PIX/gi, '')
      .trim();
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
    if (/BOLA\s*8/i.test(text)) return 'Bola 8';
    if (/BOLA\s*9/i.test(text)) return 'Bola 9';
    return undefined;
  }

  private static extractPhase(text: string, notes: string[]) {
    if (/FINAL/i.test(text) && !/SEMIFINAL/i.test(text)) return 'Grande Final';
    if (/SEMIFINAL/i.test(text)) return 'Semifinal';
    if (/QUARTAS/i.test(text)) return 'Quartas de Final';
    if (/OITAVAS/i.test(text)) return 'Oitavas de Final';
    if (/RODADA\s*\d+/i.test(text)) return text.match(/RODADA\s*\d+/i)![0];
    return undefined;
  }

  private static extractPrize(text: string, notes: string[]) {
    // Regex aprimorada para capturar valores financeiros reais
    const match = text.match(/(?:R\$|PRIZE|VALENDO|VALE)\s*([\d.]+)\s*(MIL|REAIS)?/i);
    if (match) {
      let valStr = match[1].replace(/\./g, '').replace(',', '.');
      let val = parseFloat(valStr);
      if (match[2]?.toLowerCase() === 'mil') val *= 1000;
      notes.push(`Prêmio detectado: R$ ${val}`);
      return { prize: val, prizeLabel: `R$ ${val.toLocaleString('pt-BR')}` };
    }
    return { prize: null };
  }
}
