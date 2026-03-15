/**
 * @fileOverview Orquestrador de Sincronização Multicanal Robusto.
 * Agora utiliza dados REAIS do YouTube e aplica barreiras de integridade rigorosas.
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
      // 1. Busca dados REAIS da YouTube API via proxy interno seguro
      const rawData = await SnookerYoutubeService.fetchChannelData(source.channelHandle);
      summary.itemsRead = rawData.length;

      let newChannelsList = [...currentChannels];

      rawData.forEach((ytItem: any) => {
        try {
          const normalized = SnookerYoutubeService.normalizeItem(ytItem);
          
          // 2. Barreira de Qualidade: Ignora ou marca erro se o vídeo for inválido
          if (!normalized || !normalized.validation?.valid) {
            summary.invalidVideos++;
            return;
          }

          const parsed = SnookerParserService.parse(normalized.title, normalized.description, source.parseProfile);
          
          // 3. Identificação Única Estável baseada no ID REAL do YouTube
          // Isso evita duplicatas e IDs simulados no banco local
          const uniqueId = `yt_${normalized.embedId}`;
          const existingIdx = newChannelsList.findIndex(c => c.id === uniqueId);

          // Determinar status lógico do sistema baseado no status real da transmissão
          let internalStatus: SnookerChannel['status'] = 'scheduled';
          if (normalized.status === 'live') internalStatus = 'live';
          else if (normalized.status === 'upcoming') internalStatus = 'imminent';
          else if (normalized.status === 'video') internalStatus = 'finished';

          if (existingIdx >= 0) {
            const existing = newChannelsList[existingIdx];
            
            // Proteção de Override Manual: Admin sempre manda mais que o robô
            if (existing.isManualOverride) {
              if (internalStatus !== existing.status) {
                newChannelsList[existingIdx] = { 
                  ...existing, 
                  status: internalStatus, 
                  updatedAt: new Date().toISOString() 
                };
                summary.updated++;
              }
              return;
            }

            // Atualização de dados sincronizados reais
            newChannelsList[existingIdx] = {
              ...existing,
              status: internalStatus,
              title: parsed.eventTitle,
              tournamentName: parsed.tournamentName,
              thumbnailUrl: normalized.thumbnailUrl,
              metadataConfidence: parsed.confidence,
              updatedAt: new Date().toISOString(),
              sourceStatus: 'synced'
            };
            summary.updated++;
          } else if (source.autoCreateChannels) {
            // 4. Criação de Novo Canal baseado em vídeo REAL e VÁLIDO
            const newChannel: SnookerChannel = {
              id: uniqueId,
              title: parsed.eventTitle,
              description: normalized.description.substring(0, 200),
              youtubeUrl: normalized.youtubeUrl,
              embedId: normalized.embedId,
              sourceVideoId: normalized.embedId,
              source: 'youtube',
              sourceName: source.name,
              sourceId: source.id,
              originPriority: source.priority,
              sourceStatus: source.requireAdminApproval ? 'detected' : 'synced',
              autoCreated: true,
              scheduledAt: normalized.publishedAt,
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
              thumbnailUrl: normalized.thumbnailUrl,
              tournamentName: parsed.tournamentName,
              prizeLabel: parsed.prizeLabel,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            newChannelsList.unshift(newChannel);
            summary.created++;
          }
        } catch (e) {
          summary.failures++;
        }
      });

      // 5. Re-ranking de prioridade para garantir que a transmissão mais importante seja a principal
      newChannelsList = SnookerPriorityService.rankItems(newChannelsList);

      return { updatedChannels: newChannelsList, summary };
    } catch (e) {
      throw e;
    }
  }
}
