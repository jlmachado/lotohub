/**
 * @fileOverview Serviço de sincronização e parsing para o canal TV Snooker Brasil.
 * Responsável por ler dados de transmissões e converter em canais de aposta.
 */

import { SnookerChannel } from "@/context/AppContext";

export interface YoutubeLiveInfo {
  id: string;
  title: string;
  description: string;
  thumbnails: { medium: { url: string } };
  scheduledStartTime?: string;
  actualStartTime?: string;
  liveBroadcastContent: 'live' | 'upcoming' | 'none';
}

export class SnookerYoutubeSync {
  /**
   * Extrai nomes dos jogadores e torneio a partir do título da live.
   * Padrões comuns: "JOGADOR A X JOGADOR B - NOME DO TORNEIO"
   */
  static parseTitle(title: string) {
    const cleanTitle = title.replace(/AO VIVO|LIVE|SN0OKER|SINUCA/gi, '').trim();
    
    // Regex para capturar Jogador A vs/x Jogador B
    const vsRegex = /(.+?)\s+(?:X|VS|VERSUS)\s+(.+?)(?:\s+[-|]\s+(.*))?$/i;
    const match = cleanTitle.match(vsRegex);

    if (match) {
      return {
        playerA: match[1].trim(),
        playerB: match[2].trim(),
        eventTitle: (match[3] || 'Torneio Snooker Brasil').trim()
      };
    }

    return {
      playerA: 'Jogador A',
      playerB: 'Jogador B',
      eventTitle: cleanTitle || 'Desafio de Sinuca'
    };
  }

  /**
   * Converte um objeto do YouTube para o modelo SnookerChannel do sistema.
   */
  static mapToSnookerChannel(yt: any): Partial<SnookerChannel> {
    const { playerA, playerB, eventTitle } = this.parseTitle(yt.snippet.title);
    
    const status: SnookerChannel['status'] = 
      yt.snippet.liveBroadcastContent === 'live' ? 'live' : 
      yt.snippet.liveBroadcastContent === 'upcoming' ? 'scheduled' : 'finished';

    return {
      title: eventTitle,
      description: yt.snippet.description.substring(0, 200),
      youtubeUrl: `https://www.youtube.com/watch?v=${yt.id.videoId || yt.id}`,
      embedId: yt.id.videoId || yt.id,
      scheduledAt: yt.snippet.scheduledStartTime || new Date().toISOString(),
      startedAt: yt.snippet.actualStartTime,
      status,
      playerA: { name: playerA, level: 5 },
      playerB: { name: playerB, level: 5 },
      scoreA: 0,
      scoreB: 0,
      odds: { A: 1.95, B: 1.95, D: 3.20 }, // Odds padrão equilibradas
      houseMargin: 8,
      bestOf: 9,
      priority: 10,
      enabled: true
    };
  }
}
