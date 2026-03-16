
/**
 * @fileOverview Funções de pré-processamento de imagem para melhorar precisão do OCR.
 */

export class ImagePreprocess {
  /**
   * Converte ImageData para escala de cinza e aplica threshold binário.
   */
  static toGrayscaleThreshold(imageData: ImageData, threshold: number = 128): ImageData {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      // Cálculo de luminância (Rec. 709)
      const avg = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
      
      // Binarização
      const val = avg > threshold ? 255 : 0;
      
      data[i] = val;     // Red
      data[i + 1] = val; // Green
      data[i + 2] = val; // Blue
      // Alpha permanece o mesmo
    }
    return imageData;
  }

  /**
   * Melhora o contraste da imagem.
   */
  static boostContrast(imageData: ImageData, contrast: number = 1.5): ImageData {
    const data = imageData.data;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      data[i] = factor * (data[i] - 128) + 128;
      data[i + 1] = factor * (data[i + 1] - 128) + 128;
      data[i + 2] = factor * (data[i + 2] - 128) + 128;
    }
    return imageData;
  }

  /**
   * Converte ImageData para DataURL para uso no Tesseract.
   */
  static toDataURL(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }
}
