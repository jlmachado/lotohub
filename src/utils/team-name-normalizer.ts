/**
 * @fileOverview Utilitário para normalizar nomes de times para comparação entre APIs.
 */

export function normalizeTeamName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\b(fc|cf|sc|afc|sd|ca|rc|u20|u23|women|feminino|united|utd|city|st-germain|psg|clube|clube de futebol|atletico|atletico de|esporte clube|ec)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se dois nomes de times são semelhantes.
 */
export function areTeamsSimilar(name1: string, name2: string): boolean {
  const n1 = normalizeTeamName(name1);
  const n2 = normalizeTeamName(name2);
  
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  return false;
}
