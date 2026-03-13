/**
 * @fileOverview Utilitários de lógica de negócio para o Jogo do Bicho.
 */

export const JDB_GROUPS = [
  { group: '01', animal: 'Avestruz', dezenas: ['01', '02', '03', '04'] },
  { group: '02', animal: 'Águia', dezenas: ['05', '06', '07', '08'] },
  { group: '03', animal: 'Burro', dezenas: ['09', '10', '11', '12'] },
  { group: '04', animal: 'Borboleta', dezenas: ['13', '14', '15', '16'] },
  { group: '05', animal: 'Cachorro', dezenas: ['17', '18', '19', '20'] },
  { group: '06', animal: 'Cabra', dezenas: ['21', '22', '23', '24'] },
  { group: '07', animal: 'Carneiro', dezenas: ['25', '26', '27', '28'] },
  { group: '08', animal: 'Camelo', dezenas: ['29', '30', '31', '32'] },
  { group: '09', animal: 'Cobra', dezenas: ['33', '34', '35', '36'] },
  { group: '10', animal: 'Coelho', dezenas: ['37', '38', '39', '40'] },
  { group: '11', animal: 'Cavalo', dezenas: ['41', '42', '43', '44'] },
  { group: '12', animal: 'Elefante', dezenas: ['45', '46', '47', '48'] },
  { group: '13', animal: 'Galo', dezenas: ['49', '50', '51', '52'] },
  { group: '14', animal: 'Gato', dezenas: ['53', '54', '55', '56'] },
  { group: '15', animal: 'Jacaré', dezenas: ['57', '58', '59', '60'] },
  { group: '16', animal: 'Leão', dezenas: ['61', '62', '63', '64'] },
  { group: '17', animal: 'Macaco', dezenas: ['65', '66', '67', '68'] },
  { group: '18', animal: 'Porco', dezenas: ['69', '70', '71', '72'] },
  { group: '19', animal: 'Pavão', dezenas: ['73', '74', '75', '76'] },
  { group: '20', animal: 'Peru', dezenas: ['77', '78', '79', '80'] },
  { group: '21', animal: 'Touro', dezenas: ['81', '82', '83', '84'] },
  { group: '22', animal: 'Tigre', dezenas: ['85', '86', '87', '88'] },
  { group: '23', animal: 'Urso', dezenas: ['89', '90', '91', '92'] },
  { group: '24', animal: 'Veado', dezenas: ['93', '94', '95', '96'] },
  { group: '25', animal: 'Vaca', dezenas: ['97', '98', '99', '00'] }
];

/**
 * Calcula grupo e animal a partir de um número.
 */
export function getBichoInfo(val: string): { group: string; animal: string } {
  if (!val || val.length < 2) return { group: '--', animal: '--' };
  const dezena = val.slice(-2);
  const dezNum = parseInt(dezena, 10);
  
  let groupNum = Math.ceil(dezNum / 4);
  if (dezNum === 0) groupNum = 25;
  if (groupNum === 0 && dezNum !== 0) groupNum = 1;

  const found = JDB_GROUPS[groupNum - 1];
  return {
    group: found?.group || '--',
    animal: found?.animal || '--'
  };
}

/**
 * Normaliza um prêmio bruto para o formato interno detalhado.
 */
export function normalizePrize(val: string, pos: number) {
  const milhar = val.padStart(4, '0');
  const info = getBichoInfo(milhar);
  return {
    position: pos,
    milhar,
    centena: milhar.slice(-3),
    dezena: milhar.slice(-2),
    grupo: info.group,
    animal: info.animal
  };
}

/**
 * Gera um hash simples para detectar mudanças no resultado.
 */
export function generateResultChecksum(prizes: string[]): string {
  return prizes.join('|');
}
