/**
 * @fileOverview Utilitários centrais para validação e manipulação de URLs e IDs do YouTube.
 */

/**
 * Valida se um ID de vídeo do YouTube é sintaticamente correto (11 caracteres alfanuméricos/especiais).
 */
export function isValidYoutubeVideoId(videoId: string | null | undefined): boolean {
  if (!videoId || typeof videoId !== 'string') return false;
  // O YouTube usa IDs de 11 caracteres que podem incluir letras, números, guion (-) e underscore (_)
  const regex = /^[a-zA-Z0-9_-]{11}$/;
  return regex.test(videoId);
}

/**
 * Extrai o Video ID de diversos formatos de URL do YouTube.
 */
export function extractYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|watch)\/|.*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  const id = match ? match[1] : null;
  
  return isValidYoutubeVideoId(id) ? id : null;
}

/**
 * Constrói uma URL de visualização padrão.
 */
export function buildYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Constrói uma URL de incorporação (embed).
 */
export function buildYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Normaliza uma entrada (pode ser URL ou apenas ID) para uma URL de visualização válida.
 */
export function normalizeYoutubeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  
  const videoId = extractYoutubeVideoId(input) || (isValidYoutubeVideoId(input) ? input : null);
  
  if (videoId) {
    return buildYoutubeWatchUrl(videoId);
  }
  
  return null;
}

/**
 * Verifica se uma URL é uma URL de vídeo válida e suportada.
 */
export function isValidYoutubeUrl(url: string | null | undefined): boolean {
  return !!extractYoutubeVideoId(url);
}
