/**
 * @fileOverview Barramento de eventos global para sincronização reativa.
 */

export const APP_EVENTS = {
  DATA_CHANGED: 'app:data-changed',
  AUTH_CHANGED: 'app:auth-changed',
  LEDGER_CHANGED: 'app:ledger-changed',
  BANCAS_CHANGED: 'app:bancas-changed'
};

export const notifyDataChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(APP_EVENTS.DATA_CHANGED));
  }
};

export const notifyAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(APP_EVENTS.AUTH_CHANGED));
  }
};
