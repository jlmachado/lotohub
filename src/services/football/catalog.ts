import { CatalogLeague } from './types';

/**
 * @fileOverview Catálogo manual das principais ligas brasileiras.
 * Serve como fonte primária para garantir cobertura mesmo quando a busca da API falha.
 */

export const BRAZILIAN_LEAGUE_CATALOG: CatalogLeague[] = [
  // --- NACIONAIS PRINCIPAIS ---
  {
    internalId: 'br-serie-a',
    nomeExibicao: 'Brasileirão Série A',
    possiveisNomesNaAPI: ['Brazilian Serie A', 'Brazil Serie A', 'Campeonato Brasileiro Série A'],
    idLeague: '4390',
    categoria: 'NACIONAL',
    genero: 'Male',
    divisao: '1',
    prioridade: 1,
    ativa: true,
    recomendada: true,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'br-serie-b',
    nomeExibicao: 'Brasileirão Série B',
    possiveisNomesNaAPI: ['Brazilian Serie B', 'Brazil Serie B', 'Campeonato Brasileiro Série B'],
    idLeague: '4401',
    categoria: 'NACIONAL',
    genero: 'Male',
    divisao: '2',
    prioridade: 2,
    ativa: true,
    recomendada: true,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'br-serie-c',
    nomeExibicao: 'Brasileirão Série C',
    possiveisNomesNaAPI: ['Brazilian Serie C', 'Brazil Serie C', 'Campeonato Brasileiro Série C'],
    idLeague: '4743',
    categoria: 'NACIONAL',
    genero: 'Male',
    divisao: '3',
    prioridade: 3,
    ativa: false,
    recomendada: true,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'br-serie-d',
    nomeExibicao: 'Brasileirão Série D',
    possiveisNomesNaAPI: ['Brazil Serie D', 'Brazilian Serie D', 'Campeonato Brasileiro Série D'],
    idLeague: '4844',
    categoria: 'NACIONAL',
    genero: 'Male',
    divisao: '4',
    prioridade: 4,
    ativa: false,
    recomendada: true,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'br-copa-brasil',
    nomeExibicao: 'Copa do Brasil',
    possiveisNomesNaAPI: ['Copa do Brasil', 'Brazilian Cup'],
    idLeague: '4482',
    categoria: 'NACIONAL',
    genero: 'Male',
    divisao: 'Cup',
    prioridade: 5,
    ativa: true,
    recomendada: true,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'br-feminino',
    nomeExibicao: 'Brasileiro Feminino',
    possiveisNomesNaAPI: ['Brazil Brasileiro Women', 'Campeonato Brasileiro de Futebol Feminino'],
    idLeague: '4638',
    categoria: 'FEMININO',
    genero: 'Female',
    divisao: '1',
    prioridade: 6,
    ativa: false,
    recomendada: true,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },

  // --- ESTADUAIS PRINCIPAIS ---
  {
    internalId: 'est-paulista',
    nomeExibicao: 'Campeonato Paulista',
    possiveisNomesNaAPI: ['Campeonato Paulista', 'Brazilian Paulista', 'Paulista A1'],
    idLeague: '4637',
    categoria: 'ESTADUAL',
    genero: 'Male',
    divisao: 'State',
    prioridade: 10,
    ativa: true,
    recomendada: true,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'est-carioca',
    nomeExibicao: 'Campeonato Carioca',
    possiveisNomesNaAPI: ['Campeonato Carioca', 'Brazilian Carioca'],
    idLeague: '4636',
    categoria: 'ESTADUAL',
    genero: 'Male',
    divisao: 'State',
    prioridade: 11,
    ativa: true,
    recomendada: true,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'est-mineiro',
    nomeExibicao: 'Campeonato Mineiro',
    possiveisNomesNaAPI: ['Campeonato Mineiro', 'Brazilian Mineiro'],
    idLeague: '4639',
    categoria: 'ESTADUAL',
    genero: 'Male',
    divisao: 'State',
    prioridade: 12,
    ativa: false,
    recomendada: true,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'est-gaucho',
    nomeExibicao: 'Campeonato Gaúcho',
    possiveisNomesNaAPI: ['Campeonato Gaúcho', 'Brazilian Gaucho'],
    idLeague: '4640',
    categoria: 'ESTADUAL',
    genero: 'Male',
    divisao: 'State',
    prioridade: 13,
    ativa: false,
    recomendada: true,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'est-baiano',
    nomeExibicao: 'Campeonato Baiano',
    possiveisNomesNaAPI: ['Campeonato Baiano', 'Brazilian Baiano'],
    idLeague: '4845',
    categoria: 'ESTADUAL',
    genero: 'Male',
    divisao: 'State',
    prioridade: 14,
    ativa: false,
    recomendada: false,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'est-pernambucano',
    nomeExibicao: 'Campeonato Pernambucano',
    possiveisNomesNaAPI: ['Campeonato Pernambucano', 'Brazilian Pernambucano'],
    idLeague: '4846',
    categoria: 'ESTADUAL',
    genero: 'Male',
    divisao: 'State',
    prioridade: 15,
    ativa: false,
    recomendada: false,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'est-paranaense',
    nomeExibicao: 'Campeonato Paranaense',
    possiveisNomesNaAPI: ['Campeonato Paranaense', 'Brazilian Paranaense'],
    idLeague: '4847',
    categoria: 'ESTADUAL',
    genero: 'Male',
    divisao: 'State',
    prioridade: 16,
    ativa: false,
    recomendada: false,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  },
  {
    internalId: 'est-catarinense',
    nomeExibicao: 'Campeonato Catarinense',
    possiveisNomesNaAPI: ['Campeonato Catarinense', 'Brazilian Catarinense'],
    idLeague: '4848',
    categoria: 'ESTADUAL',
    genero: 'Male',
    divisao: 'State',
    prioridade: 17,
    ativa: false,
    recomendada: false,
    statusValidacao: 'NAO_TESTADA',
    statusCobertura: 'A_CONFIRMAR'
  }
];
