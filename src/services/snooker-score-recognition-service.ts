
/**
 * @fileOverview Serviço de Reconhecimento de Placar Real via OCR.
 * Orquestra leitura, validação e aplicação do placar oficial.
 */

import { SnookerChannel, SnookerScoreReading, SnookerScoreboard, SnookerScoreRecognitionSettings } from '@/context/AppContext';
import { SnookerOverlayProfileService } from './snooker-overlay-profile-service';
import { SnookerScoreNormalizer } from '@/utils/snooker-score-normalizer';
import { SnookerOCREngine } from './snooker-ocr-engine';

// Estrutura de buffer isolada por canal
const readingBuffers: Record<string, SnookerScoreReading[]> = {};
const MAX_BUFFER_SIZE = 10;

export class SnookerScoreRecognitionService {
  /**
   * Processa um ciclo de leitura OCR para um canal específico.
   */
  static async processFrame(
    channel: SnookerChannel, 
    currentScore: SnookerScoreboard,
    settings: SnookerScoreRecognitionSettings
  ): Promise<SnookerScoreReading | null> {
    
    if (!settings.enabled || channel.status !== 'live') return null;

    try {
      const profile = SnookerOverlayProfileService.getProfile(channel.scoreOverlayProfile);

      // Executa OCR Real
      const ocrResult = await SnookerOCREngine.readLiveScore(profile);
      if (!ocrResult || ocrResult.scoreA === null || ocrResult.scoreB === null) return null;

      const reading: SnookerScoreReading = {
        channelId: channel.id,
        playerA: channel.playerA.name,
        playerB: channel.playerB.name,
        scoreA: ocrResult.scoreA,
        scoreB: ocrResult.scoreB,
        confidence: ocrResult.confidence,
        capturedAt: ocrResult.capturedAt,
        stableCount: 0,
        rawText: ocrResult.rawText
      };

      // Validação Lógica
      if (!this.isValidSequence(currentScore, reading, channel.bestOf)) {
        return null;
      }

      // Estabilidade
      reading.stableCount = this.updateStabilityBuffer(channel.id, reading);

      return reading;
    } catch (error) {
      console.warn('[ScoreRec] Falha no ciclo OCR:', error);
      return null;
    }
  }

  private static isValidSequence(current: SnookerScoreboard, reading: SnookerScoreReading, bestOf: number): boolean {
    if (reading.confidence < 0.4) return false;

    // Regras de integridade
    if (reading.scoreA < current.scoreA || reading.scoreB < current.scoreB) return false;
    
    const winTarget = Math.ceil(bestOf / 2);
    if (reading.scoreA > winTarget || reading.scoreB > winTarget) return false;

    // Impede saltos bruscos do OCR
    if ((reading.scoreA - current.scoreA) > 1 || (reading.scoreB - current.scoreB) > 1) return false;

    return true;
  }

  private static updateStabilityBuffer(channelId: string, reading: SnookerScoreReading): number {
    if (!readingBuffers[channelId]) readingBuffers[channelId] = [];
    const buffer = readingBuffers[channelId];
    buffer.push(reading);
    if (buffer.length > MAX_BUFFER_SIZE) buffer.shift();

    let count = 0;
    for (let i = buffer.length - 1; i >= 0; i--) {
      if (buffer[i].scoreA === reading.scoreA && buffer[i].scoreB === reading.scoreB) count++;
      else break;
    }
    return count;
  }

  static shouldAutoApply(
    reading: SnookerScoreReading, 
    current: SnookerScoreboard, 
    settings: SnookerScoreRecognitionSettings
  ): boolean {
    if (settings.mode !== 'auto_assistido' || !settings.autoApplyScore) return false;

    const hasConfidence = reading.confidence >= settings.minConfidenceToAutoApply;
    const isStable = reading.stableCount >= settings.requiredStableReads;
    const hasChange = reading.scoreA !== current.scoreA || reading.scoreB !== current.scoreB;

    return (hasConfidence || isStable) && hasChange;
  }

  static clearBuffer(channelId: string) {
    delete readingBuffers[channelId];
  }
}
