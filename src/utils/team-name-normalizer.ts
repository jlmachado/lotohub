/**
 * @fileOverview Utilitário avançado para normalização de nomes de times.
 * Essencial para o matching entre diferentes provedores de dados.
 */

export function normalizeTeamName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    // Remove sufixos e prefixos comuns que variam entre APIs
    .replace(/\b(fc|cf|sc|afc|sd|ca|rc|u20|u23|women|feminino|united|utd|city|st-germain|psg|clube|clube de futebol|atletico|atletico de|esporte clube|ec|sp|rj|mg|rs|pr|go|ba|ce|rn|pb)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compara dois nomes de times e retorna um nível de confiança (0 a 1).
 */
export function areTeamsSimilar(name1: string, name2: string): boolean {
  const n1 = normalizeTeamName(name1);
  const n2 = normalizeTeamName(name2);
  
  if (n1 === n2) return true;
  
  // Verifica se um nome contém o outro (ex: "Flamengo" e "Flamengo RJ")
  if (n1.length > 3 && n2.length > 3) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  
  return false;
}
