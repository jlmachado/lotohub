/**
 * @fileOverview Serviço de Priorização e Ranking de Transmissões de Sinuca.
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

    // Fator de exclusão crítica: Vídeo inválido ou ausente
    if (!isValidYoutubeVideoId(item.embedId)) {
      isCandidate = false;
      exclusions.push("ID de vídeo inválido ou inexistente");
      score -= 5000;
    }

    if (item.isArchived) {
      isCandidate = false;
      exclusions.push("Canal arquivado");
      score -= 5000;
    }

    // Só canais habilitados podem ser candidatos a principal
    if (item.enabled === false) {
      isCandidate = false;
      exclusions.push("Canal desabilitado pelo administrador");
      score -= 1000;
    }

    // Status da transmissão
    switch (item.status) {
      case 'live':
        score += 100;
        reasons.push("Status: AO VIVO (+100)");
        break;
      case 'imminent':
        score += 70;
        reasons.push("Status: Iminente (+70)");
        break;
      case 'scheduled':
        score += 50;
        reasons.push("Status: Agendado (+50)");
        break;
      default:
        score += 0;
    }

    // Qualidade dos metadados
    if (item.playerA?.name && item.playerB?.name && item.playerA.name !== 'Jogador A') {
      score += 40;
      reasons.push("Confronto identificado (+40)");
    }

    const sourceWeight = context.sourcePriority || item.originPriority || 50;
    score += (sourceWeight / 2); 

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
        primaryReason: result.isCandidate ? result.reasons.join(" • ") : result.exclusions.join(" • ")
      } as SnookerChannel;
    }).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }

  /**
   * Escolhe o melhor candidato para ser a transmissão principal.
   */
  static choosePrimary(items: SnookerChannel[], manualId?: string | null): string | null {
    // 1. Prioridade absoluta para fixação manual válida
    if (manualId) {
      const manual = items.find(i => i.id === manualId);
      if (manual && manual.enabled && !manual.isArchived && isValidYoutubeVideoId(manual.embedId)) {
        return manualId;
      }
    }

    // 2. Escolha por ranking entre canais habilitados e válidos
    const ranked = this.rankItems(items.filter(i => i.enabled && !i.isArchived && isValidYoutubeVideoId(i.embedId)));
    
    return ranked.length > 0 ? ranked[0].id : null;
  }
}
