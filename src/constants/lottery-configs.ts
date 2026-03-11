/**
 * @fileOverview Configurações padrão (seeds) para todas as modalidades de loteria.
 */

import { JDBLoteria, GenericLotteryConfig } from "@/context/AppContext";

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
  {
    id: 'rio-de-janeiro',
    bancaId: 'default',
    nome: 'Rio De Janeiro',
    modalidades: DEFAULT_JDB_MODALITIES,
    dias: {
      'Segunda': { selecionado: true, horarios: ['09:00', '11:00', '14:00', '16:00', '18:00', '21:00'] },
      'Terça': { selecionado: true, horarios: ['09:00', '11:00', '14:00', '16:00', '18:00', '21:00'] },
      'Quarta': { selecionado: true, horarios: ['09:00', '11:00', '14:00', '16:00', '18:00', '21:00'] },
      'Quinta': { selecionado: true, horarios: ['09:00', '11:00', '14:00', '16:00', '18:00', '21:00'] },
      'Sexta': { selecionado: true, horarios: ['09:00', '11:00', '14:00', '16:00', '18:00', '21:00'] },
      'Sábado': { selecionado: true, horarios: ['09:00', '11:00', '14:00', '16:00', '18:00', '21:00'] },
      'Domingo': { selecionado: true, horarios: ['11:00', '14:00'] },
    }
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
