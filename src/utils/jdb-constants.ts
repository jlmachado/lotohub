/**
 * @fileOverview Constantes e mapeamentos oficiais do Jogo do Bicho.
 */

export const JDB_STATES = [
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "SP", name: "São Paulo" },
  { code: "GO", name: "Goiás" },
  { code: "DF", name: "Brasília (DF)" },
  { code: "PB", name: "Paraíba" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "PR", name: "Paraná" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PE", name: "Pernambuco" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "SE", name: "Sergipe" }
];

export const JDB_ANIMALS = [
  "Avestruz", "Águia", "Burro", "Borboleta", "Cachorro",
  "Cabra", "Carneiro", "Camelo", "Cobra", "Coelho",
  "Cavalo", "Elefante", "Galo", "Gato", "Jacaré",
  "Leão", "Macaco", "Porco", "Pavão", "Peru",
  "Touro", "Tigre", "Urso", "Veado", "Vaca"
];

export const getBichoByGroup = (group: number | string) => {
  const idx = parseInt(String(group), 10) - 1;
  return JDB_ANIMALS[idx] || "Desconhecido";
};

export const getGroupByNumber = (num: string) => {
  if (!num || num.length < 2) return 0;
  const dezena = parseInt(num.slice(-2), 10);
  if (dezena === 0) return 25;
  return Math.ceil(dezena / 4);
};
