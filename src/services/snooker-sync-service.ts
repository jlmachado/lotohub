/**
 * @fileOverview Orquestrador de Sincronização Multicanal Robusto.
 * Atualizado para tratar corretamente liveConfidence e detecção híbrida.
 */

import { SnookerYoutubeService } from './snooker-youtube-service';
import { SnookerParserService } from './snooker-parser-service';
import { SnookerPriorityService } from './snooker-priority-service';
import { SnookerChannel, SnookerAutomationSource, SnookerAutomationSettings } from '@/context/AppContext';
import { isValidYoutubeVideoId } from '@/utils/youtube';

export interface SyncSummary {
  itemsRead: number;
  created: number;
  updated: number;
  failures: number;
  invalidVideos: number;
}

export class SnookerSyncService {
  static async sync(
    currentChannels: SnookerChannel[], 
    bancaId: string,
    source: SnookerAutomationSource,
    settings: SnookerAutomationSettings
  ): Promise<{ updatedChannels: SnookerChannel[], summary: SyncSummary }> {
    
    const summary: SyncSummary = { 
      itemsRead: 0, 
      created: 0, 
      updated: 0, 
      failures: 0, 
      invalidVideos: 0 
    };
    
    try {
      const rawData = await SnookerYoutubeService.fetchChannelData(source.channelId);
      summary.itemsRead = rawData.length;

      let newChannelsList = [...currentChannels];

      rawData.forEach((ytItem: any) => {
        try {
          const videoId = ytItem.videoId;
          
          if (!isValidYoutubeVideoId(videoId)) {
            summary.invalidVideos++;
            return;
          }

          const parsed = SnookerParserService.parse(ytItem.title, ytItem.description, source.parseProfile);
          
          const uniqueId = `yt_${videoId}`;
          const existingIdx = newChannelsList.findIndex(c => c.id === uniqueId);

          const scheduledAt = ytItem.publishedAt;
          const eventTime = new Date(scheduledAt);

          // Status baseado na confiança da detecção
          let internalStatus: SnookerChannel['status'] = 'scheduled';
          if (ytItem.liveConfidence === 'high') {
            internalStatus = 'live';
          } else if (ytItem.liveConfidence === 'medium') {
            // Se o título diz live mas a página do canal não confirmou, tratamos como iminente
            internalStatus = 'imminent';
          } else if (ytItem.sourceType === 'video') {
            internalStatus = 'finished';
          }

          // Janela de Aposta Padrão
          const bettingOpensAt = new Date(eventTime.getTime() - (120 * 60 * 1000)).toISOString();

          if (existingIdx >= 0) {
            const existing = newChannelsList[existingIdx];
            
            if (existing.isManualOverride) {
              // Mesmo em override, atualizamos o status se detectado como live real
              if (internalStatus === 'live' && existing.status !== 'live') {
                newChannelsList[existingIdx] = { 
                  ...existing, 
                  status: 'live',
                  updatedAt: new Date().toISOString() 
                };
                summary.updated++;
              }
              return;
            }

            newChannelsList[existingIdx] = {
              ...existing,
              status: internalStatus,
              title: parsed.eventTitle,
              tournamentName: parsed.tournamentName,
              thumbnailUrl: ytItem.thumbnailUrl,
              metadataConfidence: parsed.confidence,
              updatedAt: new Date().toISOString(),
              sourceStatus: 'synced',
              enabled: existing.enabled || internalStatus === 'live' || internalStatus === 'imminent',
              liveConfidence: ytItem.liveConfidence,
              detectionSource: ytItem.detectionSource
            };
            summary.updated++;
          } else if (source.autoCreateChannels) {
            const newChannel: SnookerChannel = {
              id: uniqueId,
              title: parsed.eventTitle,
              description: ytItem.description.substring(0, 200),
              youtubeUrl: ytItem.youtubeUrl,
              embedId: videoId,
              sourceVideoId: videoId,
              source: 'youtube',
              sourceName: source.name,
              sourceId: source.id,
              originPriority: source.priority,
              sourceStatus: source.requireAdminApproval ? 'detected' : 'synced',
              autoCreated: true,
              scheduledAt: scheduledAt,
              status: internalStatus,
              playerA: { name: parsed.playerA, level: 5 },
              playerB: { name: parsed.playerB, level: 5 },
              scoreA: 0,
              scoreB: 0,
              odds: { A: 1.95, B: 1.95, D: 3.20 },
              houseMargin: 8,
              bestOf: parsed.bestOf,
              priority: 10,
              enabled: !source.requireAdminApproval,
              bancaId,
              thumbnailUrl: ytItem.thumbnailUrl,
              tournamentName: parsed.tournamentName,
              prizeLabel: parsed.prizeLabel,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              bettingAvailability: 'all',
              bettingOpensAt: bettingOpensAt,
              liveConfidence: ytItem.liveConfidence,
              detectionSource: ytItem.detectionSource
            };
            newChannelsList.unshift(newChannel);
            summary.created++;
          }
        } catch (e) {
          summary.failures++;
        }
      });

      newChannelsList = SnookerPriorityService.rankItems(newChannelsList);

      return { updatedChannels: newChannelsList, summary };
    } catch (e) {
      throw e;
    }
  }
}
