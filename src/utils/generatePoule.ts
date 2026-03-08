
/**
 * @fileOverview Gerador de POULE única para bilhetes de loteria.
 * Formato: PL + YYYYMMDD + "-" + HHMMSS + "-" + 6 números aleatórios
 */

export function generatePoule(): string {
  const now = new Date();
  
  // Data formatada YYYYMMDD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Hora formatada HHMMSS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}${minutes}${seconds}`;
  
  // 6 números aleatórios
  const random = Math.floor(100000 + Math.random() * 900000);
  
  return `PL${dateStr}-${timeStr}-${random}`;
}
