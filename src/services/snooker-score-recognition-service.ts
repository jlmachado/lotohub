/**
 * @fileOverview Serviço de Reconhecimento de Placar por Imagem (Simulado).
 * Implementa a orquestração de OCR, Estabilidade e Auto-Aplicação.
 */

import { SnookerChannel, SnookerScoreReading, SnookerScoreboard, SnookerScoreRecognitionSettings } from '@/context/AppContext';
import { SnookerOverlayProfileService } from './snooker-overlay-profile-service';
import { SnookerScoreNormalizer } from '@/utils/snooker-score-normalizer';

// Buffer interno para estabilidade
let lastReadings: SnookerScoreReading[] = [];

export class SnookerScoreRecognitionService {
  /**
   * Simula a captura e análise de um frame da transmissão.
   * Em produção, isso chamaria um endpoint de IA ou rodaria bibliotecas de OCR.
   */
  static async processFrame(
    channel: SnookerChannel, 
    currentScore: SnookerScoreboard,
    settings: SnookerScoreRecognitionSettings
  ): Promise<SnookerScoreReading | null> {
    
    if (!settings.enabled || channel.status !== 'live') return null;

    // 1. Simulação de processamento visual (OCR)
    // Em um sistema real, aqui capturaríamos o canvas do player ou um snapshot do backend.
    await new Promise(res => setTimeout(res, 800));

    // Lógica de simulação: busca coerência com o canal atual
    const dice = Math.random();
    let detectedA = currentScore.scoreA;
    let detectedB = currentScore.scoreB;
    let confidence = 0.95;

    if (dice > 0.98) {
      // Simula uma falha de leitura (OCR ruidoso)
      detectedA = Math.floor(Math.random() * 10);
      confidence = 0.2;
    } else if (dice > 0.90) {
      // Simula um ponto marcado (evolução do jogo)
      if (Math.random() > 0.5) detectedA++; else detectedB++;
    }

    const reading: SnookerScoreReading = {
      channelId: channel.id,
      playerA: SnookerScoreNormalizer.cleanPlayerName(channel.playerA.name),
      playerB: SnookerScoreNormalizer.cleanPlayerName(channel.playerB.name),
      scoreA: detectedA,
      scoreB: detectedB,
      confidence,
      capturedAt: new Date().toISOString(),
      stableCount: 0
    };

    // 2. Verificação de Estabilidade
    // Adiciona ao buffer e conta quantas vezes a mesma leitura se repetiu
    lastReadings.push(reading);
    if (lastReadings.length > 10) lastReadings.shift();

    const identicalOnes = lastReadings.filter(r => 
      r.scoreA === reading.scoreA && r.scoreB === reading.scoreB
    ).length;

    reading.stableCount = identicalOnes;

    return reading;
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

    // Regras de Ouro para Auto-Aplicação:
    // 1. Confiança individual alta
    const hasHighConfidence = reading.confidence >= settings.minConfidenceToAutoApply;
    
    // 2. Leitura estável (repetida X vezes conforme configuração)
    const isStable = reading.stableCount >= settings.requiredStableReads;

    // 3. Evolução lógica (score não pode diminuir no modo automático)
    const isLogic = reading.scoreA >= current.scoreA && reading.scoreB >= current.scoreB;

    // 4. Salto de pontos coerente (evita bugs de OCR que pulam muitos frames)
    const isNotCrazy = (reading.scoreA - current.scoreA) <= 1 && (reading.scoreB - current.scoreB) <= 1;

    return hasHighConfidence && isStable && isLogic && isNotCrazy;
  }
}
