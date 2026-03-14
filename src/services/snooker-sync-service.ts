/**
 * @fileOverview Orquestrador de sincronização Multicanal de Sinuca.
 * Reforçado com validação rigorosa de YouTube IDs e proteção de canais manuais.
 */

import { SnookerYoutubeService } from './snooker-youtube-service';
import { SnookerParserService } from './snooker-parser-service';
import { SnookerPriorityService } from './snooker-priority-service';
import { SnookerChannel, SnookerAutomationSource, SnookerAutomationSettings } from '@/context/AppContext';
import { isValidYoutubeVideoId, buildYoutubeWatchUrl } from '@/utils/youtube';

export interface SyncSummary {
  itemsRead: number;
  created: number;
  updated: number;
  failures: number;
  invalidVideos: number;
  primaryElectedId: string | null;
}

export class SnookerSyncService {
  static async sync(
    currentChannels: SnookerChannel[], 
    bancaId: string,
    source: SnookerAutomationSource,
    settings: SnookerAutomationSettings
  ): Promise<{ updatedChannels: SnookerChannel[], summary: SyncSummary }> {
    const summary: SyncSummary = { itemsRead: 0, created: 0, updated: 0, failures: 0, invalidVideos: 0, primaryElectedId: null };
    
    try {
      const youtubeData = await SnookerYoutubeService.fetchChannelData(source.channelUrl);
      summary.itemsRead = youtubeData.length;

      let newChannelsList = [...currentChannels];

      youtubeData.forEach((yt: any) => {
        try {
          const videoId = yt.id.videoId;
          
          // 1. VALIDAÇÃO DE SEGURANÇA: Bloqueia IDs simulados ou inválidos
          if (!isValidYoutubeVideoId(videoId)) { 
            summary.invalidVideos++; 
            return; 
          }

          const parsed = SnookerParserService.parse(yt.snippet.title, yt.snippet.description, source.parseProfile);
          const scheduledAt = yt.snippet.scheduledStartTime || new Date().toISOString();
          
          // 2. IDENTIFICADOR ÚNICO ESTÁVEL: Baseado no videoId real
          const uniqueId = `yt_${videoId}`;
          const existingIdx = newChannelsList.findIndex(c => c.id === uniqueId || c.sourceVideoId === videoId);

          let status: SnookerChannel['status'] = 'scheduled';
          if (yt.snippet.liveBroadcastContent === 'live') status = 'live';
          else if (yt.snippet.liveBroadcastContent === 'none') status = 'finished';

          const startTime = new Date(scheduledAt).getTime();
          if (status === 'scheduled' && (startTime - Date.now()) < 3600000) status = 'imminent';

          if (existingIdx >= 0) {
            const existing = newChannelsList[existingIdx];
            
            // 3. PROTEÇÃO DE OVERRIDE: Respeita edições manuais do administrador
            if (existing.isManualOverride) {
              if (status !== existing.status) {
                newChannelsList[existingIdx] = { ...existing, status, updatedAt: new Date().toISOString() };
                summary.updated++;
              }
              return;
            }

            // Atualização de metadados sincronizados
            newChannelsList[existingIdx] = {
              ...existing,
              status,
              title: parsed.eventTitle,
              tournamentName: parsed.tournamentName,
              modality: parsed.modality,
              phase: parsed.phase,
              prizeLabel: parsed.prizeLabel,
              thumbnailUrl: yt.snippet.thumbnails.medium.url,
              contentType: parsed.contentType,
              metadataConfidence: parsed.confidence,
              sourceStatus: 'synced',
              updatedAt: new Date().toISOString()
            };
            summary.updated++;
          } else if (source.autoCreateChannels) {
            // 4. CRIAÇÃO DE CANAL VÁLIDO
            const newChannel: SnookerChannel = {
              id: uniqueId,
              title: parsed.eventTitle,
              description: yt.snippet.description.substring(0, 200),
              youtubeUrl: buildYoutubeWatchUrl(videoId),
              embedId: videoId,
              sourceVideoId: videoId,
              source: 'youtube',
              sourceName: source.name,
              sourceId: source.id,
              originPriority: source.priority,
              sourceStatus: source.requireAdminApproval ? 'detected' : 'synced',
              autoCreated: true,
              scheduledAt,
              status,
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
              thumbnailUrl: yt.snippet.thumbnails.medium.url,
              tournamentName: parsed.tournamentName,
              modality: parsed.modality,
              phase: parsed.phase,
              contentType: parsed.contentType,
              metadataConfidence: parsed.confidence,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isFeatured: source.markAsFeatured,
              bettingAvailability: 'all'
            };
            newChannelsList.unshift(newChannel);
            summary.created++;
          }
        } catch (e) { 
          summary.failures++; 
        }
      });

      // 5. RANKING E ELEIÇÃO: Escolhe a melhor transmissão válida para a home
      newChannelsList = SnookerPriorityService.rankItems(newChannelsList);

      return { updatedChannels: newChannelsList, summary };
    } catch (e) { 
      throw e; 
    }
  }
}
