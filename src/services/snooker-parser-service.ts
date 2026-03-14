/**
 * @fileOverview Serviço de parsing robusto e tolerante para títulos do YouTube.
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
  modality?: string;
  phase?: string;
  prize?: number | null;
  prizeLabel?: string;
  confidence: number;
  notes: string[];
}

export class SnookerParserService {
  /**
   * Ponto de entrada principal para extração de dados.
   */
  static parse(title: string, description: string = ''): ParsedSnookerMatch {
    const notes: string[] = [];
    let confidence = 0.1;

    // 1. Limpeza inicial
    const cleanTitle = title.replace(/AO VIVO|LIVE|ASSISTA|AGORA|COMPLETO|SN0OKER|SINUCA/gi, '').trim();
    const fullText = `${cleanTitle} ${description}`;

    // 2. Detecção de Best Of (MD, BO, Melhor de)
    const bestOf = this.extractBestOf(cleanTitle, notes);
    if (bestOf !== 9) confidence += 0.1;

    // 3. Detecção de Modalidade
    const modality = this.extractModality(fullText, notes);
    if (modality) confidence += 0.1;

    // 4. Detecção de Fase
    const phase = this.extractPhase(cleanTitle, notes);
    if (phase) confidence += 0.1;

    // 5. Detecção de Premiação
    const { prize, prizeLabel } = this.extractPrize(fullText, notes);
    if (prize) confidence += 0.1;

    // 6. Detecção de Localização
    const location = this.extractLocation(cleanTitle, notes);
    if (location) confidence += 0.1;

    // 7. Extração de Jogadores (Prioridade Máxima)
    const players = this.extractPlayers(cleanTitle, notes);
    
    if (players) {
      confidence += 0.4;
      return {
        playerA: players.a,
        playerB: players.b,
        eventTitle: players.event || cleanTitle,
        tournamentName: players.event || 'Snooker Brasil',
        bestOf,
        modality,
        phase,
        prize,
        prizeLabel,
        location,
        confidence: Math.min(confidence, 1.0),
        notes
      };
    }

    // Fallback caso não encontre o padrão X
    notes.push('Não foi possível identificar o padrão de nomes (Jogador A x Jogador B).');
    return {
      playerA: 'Jogador A',
      playerB: 'Jogador B',
      eventTitle: cleanTitle || 'Desafio Snooker Brasil',
      tournamentName: 'Snooker Brasil',
      bestOf,
      modality,
      phase,
      prize,
      prizeLabel,
      location,
      confidence: Math.min(confidence, 0.3),
      notes
    };
  }

  private static extractPlayers(title: string, notes: string[]) {
    // Padrões de separação comuns em ordem de prioridade
    const patterns = [
      /(.+?)\s+(?:X|VS|VERSUS)\s+(.+?)(?:\s+[-|]\s+(.*))?$/i,
      /(.+?)\s+v\s+(.+?)(?:\s+[-|]\s+(.*))?$/i,
      /(.+?)\s*\/\s*(.+?)(?:\s+[-|]\s+(.*))?$/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const a = this.cleanPlayerName(match[1]);
        const b = this.cleanPlayerName(match[2]);
        if (a && b) {
          notes.push(`Jogadores detectados via padrão: ${a} e ${b}`);
          return { a, b, event: match[3]?.trim() };
        }
      }
    }
    return null;
  }

  private static cleanPlayerName(name: string): string {
    if (!name) return '';
    return name
      .replace(/^[-\s|]+|[-|\s]+$/g, '')
      .split('(')[0] // Remove (SP), (MG)
      .replace(/\b(SP|RJ|MG|RS|PR|BA|CE|GO|DF|PE|SC|AM|PA|ES)\b/gi, '') // Remove siglas de estados soltas
      .trim();
  }

  private static extractBestOf(text: string, notes: string[]): number {
    const match = text.match(/MD\s*(\d+)|BO\s*(\d+)|MELHOR\s*DE\s*(\d+)|BEST\s*OF\s*(\d+)/i);
    if (match) {
      const val = parseInt(match[1] || match[2] || match[3] || match[4]);
      notes.push(`Formato detectado: Melhor de ${val}`);
      return val;
    }
    return 9; // Padrão
  }

  private static extractModality(text: string, notes: string[]) {
    const modalities = [
      { key: 'Six Red', regex: /SIX\s*RED/i },
      { key: 'Snooker', regex: /SNOOKER/i },
      { key: 'Bola 8', regex: /BOLA\s*8/i },
      { key: 'Bola 9', regex: /BOLA\s*9/i },
      { key: 'Mesão', regex: /MESÃO/i },
      { key: 'Sinuquinha', regex: /SINUQUINHA|SINUCA/i }
    ];

    for (const m of modalities) {
      if (m.regex.test(text)) {
        notes.push(`Modalidade detectada: ${m.key}`);
        return m.key;
      }
    }
    return undefined;
  }

  private static extractPhase(text: string, notes: string[]) {
    const phases = [
      { key: 'Final', regex: /FINAL/i },
      { key: 'Semifinal', regex: /SEMIFINAL|SEMI-FINAL/i },
      { key: 'Quartas', regex: /QUARTAS/i },
      { key: 'Oitavas', regex: /OITAVAS/i },
      { key: 'Rodada', regex: /RODADA\s*(\d+)/i },
      { key: 'Eliminatórias', regex: /ELIMINATÓRIAS/i }
    ];

    for (const p of phases) {
      const match = text.match(p.regex);
      if (match) {
        notes.push(`Fase detectada: ${p.key}`);
        return p.key;
      }
    }
    return undefined;
  }

  private static extractPrize(text: string, notes: string[]): { prize: number | null, prizeLabel?: string } {
    const regex = /(?:R\$|PRIZE|BOLSA)\s*([\d.]+)\s*(MIL)?/i;
    const match = text.match(regex);
    if (match) {
      let val = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
      if (match[2] && match[2].toLowerCase() === 'mil') val *= 1000;
      notes.push(`Premiação detectada: R$ ${val}`);
      return { prize: val, prizeLabel: match[0] };
    }
    return { prize: null };
  }

  private static extractLocation(text: string, notes: string[]) {
    const match = text.match(/(?:EM|NO|NA)\s+([A-ZÇÃÕÉÊÍÓÚ\s]+)|[-\s]([A-Z]{2})$/i);
    if (match) {
      const loc = (match[1] || match[2]).trim();
      if (loc.length > 2) {
        notes.push(`Local detectado: ${loc}`);
        return loc;
      }
    }
    return undefined;
  }
}
