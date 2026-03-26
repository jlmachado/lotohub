/**
 * @fileOverview Utilitário para detecção de eventos idênticos entre provedores.
 */

/**
 * Normaliza nomes de times removendo espaços e convertendo para minúsculas.
 */
function normalize(name: string): string {
  if (!name) return "";
  return name.toLowerCase().replace(/\s+/g, "");
}

/**
 * Compara dois eventos para verificar se referem-se à mesma partida.
 * Critérios: nomes dos times combinados e diferença de horário inferior a 5 minutos.
 */
export function matchEvents(
  a: { homeTeam: string; awayTeam: string; startTime: string },
  b: { homeTeam: string; awayTeam: string; startTime: string }
): boolean {
  if (!a.homeTeam || !a.awayTeam || !b.homeTeam || !b.awayTeam) return false;

  const teamsA = normalize(a.homeTeam + a.awayTeam);
  const teamsB = normalize(b.homeTeam + b.awayTeam);

  const dateA = new Date(a.startTime).getTime();
  const dateB = new Date(b.startTime).getTime();

  if (isNaN(dateA) || isNaN(dateB)) return false;

  const timeDiff = Math.abs(dateA - dateB);

  // Margem de tolerância de 5 minutos (300.000 ms)
  const TOLERANCE_MS = 5 * 60 * 1000;

  return teamsA === teamsB && timeDiff < TOLERANCE_MS;
}
