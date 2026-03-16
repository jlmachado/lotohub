/**
 * @fileOverview Serviço de Reconhecimento de Placar por Imagem (Pipeline Profissional).
 * Implementa a orquestração de leitura, validação e estabilidade.
 */

import { SnookerChannel, SnookerScoreReading, SnookerScoreboard, SnookerScoreRecognitionSettings } from '@/context/AppContext';
import { SnookerOverlayProfileService } from './snooker-overlay-profile-service';
import { SnookerScoreNormalizer } from '@/utils/snooker-score-normalizer';

// Estrutura de buffer isolada por canal para evitar crosstalk
const readingBuffers: Record<string, SnookerScoreReading[]> = {};
const MAX_BUFFER_SIZE = 15;

export class SnookerScoreRecognitionService {
  /**
   * Processa um ciclo de leitura para um canal específico.
   * Segue o pipeline: Perfil -> Mock Provider -> Normalização -> Estabilidade.
   */
  static async processFrame(
    channel: SnookerChannel, 
    currentScore: SnookerScoreboard,
    settings: SnookerScoreRecognitionSettings
  ): Promise<SnookerScoreReading | null> {
    
    if (!settings.enabled || channel.status !== 'live') return null;

    try {
      // 1. Obter Perfil de Overlay (ROI e Zonas)
      const profile = SnookerOverlayProfileService.getProfile(channel.scoreOverlayProfile);

      // 2. Simulação de Provedor de Leitura (Mock Controlado)
      // Em produção, isso seria a chamada ao backend de OCR ou biblioteca local.
      const rawReading = await this.mockReadScoreProvider(currentScore, channel.bestOf);

      // 3. Normalização e Limpeza
      const normalizedReading: SnookerScoreReading = {
        channelId: channel.id,
        playerA: SnookerScoreNormalizer.cleanPlayerName(channel.playerA.name),
        playerB: SnookerScoreNormalizer.cleanPlayerName(channel.playerB.name),
        scoreA: rawReading.scoreA,
        scoreB: rawReading.scoreB,
        confidence: rawReading.confidence,
        capturedAt: new Date().toISOString(),
        stableCount: 0,
        rawText: `Profile: ${profile.id} | Mode: Mock`
      };

      // 4. Validação Lógica (Coerência com o jogo atual)
      if (!this.isValidSequence(currentScore, normalizedReading, channel.bestOf)) {
        console.warn(`[ScoreRec] Leitura descartada por incoerência lógica no canal ${channel.id}`);
        return null;
      }

      // 5. Atualizar Buffer de Estabilidade (Exclusivo por Canal)
      const stableCount = this.updateStabilityBuffer(channel.id, normalizedReading);
      normalizedReading.stableCount = stableCount;

      return normalizedReading;
    } catch (error) {
      console.error('[ScoreRec] Erro no ciclo de processamento:', error);
      return null;
    }
  }

  /**
   * Simula um provedor de OCR que tenta ler o placar.
   * A simulação é baseada na evolução realística do placar atual.
   */
  private static async mockReadScoreProvider(current: SnookerScoreboard, bestOf: number) {
    // Simula tempo de processamento de rede/IA
    await new Promise(res => setTimeout(res, 600));

    const dice = Math.random();
    let scoreA = current.scoreA;
    let scoreB = current.scoreB;
    let confidence = 0.92 + (Math.random() * 0.07); // Confiança alta para mock estável

    // Simula evolução do jogo (10% de chance de detectar um ponto novo)
    if (dice > 0.90) {
      const winTarget = Math.ceil(bestOf / 2);
      if (Math.random() > 0.5) {
        if (scoreA < winTarget) scoreA++;
      } else {
        if (scoreB < winTarget) scoreB++;
      }
    } 
    // Simula erro de leitura ocasional (2% de chance)
    else if (dice < 0.02) {
      scoreA = Math.floor(Math.random() * 10);
      confidence = 0.35;
    }

    return { scoreA, scoreB, confidence };
  }

  /**
   * Verifica se a leitura é logicamente possível baseada no score atual.
   */
  private static isValidSequence(current: SnookerScoreboard, reading: SnookerScoreReading, bestOf: number): boolean {
    // Se a confiança for muito baixa, nem avaliamos
    if (reading.confidence < 0.4) return false;

    // Placar não pode diminuir no modo automático
    if (reading.scoreA < current.scoreA || reading.scoreB < current.scoreB) return false;

    // Respeita o limite de vitória do Best Of
    const winTarget = Math.ceil(bestOf / 2);
    if (reading.scoreA > winTarget || reading.scoreB > winTarget) return false;

    // Não permite saltos de mais de 1 ponto por leitura (proteção contra glitches)
    if ((reading.scoreA - current.scoreA) > 1 || (reading.scoreB - current.scoreB) > 1) return false;

    return true;
  }

  /**
   * Adiciona leitura ao buffer do canal e retorna quantas vezes ela se repetiu consecutivamente.
   */
  private static updateStabilityBuffer(channelId: string, reading: SnookerScoreReading): number {
    if (!readingBuffers[channelId]) {
      readingBuffers[channelId] = [];
    }

    const buffer = readingBuffers[channelId];
    buffer.push(reading);

    // Mantém o tamanho do buffer controlado
    if (buffer.length > MAX_BUFFER_SIZE) {
      buffer.shift();
    }

    // Conta ocorrências idênticas nas últimas leituras
    const lastThree = buffer.slice(-3);
    if (lastThree.length < 2) return 1;

    let count = 0;
    for (let i = lastThree.length - 1; i >= 0; i--) {
      if (lastThree[i].scoreA === reading.scoreA && lastThree[i].scoreB === reading.scoreB) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Decide se uma leitura deve ser aplicada automaticamente ao placar público.
   */
  static shouldAutoApply(
    reading: SnookerScoreReading, 
    current: SnookerScoreboard, 
    settings: SnookerScoreRecognitionSettings
  ): boolean {
    if (settings.mode !== 'auto_assistido' || !settings.autoApplyScore) return false;

    // Regras Críticas:
    // 1. Confiança mínima atingida
    const hasConfidence = reading.confidence >= settings.minConfidenceToAutoApply;
    
    // 2. Estabilidade confirmada (repetição)
    const isStable = reading.stableCount >= settings.requiredStableReads;

    // 3. Existe mudança real para aplicar
    const hasChange = reading.scoreA !== current.scoreA || reading.scoreB !== current.scoreB;

    return hasConfidence && isStable && hasChange;
  }

  /**
   * Limpa o buffer de um canal (útil ao encerrar live ou trocar seleção)
   */
  static clearBuffer(channelId: string) {
    delete readingBuffers[channelId];
  }
}
