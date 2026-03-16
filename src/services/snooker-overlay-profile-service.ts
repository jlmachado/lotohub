/**
 * @fileOverview Definição de perfis de overlay para reconhecimento de placar.
 * Mapeia as coordenadas (ROI) onde o placar fica na tela para cada tipo de transmissão.
 */

export interface ScoreOverlayProfile {
  id: string;
  name: string;
  roi: {
    top: number;    // % do topo da tela
    left: number;   // % da esquerda
    width: number;  // % da largura
    height: number; // % da altura
  };
  zones: {
    playerA: { left: number; top: number; width: number; height: number };
    playerB: { left: number; top: number; width: number; height: number };
    scoreA: { left: number; top: number; width: number; height: number };
    scoreB: { left: number; top: number; width: number; height: number };
    frame?: { left: number; top: number; width: number; height: number };
  };
}

const PROFILES: Record<string, ScoreOverlayProfile> = {
  tv_snooker_brasil: {
    id: 'tv_snooker_brasil',
    name: 'TV Snooker Brasil (Top Banner)',
    roi: { top: 2, left: 10, width: 80, height: 12 },
    zones: {
      playerA: { left: 5, top: 0, width: 30, height: 100 },
      scoreA: { left: 35, top: 0, width: 10, height: 100 },
      scoreB: { left: 55, top: 0, width: 10, height: 100 },
      playerB: { left: 65, top: 0, width: 30, height: 100 },
      frame: { left: 45, top: 0, width: 10, height: 100 }
    }
  },
  junior_snooker: {
    id: 'junior_snooker',
    name: 'Junior Snooker (Bottom Bar)',
    roi: { top: 82, left: 5, width: 90, height: 10 },
    zones: {
      playerA: { left: 10, top: 0, width: 25, height: 100 },
      scoreA: { left: 35, top: 0, width: 10, height: 100 },
      scoreB: { left: 55, top: 0, width: 10, height: 100 },
      playerB: { left: 65, top: 0, width: 25, height: 100 },
      frame: { left: 45, top: 0, width: 10, height: 100 }
    }
  },
  generic: {
    id: 'generic',
    name: 'Perfil Genérico (Centro-Topo)',
    roi: { top: 5, left: 25, width: 50, height: 15 },
    zones: {
      playerA: { left: 0, top: 0, width: 35, height: 100 },
      scoreA: { left: 35, top: 0, width: 15, height: 100 },
      scoreB: { left: 50, top: 0, width: 15, height: 100 },
      playerB: { left: 65, top: 0, width: 35, height: 100 }
    }
  }
};

export class SnookerOverlayProfileService {
  static getProfile(id?: string): ScoreOverlayProfile {
    return PROFILES[id || 'generic'] || PROFILES.generic;
  }

  static getAllProfiles(): ScoreOverlayProfile[] {
    return Object.values(PROFILES);
  }
}
