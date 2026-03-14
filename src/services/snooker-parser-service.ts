
/**
 * @fileOverview Motor de parsing Multiprofil para metadados de Sinuca.
 * Expandido com detecção de Content Type e regras heurísticas profissionais.
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
  contentType: 'match' | 'promo' | 'highlight' | 'short' | 'interview' | 'teaser' | 'unknown';
}

export type ParseProfile = 'tv_snooker_brasil' | 'junior_snooker' | 'generic';

export class SnookerParserService {
  static normalizeForHash(text: string): string {
    if (!text) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
  }

  /**
   * Detecta o tipo de conteúdo baseado no título.
   */
  static detectContentType(title: string): ParsedSnookerMatch['contentType'] {
    const t = title.toLowerCase();
    
    if (t.includes('#shorts') || t.includes('shorts')) return 'short';
    if (t.includes('melhores momentos') || t.includes('highlights') || t.includes('gols') || t.includes('resumo')) return 'highlight';
    if (t.includes('entrevista') || t.includes('falando com') || t.includes('podcast')) return 'interview';
    if (t.includes('chamada') || t.includes('teaser') || t.includes('vem aí') || t.includes('promo')) return 'promo';
    if (t.includes('bastidores') || t.includes('vlog')) return 'teaser';
    
    // Indicações de partida real
    if (t.includes(' vs ') || t.includes(' x ') || t.includes(' ao vivo ') || t.includes(' live ') || t.includes(' final ') || t.includes(' desafio ')) {
      return 'match';
    }

    return 'unknown';
  }

  static parse(title: string, description: string = '', profile: ParseProfile = 'generic'): ParsedSnookerMatch {
    const notes: string[] = [];
    let confidence = 0.1;
    const contentType = this.detectContentType(title);

    // Limpeza global
    const cleanTitle = title.replace(/AO VIVO|LIVE|ASSISTA|AGORA|SN0OKER|SINUCA|TV SNOOKER BRASIL/gi, '').trim();
    const fullText = `${cleanTitle} ${description}`;

    const bestOf = this.extractBestOf(cleanTitle, notes);
    if (bestOf !== 9) confidence += 0.1;

    const modality = this.extractModality(fullText, notes);
    const phase = this.extractPhase(cleanTitle, notes);
    
    const { prize, prizeLabel } = this.extractPrize(fullText, notes);
    if (prize) confidence += 0.15;

    let players = null;
    if (profile === 'junior_snooker') {
      players = this.extractPlayersJunior(cleanTitle, notes);
    } else {
      players = this.extractPlayersGeneric(cleanTitle, notes);
    }
    
    if (players) {
      confidence += 0.5;
      if (contentType === 'match') confidence += 0.2;

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
        notes,
        contentType
      };
    }

    // Fallback
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
      notes: [...notes, 'Padrão de confronto não identificado.'],
      contentType
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
        if (a && b) return { a, b, event: match[3]?.trim() };
      }
    }
    return null;
  }

  private static extractPlayersJunior(title: string, notes: string[]) {
    const patterns = [
      /(?:DESAFIO|TIRA-TEIMA|FINAL|SEMIFINAL)?\s*[-|]?\s*(.+?)\s*(?:X|VS)\s*(.+?)(?:\s+[-|]\s+(.*))?$/i,
      /AO\s+VIVO\s+(.+?)\s*(?:X|VS)\s*(.+?)(?:\s+.*)?$/i
    ];
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const a = this.cleanName(match[1]);
        const b = this.cleanName(match[2]);
        if (a && b && a.length < 25 && b.length < 25) return { a, b, event: match[3]?.trim() };
      }
    }
    return null;
  }

  private static cleanName(name: string): string {
    return name.replace(/\([^)]*\)/g, '').replace(/\b(SP|RJ|MG|RS|PR|BA|CE|GO|DF|SC|PE|RN|AL|MA|PI|AM|PA|ES|MT|MS)\b/gi, '').replace(/DESAFIO|AO VIVO|FINAL|SEMIFINAL|TRETA|VALENDO|PIX/gi, '').trim();
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
    if (/FINAL/i.test(text) && !/SEMIFINAL/i.test(text)) return 'Grande Final';
    if (/SEMIFINAL/i.test(text)) return 'Semifinal';
    return undefined;
  }

  private static extractPrize(text: string, notes: string[]) {
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
