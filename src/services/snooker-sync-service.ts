/**
 * @fileOverview Orquestrador de sincronização inteligente para a Sinuca.
 * Implementa algoritmos de deduplicação por hash e proteção de override manual.
 */

import { SnookerYoutubeService, YoutubeApiResponse } from './snooker-youtube-service';
import { SnookerParserService } from './snooker-parser-service';
import { SnookerChannel } from '@/context/AppContext';
import { getStorageItem } from '@/utils/safe-local-storage';

export interface SyncSummary {
  itemsRead: number;
  validItems: number;
  created: number;
  updated: number;
  ignored: number;
  duplicates: number;
  failures: number;
  timestamp: string;
}

export class SnookerSyncService {
  /**
   * Gera um hash estável para detectar o mesmo evento em diferentes URLs ou títulos.
   */
  static generateSyncHash(videoId: string, title: string, playerA: string, playerB: string, date: string): string {
    const norm = (s: string) => SnookerParserService.normalizeForHash(s);
    // Combina ID do vídeo com normalização de jogadores e data para evitar duplicidade lógica
    return `hash_${videoId}_${norm(playerA)}_${norm(playerB)}_${date.split('T')[0]}`;
  }

  /**
   * Executa o ciclo de sincronização e retorna um resumo detalhado para logs.
   */
  static async sync(currentChannels: SnookerChannel[], bancaId: string): Promise<{ 
    updatedChannels: SnookerChannel[], 
    summary: SyncSummary 
  }> {
    const summary: SyncSummary = {
      itemsRead: 0,
      validItems: 0,
      created: 0,
      updated: 0,
      ignored: 0,
      duplicates: 0,
      failures: 0,
      timestamp: new Date().toISOString()
    };

    const automationSettings = getStorageItem('app:snooker_automation:v1', { keepManualOdds: true });

    try {
      const youtubeData = await SnookerYoutubeService.fetchChannelData();
      summary.itemsRead = youtubeData.length;

      const newChannelsList = [...currentChannels];

      youtubeData.forEach((yt: YoutubeApiResponse) => {
        try {
          const videoId = yt.id.videoId;
          if (!videoId) {
            summary.failures++;
            return;
          }

          const parsed = SnookerParserService.parse(yt.snippet.title, yt.snippet.description);
          summary.validItems++;

          // Geração de Hash de Sincronização
          const scheduledAt = yt.snippet.scheduledStartTime || new Date().toISOString();
          const syncHash = this.generateSyncHash(videoId, yt.snippet.title, parsed.playerA, parsed.playerB, scheduledAt);
          
          // Busca por duplicidade (VideoId ou Hash)
          const existingIdx = newChannelsList.findIndex(c => 
            c.sourceVideoId === videoId || 
            c.syncHash === syncHash ||
            c.embedId === videoId ||
            c.youtubeUrl.includes(videoId)
          );

          let status: SnookerChannel['status'] = 'scheduled';
          if (yt.snippet.liveBroadcastContent === 'live') {
            status = 'live';
          } else if (yt.snippet.liveBroadcastContent === 'none') {
            status = 'finished';
          }

          const startTime = new Date(scheduledAt).getTime();
          if (status === 'scheduled' && startTime > 0) {
            const diffMin = (startTime - Date.now()) / 60000;
            if (diffMin > 0 && diffMin <= 60) status = 'imminent';
          }

          if (existingIdx >= 0) {
            const existing = newChannelsList[existingIdx];
            
            // Regra: Não sobrescrever se houver trava manual
            if (existing.isManualOverride) {
              if (status !== existing.status) {
                newChannelsList[existingIdx] = { ...existing, status, updatedAt: new Date().toISOString() };
                summary.updated++;
              } else {
                summary.ignored++;
              }
              return;
            }

            // Atualização de campos automáticos
            const updates: Partial<SnookerChannel> = {
              status,
              syncHash,
              title: parsed.eventTitle,
              tournamentName: parsed.tournamentName,
              location: parsed.location,
              modality: parsed.modality,
              phase: parsed.phase,
              prize: parsed.prize,
              prizeLabel: parsed.prizeLabel,
              metadataConfidence: parsed.confidence,
              parserNotes: parsed.notes,
              thumbnailUrl: yt.snippet.thumbnails.medium.url,
              sourceStatus: 'synced',
              updatedAt: new Date().toISOString(),
              autoUpdatedAt: new Date().toISOString()
            };

            // Proteção de Odds
            if (!automationSettings.keepManualOdds) {
               updates.odds = { A: 1.95, B: 1.95, D: 3.20 };
            }

            newChannelsList[existingIdx] = { ...existing, ...updates };
            summary.updated++;
          } else {
            // Criação de canal automático
            const newChannel: SnookerChannel = {
              id: `chan-auto-${videoId}`,
              syncHash,
              title: parsed.eventTitle,
              description: yt.snippet.description.substring(0, 250),
              youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
              embedId: videoId,
              sourceVideoId: videoId,
              source: 'youtube',
              sourceType: yt.snippet.liveBroadcastContent === 'none' ? 'video' : 'live',
              sourceStatus: 'synced',
              autoCreated: true,
              scheduledAt,
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
              modality: parsed.modality,
              phase: parsed.phase,
              prize: parsed.prize,
              prizeLabel: parsed.prizeLabel,
              metadataConfidence: parsed.confidence,
              parserNotes: parsed.notes,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            newChannelsList.unshift(newChannel);
            summary.created++;
          }
        } catch (itemError) {
          summary.failures++;
          console.warn('[SnookerSyncService] Erro em item individual:', itemError);
        }
      });

      return {
        updatedChannels: newChannelsList,
        summary
      };
    } catch (e: any) {
      console.error('[SnookerSyncService] Erro fatal no sync:', e.message);
      throw e;
    }
  }
}
