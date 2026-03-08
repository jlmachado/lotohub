/**
 * @fileOverview Utilitário para gerenciamento de branding (marca) do sistema.
 */

export interface BrandingData {
  logoDataUrl: string | null;
  logoUpdatedAt: number;
}

const BRANDING_KEY = 'app:branding:v1';

export const getBranding = (): BrandingData => {
  if (typeof window === 'undefined') return { logoDataUrl: null, logoUpdatedAt: 0 };
  const stored = localStorage.getItem(BRANDING_KEY);
  if (!stored) return { logoDataUrl: null, logoUpdatedAt: 0 };
  try {
    return JSON.parse(stored);
  } catch (e) {
    return { logoDataUrl: null, logoUpdatedAt: 0 };
  }
};

export const saveBranding = (data: Partial<BrandingData>) => {
  if (typeof window === 'undefined') return;
  const current = getBranding();
  const updated = { ...current, ...data, logoUpdatedAt: Date.now() };
  localStorage.setItem(BRANDING_KEY, JSON.stringify(updated));
  // Dispara um evento customizado para notificar componentes na mesma aba
  window.dispatchEvent(new Event('branding-update'));
};

export const getLogoSrc = (): string => {
  const branding = getBranding();
  return branding.logoDataUrl || '/logo-lotohub.png';
};
