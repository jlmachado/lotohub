/**
 * @fileOverview Configurações padrão (seeds) para todas as modalidades de loteria.
 * Versão V2: Catálogo completo nacional por estados.
 */

import { JDBLoteria, GenericLotteryConfig } from "@/context/AppContext";

const ALL_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const createDias = (horarios: string[]) => {
  return ALL_DAYS.reduce((acc, dia) => ({
    ...acc,
    [dia]: { selecionado: true, horarios }
  }), {});
};

export const DEFAULT_JDB_MODALITIES = [
  { nome: 'Grupo', multiplicador: '18' },
  { nome: 'Milhar', multiplicador: '5000' },
  { nome: 'Centena', multiplicador: '700' },
  { nome: 'Milhar e Centena', multiplicador: '5700' },
  { nome: 'Dezena', multiplicador: '60' },
  { nome: 'Dupla de Grupo', multiplicador: '160' },
  { nome: 'Terno de Grupo', multiplicador: '1300' },
  { nome: 'Passe', multiplicador: '90' },
  { nome: 'Passe Seco', multiplicador: '160' },
  { nome: 'Passe Vai Vem', multiplicador: '45' },
  { nome: 'Duque de Dezena', multiplicador: '300' },
  { nome: 'Terno de Dezena', multiplicador: '5000' },
];

export const INITIAL_JDB_LOTERIAS: JDBLoteria[] = [
  // --- RIO DE JANEIRO ---
  {
    id: 'rj-rio',
    bancaId: 'global',
    nome: 'Rio De Janeiro',
    stateName: 'Rio de Janeiro',
    stateCode: 'RJ',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['09:20', '11:20', '14:20', '16:20', '18:20', '19:20', '21:20'])
  },
  // --- SÃO PAULO ---
  {
    id: 'sp-ptsp',
    bancaId: 'global',
    nome: 'PTSP',
    stateName: 'São Paulo',
    stateCode: 'SP',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['08:30', '10:30', '12:20', '13:30'])
  },
  {
    id: 'sp-bandeirantes',
    bancaId: 'global',
    nome: 'Bandeirantes',
    stateName: 'São Paulo',
    stateCode: 'SP',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['15:30', '17:20', '19:00'])
  },
  {
    id: 'sp-pnt',
    bancaId: 'global',
    nome: 'PNT SP',
    stateName: 'São Paulo',
    stateCode: 'SP',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['20:00', '22:00', '23:00'])
  },
  // --- BAHIA ---
  {
    id: 'ba-paratodos',
    bancaId: 'global',
    nome: 'Paratodos Bahia',
    stateName: 'Bahia',
    stateCode: 'BA',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['10:00', '12:00', '15:00', '19:00', '21:00'])
  },
  {
    id: 'ba-maluca',
    bancaId: 'global',
    nome: 'Maluca Bahia',
    stateName: 'Bahia',
    stateCode: 'BA',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['10:00', '12:00', '15:00', '19:00', '21:00'])
  },
  // --- BRASÍLIA ---
  {
    id: 'df-lbr',
    bancaId: 'global',
    nome: 'LBR Loterias',
    stateName: 'Brasília / DF',
    stateCode: 'DF',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['08:30', '10:30', '12:30', '14:30', '16:30', '18:30', '20:30'])
  },
  // --- GOIÁS ---
  {
    id: 'go-look',
    bancaId: 'global',
    nome: 'Look Loterias',
    stateName: 'Goiás',
    stateCode: 'GO',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['11:00', '14:00', '16:00', '18:00', '21:00'])
  },
  // --- MINAS GERAIS ---
  {
    id: 'mg-alvorada',
    bancaId: 'global',
    nome: 'Alvorada MG',
    stateName: 'Minas Gerais',
    stateCode: 'MG',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['12:00', '15:00', '18:00', '21:00'])
  },
  // --- PARAÍBA ---
  {
    id: 'pb-caminho',
    bancaId: 'global',
    nome: 'Caminho da Sorte',
    stateName: 'Paraíba',
    stateCode: 'PB',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['10:00', '13:00', '15:00', '17:00', '19:00'])
  },
  // --- CEARÁ ---
  {
    id: 'ce-lotece',
    bancaId: 'global',
    nome: 'Lotece',
    stateName: 'Ceará',
    stateCode: 'CE',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['14:00', '19:00'])
  },
  // --- PERNAMBUCO ---
  {
    id: 'pe-popular',
    bancaId: 'global',
    nome: 'Popular PE',
    stateName: 'Pernambuco',
    stateCode: 'PE',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['11:00', '12:40', '14:00', '15:40', '17:00', '18:40'])
  },
  // --- PARANÁ ---
  {
    id: 'pr-ptpr',
    bancaId: 'global',
    nome: 'PT-PR',
    stateName: 'Paraná',
    stateCode: 'PR',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['11:00', '14:00', '18:00', '21:00'])
  },
  // --- RIO GRANDE DO NORTE ---
  {
    id: 'rn-natal',
    bancaId: 'global',
    nome: 'Natal RN',
    stateName: 'Rio Grande do Norte',
    stateCode: 'RN',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['11:00', '14:00', '18:00'])
  },
  // --- RIO GRANDE DO SUL ---
  {
    id: 'rs-gaucho',
    bancaId: 'global',
    nome: 'RS Gaúcha',
    stateName: 'Rio Grande do Sul',
    stateCode: 'RS',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['11:00', '14:00', '18:00'])
  },
  // --- SERGIPE ---
  {
    id: 'se-sergipe',
    bancaId: 'global',
    nome: 'Sergipe',
    stateName: 'Sergipe',
    stateCode: 'SE',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: createDias(['11:00', '14:00', '18:00'])
  }
];

