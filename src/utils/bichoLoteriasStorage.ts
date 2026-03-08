/**
 * @fileOverview Utilitário de persistência para as loterias do Jogo do Bicho.
 * Lida com carregamento, salvamento e herança de loterias globais.
 */

import { JDBLoteria } from "@/context/AppContext";

const NEW_KEY = 'jogo_bicho:loterias:v1';
const OLD_KEYS = ["loteriasBicho", "bichoLoterias", "loterias_jogo_bicho"];

/**
 * Retorna a estrutura da loteria padrão "Rio De Janeiro".
 */
const getRioDeJaneiroDefault = (): JDBLoteria => {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const times = ['09:00', '09:15', '11:15', '14:15', '16:15', '18:15'];
  
  const modalidadesPadrao = [
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

  return {
    id: 'rio-de-janeiro',
    bancaId: 'global', // Alterado para global para propagar para todos
    nome: 'Rio De Janeiro',
    modalidades: modalidadesPadrao,
    dias: days.reduce((acc, dia) => ({
      ...acc,
      [dia]: { selecionado: true, horarios: times }
    }), {})
  };
};

/**
 * Normaliza uma loteria para garantir que ela siga o contrato atual.
 */
export const normalizeBichoLoteria = (loteria: any): JDBLoteria => {
  return {
    ...loteria,
    id: loteria.id || loteria.nome?.toLowerCase().replace(/\s+/g, '-') || Date.now().toString(),
    bancaId: loteria.bancaId || 'global', // Assume global se não houver banca vinculada
    modalidades: loteria.modalidades || loteria.multiplicadores || [],
    dias: loteria.dias || {}
  };
};

/**
 * Carrega as loterias do localStorage.
 */
export const loadBichoLoterias = (): JDBLoteria[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(NEW_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeBichoLoteria);
      }
    } catch (e) {
      console.error("Erro ao processar loterias do Jogo do Bicho:", e);
    }
  }
  
  // Se nada for encontrado, retorna a loteria padrão Rio De Janeiro
  const defaults = [getRioDeJaneiroDefault()];
  saveBichoLoterias(defaults);
  return defaults;
};

/**
 * Salva a lista completa de loterias no localStorage.
 */
export const saveBichoLoterias = (loterias: JDBLoteria[]) => {
  if (typeof window === 'undefined') return;
  const normalized = loterias.map(normalizeBichoLoteria);
  localStorage.setItem(NEW_KEY, JSON.stringify(normalized));
};

/**
 * Garante que a loteria modelo 'Rio De Janeiro' exista no sistema.
 */
export const ensureDefaultBichoLoterias = () => {
  loadBichoLoterias();
};
