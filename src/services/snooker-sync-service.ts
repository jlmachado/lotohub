/**
 * @fileOverview Orquestrador de sincronização entre YouTube e Canais do Sistema.
 * Implementa regras de deduplicação e proteção de dados manuais.
 */

import { SnookerYoutubeService, YoutubeApiResponse } from './snooker-youtube-service';
import { SnookerParserService } from './snooker-parser-service';
import { SnookerChannel } from '@/context/AppContext';

export interface SyncSummary {
  added: number;
  updated: number;
  total: number;
  errors: number;
}

export class SnookerSyncService {
  /**
   * Sincroniza a lista de canais baseada no YouTube.
   */
  static async sync(currentChannels: SnookerChannel[], bancaId: string): Promise<{ 
    updatedChannels: SnookerChannel[], 
    summary: SyncSummary 
  }> {
    let added = 0;
    let updated = 0;
    let errors = 0;

    try {
      const youtubeData = await SnookerYoutubeService.fetchChannelData();
      const newChannelsList = [...currentChannels];

      youtubeData.forEach((yt: YoutubeApiResponse) => {
        const videoId = yt.id.videoId;
        const parsed = SnookerParserService.parseTitle(yt.snippet.title);
        
        // Critério de deduplicação principal: videoId ou URL idêntica
        const existingIdx = newChannelsList.findIndex(c => 
          c.sourceVideoId === videoId || 
          c.embedId === videoId ||
          c.youtubeUrl.includes(videoId)
        );

        // Mapeamento de Status YouTube -> Sistema
        let status: SnookerChannel['status'] = 'scheduled';
        if (yt.snippet.liveBroadcastContent === 'live') {
          status = 'live';
        } else if (yt.snippet.liveBroadcastContent === 'none') {
          status = 'finished';
        }

        // Regra de "Imminent": Se faltar menos de 60 min para o início agendado
        const scheduledTime = yt.snippet.scheduledStartTime ? new Date(yt.snippet.scheduledStartTime).getTime() : 0;
        if (status === 'scheduled' && scheduledTime > 0) {
          const diffMin = (scheduledTime - Date.now()) / 60000;
          if (diffMin > 0 && diffMin <= 60) {
            status = 'imminent';
          }
        }

        if (existingIdx >= 0) {
          const existing = newChannelsList[existingIdx];
          
          // Respeita o override manual
          if (existing.isManualOverride) {
            // Apenas atualiza o status se for uma mudança para LIVE ou FINISHED
            if (status !== existing.status) {
              newChannelsList[existingIdx] = {
                ...existing,
                status,
                updatedAt: new Date().toISOString()
              };
              updated++;
            }
            return;
          }

          // Atualização automática de metadados
          newChannelsList[existingIdx] = {
            ...existing,
            status,
            title: parsed.eventTitle,
            tournamentName: parsed.tournamentName,
            location: parsed.location,
            sourceType: yt.snippet.liveBroadcastContent === 'none' ? 'video' : 'live',
            sourceStatus: 'synced',
            updatedAt: new Date().toISOString(),
            autoUpdatedAt: new Date().toISOString()
          };
          updated++;
        } else {
          // Criação de novo canal automático
          const newChannel: SnookerChannel = {
            id: `chan-auto-${videoId}`,
            title: parsed.eventTitle,
            description: yt.snippet.description.substring(0, 250),
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
            embedId: videoId,
            sourceVideoId: videoId,
            source: 'youtube',
            sourceType: yt.snippet.liveBroadcastContent === 'none' ? 'video' : 'live',
            sourceStatus: 'synced',
            autoCreated: true,
            scheduledAt: yt.snippet.scheduledStartTime || new Date().toISOString(),
            startedAt: yt.snippet.actualStartTime,
            status,
            playerA: { name: parsed.playerA, level: 5 },
            playerB: { name: parsed.playerB, level: 5 },
            scoreA: 0,
            scoreB: 0,
            odds: { A: 1.95, B: 1.95, D: 3.20 },
            houseMargin: 8,
            bestOf: parsed.bestOf,
            priority: 10,
            enabled: true,
            bancaId,
            thumbnailUrl: yt.snippet.thumbnails.medium.url,
            tournamentName: parsed.tournamentName,
            location: parsed.location,
            metadataConfidence: parsed.confidence,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          newChannelsList.unshift(newChannel);
          added++;
        }
      });

      return {
        updatedChannels: newChannelsList,
        summary: { added, updated, total: youtubeData.length, errors }
      };
    } catch (e) {
      console.error('[SnookerSyncService] Erro crítico:', e);
      return {
        updatedChannels: currentChannels,
        summary: { added: 0, updated: 0, total: 0, errors: 1 }
      };
    }
  }
}