export const INITIAL_GENERIC_LOTTERIES: GenericLotteryConfig[] = [
  {
    id: 'loteria-uruguai',
    nome: 'Loteria Uruguai',
    status: 'Ativa',
    horarios: [
      { dia: 'Segunda a Sexta', horas: '15:00, 21:00' },
      { dia: 'Sábado', horas: '21:00' }
    ],
    multiplicadores: [
      { modalidade: '3 Dígitos', multiplicador: '500' },
      { modalidade: '2 Dígitos', multiplicador: '70' },
      { modalidade: '1 Dígito', multiplicador: '7' }
    ]
  },
  {
    id: 'seninha',
    nome: 'Seninha',
    status: 'Ativa',
    horarios: [{ dia: 'Todos os dias', horas: '20:00' }],
    multiplicadores: [
      { modalidade: 'SENINHA 14D', multiplicador: '5000' },
      { modalidade: 'SENINHA 15D', multiplicador: '3500' },
      { modalidade: 'SENINHA 16D', multiplicador: '2000' },
      { modalidade: 'SENINHA 17D', multiplicador: '1500' },
      { modalidade: 'SENINHA 18D', multiplicador: '850' },
      { modalidade: 'SENINHA 19D', multiplicador: '650' },
      { modalidade: 'SENINHA 20D', multiplicador: '500' },
      { modalidade: 'SENINHA 25D', multiplicador: '110' },
      { modalidade: 'SENINHA 30D', multiplicador: '28' },
      { modalidade: 'SENINHA 35D', multiplicador: '8' },
      { modalidade: 'SENINHA 40D', multiplicador: '5' }
    ]
  },
  {
    id: 'quininha',
    nome: 'Quininha',
    status: 'Ativa',
    horarios: [{ dia: 'Todos os dias', horas: '20:00' }],
    multiplicadores: [
      { modalidade: 'QUININHA 13D', multiplicador: '5000' },
      { modalidade: 'QUININHA 14D', multiplicador: '3900' },
      { modalidade: 'QUININHA 15D', multiplicador: '2700' },
      { modalidade: 'QUININHA 16D', multiplicador: '2200' },
      { modalidade: 'QUININHA 17D', multiplicador: '1600' },
      { modalidade: 'QUININHA 18D', multiplicador: '1100' },
      { modalidade: 'QUININHA 19D', multiplicador: '800' },
      { modalidade: 'QUININHA 20D', multiplicador: '700' },
      { modalidade: 'QUININHA 25D', multiplicador: '180' },
      { modalidade: 'QUININHA 30D', multiplicador: '65' },
      { modalidade: 'QUININHA 35D', multiplicador: '29' },
      { modalidade: 'QUININHA 40D', multiplicador: '10' },
      { modalidade: 'QUININHA 45D', multiplicador: '7' }
    ]
  },
  {
    id: 'lotinha',
    nome: 'Lotinha',
    status: 'Ativa',
    horarios: [{ dia: 'Todos os dias', horas: '20:00' }],
    multiplicadores: [
      { modalidade: 'LOTINHA 16D', multiplicador: '5000' },
      { modalidade: 'LOTINHA 17D', multiplicador: '200' },
      { modalidade: 'LOTINHA 18D', multiplicador: '100' },
      { modalidade: 'LOTINHA 19D', multiplicador: '50' },
      { modalidade: 'LOTINHA 20D', multiplicador: '25' },
      { modalidade: 'LOTINHA 21D', multiplicador: '15' },
      { modalidade: 'LOTINHA 22D', multiplicador: '8' }
    ]
  }
];
