/**
 * @fileOverview Orquestrador de Sincronização Multicanal Robusto.
 * Corrigido para ativar canais automaticamente e evitar duplicidade.
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
          const normalized = SnookerYoutubeService.normalizeItem(ytItem);
          
          if (!normalized) {
            summary.invalidVideos++;
            return;
          }

          const parsed = SnookerParserService.parse(normalized.title, normalized.description, source.parseProfile);
          
          // ID ESTÁVEL: Única forma de evitar duplicidade profissionalmente
          const uniqueId = `yt_${normalized.embedId}`;
          const existingIdx = newChannelsList.findIndex(c => c.id === uniqueId);

          let internalStatus: SnookerChannel['status'] = 'scheduled';
          if (normalized.status === 'live') internalStatus = 'live';
          else if (normalized.status === 'upcoming') internalStatus = 'imminent';
          else if (normalized.status === 'video') internalStatus = 'finished';

          if (existingIdx >= 0) {
            const existing = newChannelsList[existingIdx];
            
            // Se o admin editou manualmente, protegemos campos críticos
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

            // Atualização de metadados sincronizados
            newChannelsList[existingIdx] = {
              ...existing,
              status: internalStatus,
              title: parsed.eventTitle,
              tournamentName: parsed.tournamentName,
              thumbnailUrl: normalized.thumbnailUrl,
              metadataConfidence: parsed.confidence,
              updatedAt: new Date().toISOString(),
              sourceStatus: 'synced',
              // Ativamos se estava desativado mas agora é live/imminent
              enabled: existing.enabled || internalStatus === 'live' || internalStatus === 'imminent'
            };
            summary.updated++;
          } else if (source.autoCreateChannels) {
            // CRIAÇÃO DE NOVO CANAL
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
              // REGRA DE OURO: Habilitado se não exigir aprovação
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

      // Recalcula prioridade e ranking para garantir que o melhor live seja o topo
      newChannelsList = SnookerPriorityService.rankItems(newChannelsList);

      return { updatedChannels: newChannelsList, summary };
    } catch (e) {
      throw e;
    }
  }
}
