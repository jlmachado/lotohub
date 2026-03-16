
/**
 * @fileOverview Utilitário para captura de frames de elementos de vídeo HTML5.
 */

export class VideoFrameCapture {
  /**
   * Tenta encontrar o elemento de vídeo real, mesmo dentro de iframes acessíveis.
   */
  static findVideoElement(): HTMLVideoElement | null {
    // 1. Procura no documento principal
    const video = document.querySelector('video');
    if (video) return video;

    // 2. Procura dentro de iframes (apenas se forem do mesmo domínio ou permitidos)
    const iframes = document.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
      try {
        const innerVideo = iframes[i].contentDocument?.querySelector('video');
        if (innerVideo) return innerVideo;
      } catch (e) {
        // Ignora iframes cross-origin
      }
    }

    return null;
  }

  /**
   * Captura o frame atual do vídeo para um canvas.
   */
  static captureFrame(video: HTMLVideoElement): ImageData | null {
    if (video.readyState < 2) return null; // Precisamos de metadados carregados

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Recorta uma Região de Interesse (ROI) percentual de um ImageData.
   */
  static cropROI(frame: ImageData, roi: { top: number; left: number; width: number; height: number }): ImageData | null {
    const x = Math.floor((roi.left / 100) * frame.width);
    const y = Math.floor((roi.top / 100) * frame.height);
    const w = Math.floor((roi.width / 100) * frame.width);
    const h = Math.floor((roi.height / 100) * frame.height);

    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.putImageData(frame, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = w;
    croppedCanvas.height = h;
    const croppedCtx = croppedCanvas.getContext('2d', { willReadFrequently: true });
    if (!croppedCtx) return null;

    croppedCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    return croppedCtx.getImageData(0, 0, w, h);
  }
}
