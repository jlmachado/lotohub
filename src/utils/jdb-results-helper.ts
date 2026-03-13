/**
 * @fileOverview Utilitários para processamento de resultados do Jogo do Bicho.
 */

export interface JDBResultItem {
  premio: string;
  valor: string;
  grupo: string;
  animal: string;
}

export const ANIMAIS = [
  "Avestruz", "Águia", "Burro", "Borboleta", "Cachorro",
  "Cabra", "Carneiro", "Camelo", "Cobra", "Coelho",
  "Cavalo", "Elefante", "Galo", "Gato", "Jacaré",
  "Leão", "Macaco", "Porco", "Pavão", "Peru",
  "Touro", "Tigre", "Urso", "Veado", "Vaca"
];

/**
 * Calcula o grupo e o animal a partir de uma milhar, centena ou dezena.
 */
export function getBichoInfo(numero: string): { grupo: string; animal: string } {
  if (!numero || numero.length < 2) return { grupo: "--", animal: "--" };
  
  const dezena = parseInt(numero.slice(-2));
  let grupoNum = Math.ceil(dezena / 4);
  
  // Regra especial para dezena 00 (Vaca - Grupo 25)
  if (dezena === 0) grupoNum = 25;
  
  const animal = ANIMAIS[grupoNum - 1] || "Não Identificado";
  const grupoStr = grupoNum.toString().padStart(2, '0');
  
  return { grupo: grupoStr, animal };
}

/**
 * Valida se uma string é uma milhar válida (4 dígitos).
 */
export function isValidMilhar(val: string): boolean {
  return /^\d{4}$/.test(val);
}

/**
 * Formata um objeto de resultado para persistência.
 */
export function normalizeJDBResult(prizes: string[]): JDBResultItem[] {
  return prizes.map((val, index) => {
    const { grupo, animal } = getBichoInfo(val);
    return {
      premio: `${index + 1}º`,
      valor: val.padStart(4, '0'),
      grupo,
      animal
    };
  });
}
