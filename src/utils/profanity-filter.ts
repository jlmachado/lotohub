/**
 * @fileOverview Utilitário síncrono para filtragem de palavras ofensivas.
 */

const BANNED_WORDS = [
  'porra', 'caralho', 'fodas', 'foda', 'puta', 'merda', 'vtnc', 'fdp', 
  'arrombado', 'viado', 'corno', 'desgraça', 'buceta', 'piranha'
];

/**
 * Filtra palavras ofensivas de uma string, substituindo-as por asteriscos.
 */
export function filterProfanity(text: string): string {
  if (!text) return "";
  
  let filtered = text;
  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  
  return filtered;
}
