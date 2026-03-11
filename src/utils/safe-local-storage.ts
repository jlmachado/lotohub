/**
 * @fileOverview Utilitários para acesso seguro ao localStorage em ambiente Next.js.
 * Previne erros de build (SSR) e falhas de hidratação.
 */

export const getStorageItem = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`[SafeStorage] Erro ao ler chave "${key}":`, error);
    return fallback;
  }
};

export const setStorageItem = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[SafeStorage] Erro ao salvar chave "${key}":`, error);
  }
};

export const removeStorageItem = (key: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
};
