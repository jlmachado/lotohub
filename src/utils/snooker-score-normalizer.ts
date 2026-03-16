/**
 * @fileOverview Normalizador de textos lidos via OCR para placar de Sinuca.
 */

export class SnookerScoreNormalizer {
  /**
   * Limpa e extrai números de strings sujas do OCR.
   */
  static extractNumber(text: string): number | null {
    if (!text) return null;
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    return parseInt(cleaned, 10);
  }

  /**
   * Limpa nomes de jogadores removendo ruídos visuais.
   */
  static cleanPlayerName(name: string): string {
    if (!name) return "";
    return name
      .toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^A-Z\s]/g, '') // Mantém apenas letras e espaços
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Valida se uma transição de placar é lógica.
   */
  static isTransitionValid(current: number, next: number, bestOf: number): boolean {
    // Score não pode diminuir em modo automático assistido
    if (next < current) return false;
    
    // Score não pode saltar muito rápido (máximo 1 ponto por leitura estável)
    if (next > current + 1) return false;

    // Score não pode ultrapassar o limite de vitória do BestOf
    const winTarget = Math.ceil(bestOf / 2);
    if (next > winTarget) return false;

    return true;
  }

  /**
   * Compara similaridade entre nomes para validar se o OCR leu o jogador certo.
   */
  static calculateNameSimilarity(nameA: string, nameB: string): number {
    const a = this.cleanPlayerName(nameA);
    const b = this.cleanPlayerName(nameB);
    if (!a || !b) return 0;
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.8;
    
    return 0.5; // Similaridade neutra
  }
}
