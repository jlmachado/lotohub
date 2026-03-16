
/**
 * @fileOverview Motor Real de OCR para leitura de placares de sinuca.
 */

import { VideoFrameCapture } from '@/utils/video-frame-capture';
import { ImagePreprocess } from '@/utils/image-preprocess';
import { ocrWorkerPool } from './ocr-worker-pool';
import { ScoreOverlayProfile } from './snooker-overlay-profile-service';

export interface OCRResult {
  scoreA: number | null;
  scoreB: number | null;
  confidence: number;
  rawText: string;
  capturedAt: string;
}

export class SnookerOCREngine {
  /**
   * Ciclo completo de leitura: Captura -> Crop -> Preprocess -> OCR -> Parse
   */
  static async readLiveScore(profile: ScoreOverlayProfile): Promise<OCRResult | null> {
    const video = VideoFrameCapture.findVideoElement();
    if (!video) return null;

    // 1. Captura Frame
    const fullFrame = VideoFrameCapture.captureFrame(video);
    if (!fullFrame) return null;

    // 2. Crop ROI
    const roiFrame = VideoFrameCapture.cropROI(fullFrame, profile.roi);
    if (!roiFrame) return null;

    // 3. Pré-processamento
    ImagePreprocess.boostContrast(roiFrame, 50);
    ImagePreprocess.toGrayscaleThreshold(roiFrame, 160);
    const dataUrl = ImagePreprocess.toDataURL(roiFrame);

    // 4. OCR Real via Tesseract
    try {
      const worker = await ocrWorkerPool.getWorker();
      const { data: { text, confidence } } = await worker.recognize(dataUrl);
      
      const parsed = this.parseScoreText(text);
      
      return {
        ...parsed,
        confidence: confidence / 100,
        rawText: text.trim(),
        capturedAt: new Date().toISOString()
      };
    } catch (e) {
      console.error('[OCREngine] Erro no Tesseract:', e);
      return null;
    }
  }

  /**
   * Extrai números do texto do OCR usando padrões típicos de placar.
   */
  private static parseScoreText(text: string): { scoreA: number | null, scoreB: number | null } {
    const clean = text.replace(/\s+/g, ' ');
    
    // Procura por padrões como "5 - 2", "5 x 2", "5 2"
    const scoreRegex = /(\d+)\s*[-xX ]\s*(\d+)/;
    const match = clean.match(scoreRegex);

    if (match) {
      return {
        scoreA: parseInt(match[1], 10),
        scoreB: parseInt(match[2], 10)
      };
    }

    // Tenta extrair apenas os dois primeiros números encontrados se o padrão falhar
    const numbers = clean.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      return {
        scoreA: parseInt(numbers[0], 10),
        scoreB: parseInt(numbers[1], 10)
      };
    }

    return { scoreA: null, scoreB: null };
  }
}
