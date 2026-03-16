
/**
 * @fileOverview Pool de workers do Tesseract para reciclagem de recursos.
 */

import { createWorker, Worker } from 'tesseract.js';

class OCRWorkerPool {
  private worker: Worker | null = null;
  private isInitializing = false;

  async getWorker(): Promise<Worker> {
    if (this.worker) return this.worker;
    
    if (this.isInitializing) {
      // Espera um pouco se já estiver inicializando
      await new Promise(res => setTimeout(res, 500));
      return this.getWorker();
    }

    this.isInitializing = true;
    try {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789-xX ',
      });
      this.worker = worker;
      return worker;
    } finally {
      this.isInitializing = false;
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrWorkerPool = new OCRWorkerPool();
