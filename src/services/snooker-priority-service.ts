
/**
 * @fileOverview Serviço de Priorização e Ranking de Transmissões de Sinuca.
 * Calcula o Score de Relevância para escolher o canal principal automaticamente.
 */

import { SnookerChannel } from "@/context/AppContext";
import { isValidYoutubeVideoId } from "@/utils/youtube";

export interface PriorityScoreResult {
  score: number;
  isCandidate: boolean;
  reasons: string[];
  exclusions: string[];
}

export class SnookerPriorityService {
  /**
   * Calcula o score de relevância de um item detectado.
   */
  static scoreItem(item: Partial<SnookerChannel>, context: { sourcePriority?: number } = {}): PriorityScoreResult {
    const reasons: string[] = [];
    const exclusions: string[] = [];
    let score = 0;
    let isCandidate = true;

    // 1. VALIDAÇÃO OBRIGATÓRIA (Fator de Exclusão)
    if (!isValidYoutubeVideoId(item.embedId)) {
      isCandidate = false;
      exclusions.push("ID de vídeo inválido ou inexistente");
      score -= 1000;
    }

    if (item.contentType === 'short' || item.contentType === 'promo' || item.contentType === 'interview' || item.contentType === 'teaser') {
      isCandidate = false;
      exclusions.push(`Conteúdo tipo ${item.contentType} não é partida principal`);
      score -= 500;
    }

    if (item.isArchived) {
      isCandidate = false;
      exclusions.push("Canal arquivado");
      score -= 1000;
    }

    // 2. STATUS DA TRANSMISSÃO (Pesos de 0 a 100)
    switch (item.status) {
      case 'live':
        score += 100;
        reasons.push("Status: AO VIVO (+100)");
        break;
      case 'imminent':
        score += 70;
        reasons.push("Status: Começando em breve (+70)");
        break;
      case 'scheduled':
        score += 50;
        reasons.push("Status: Agendado (+50)");
        break;
      case 'recent' as any:
        score += 20;
        reasons.push("Status: Vídeo recente (+20)");
        break;
      default:
        score += 0;
    }

    // 3. QUALIDADE DOS METADADOS (Pesos de 0 a 80)
    if (item.playerA?.name && item.playerB?.name && item.playerA.name !== 'Jogador A') {
      score += 40;
      reasons.push("Confronto entre dois jogadores identificado (+40)");
    } else if (item.playerA?.name || item.playerB?.name) {
      score += 10;
      reasons.push("Apenas um jogador identificado (+10)");
    } else {
      score -= 40;
      reasons.push("Nenhum jogador identificado (-40)");
    }

    const confidence = item.metadataConfidence || 0;
    if (confidence >= 0.9) {
      score += 40;
      reasons.push("Alta confiança nos metadados (+40)");
    } else if (confidence >= 0.7) {
      score += 20;
      reasons.push("Média confiança nos metadados (+20)");
    } else if (confidence < 0.4) {
      score -= 30;
      reasons.push("Baixa confiança nos metadados (-30)");
    }

    // 4. PRIORIDADE DA FONTE (Desempate)
    const sourceWeight = context.sourcePriority || item.originPriority || 50;
    score += (sourceWeight / 2); // Adiciona até 50 pontos baseados na fonte
    if (sourceWeight > 80) reasons.push(`Fonte de alta prioridade: ${item.sourceName} (+${sourceWeight/2})`);

    // 5. ATRIBUTOS ESPECIAIS
    if (item.isFeatured) {
      score += 30;
      reasons.push("Marcado como destaque (+30)");
    }

    if (item.prizeLabel) {
      score += 15;
      reasons.push("Premiação identificada (+15)");
    }

    if (item.phase?.toLowerCase().includes('final')) {
      score += 25;
      reasons.push("Fase decisiva detectada (+25)");
    }

    // 6. VALIDADE TÉCNICA
    if (item.enabled) {
      score += 10;
    } else {
      score -= 50;
      reasons.push("Canal desabilitado (-50)");
    }

    return {
      score,
      isCandidate: isCandidate && score > 0,
      reasons,
      exclusions
    };
  }

  /**
   * Ordena uma lista de canais por score de prioridade.
   */
  static rankItems(items: SnookerChannel[]): SnookerChannel[] {
    return [...items].map(item => {
      const result = this.scoreItem(item);
      return {
        ...item,
        priorityScore: result.score,
        isPrimaryCandidate: result.isCandidate,
        primaryReason: result.isCandidate ? result.reasons.join(" • ") : result.exclusions.join(" • "),
        transmissionHealth: result.score > 150 ? 'valid' : result.score > 50 ? 'weak' : 'invalid'
      } as SnookerChannel;
    }).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }

  /**
   * Escolhe o melhor candidato para ser a transmissão principal.
   */
  static choosePrimary(items: SnookerChannel[], manualId?: string | null): string | null {
    if (manualId) {
      const manual = items.find(i => i.id === manualId);
      if (manual && manual.enabled && !manual.isArchived) return manualId;
    }

    const ranked = this.rankItems(items.filter(i => i.enabled && !i.isArchived));
    const best = ranked[0];

    return (best && (best.priorityScore || 0) > 0) ? best.id : null;
  }
}
