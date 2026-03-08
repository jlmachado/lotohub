'use server';
import FootballApiService from './football-api';
import type { FootballApiConfig, FootballChampionship, FootballTeam, FootballMatch } from '@/context/AppContext';

type Db = {
  championships: FootballChampionship[];
  teams: FootballTeam[];
  matches: FootballMatch[];
};

function calculateDefaultOdds() {
    return {
        home: 1.95,
        draw: 3.20,
        away: 3.40,
    };
}

export async function syncFootballData(
    currentData: Db,
    config: FootballApiConfig
): Promise<{ 
    newChampionships: FootballChampionship[]; 
    newTeams: FootballTeam[]; 
    newMatches: FootballMatch[];
    success: boolean;
    message: string;
}> {
    const apiService = new FootballApiService(config);

    // 1. Validar Conexão
    const isConnected = await apiService.validarConexao();
    if (!isConnected) {
        return { 
            newChampionships: [], newTeams: [], newMatches: [], 
            success: false, message: 'Falha na conexão. Verifique se o token é válido e se o plano permite acesso à API.' 
        };
    }

    try {
        // 2. Buscar Campeonatos disponíveis
        const apiChamps = await apiService.getCampeonatos();
        const newChampionships: FootballChampionship[] = [];
        const existingChampsMap = new Map(currentData.championships.map(c => [c.apiId, c]));

        for (const ac of apiChamps) {
            if (!existingChampsMap.has(ac.id)) {
                newChampionships.push({
                    id: `champ-${ac.id.toLowerCase()}`,
                    apiId: ac.id,
                    name: ac.name,
                    logo: ac.logo || '',
                    bancaId: config.bancaId,
                    importar: true
                });
            }
        }

        // 3. Buscar Jogos (7 dias à frente)
        const allApiMatches = await apiService.buscarTodosJogosFuturos();

        const newTeams: FootballTeam[] = [];
        const newMatches: FootballMatch[] = [];

        const existingTeamsSet = new Set(currentData.teams.map(t => t.id));
        const existingMatchesSet = new Set(currentData.matches.map(m => m.id));

        for (const jogo of allApiMatches) {
            // Upsert Teams (Mandante e Visitante)
            const teamsToProcess = [
                { id: jogo.homeTeamId, name: jogo.homeTeamName, logo: jogo.homeTeamLogo },
                { id: jogo.awayTeamId, name: jogo.awayTeamName, logo: jogo.awayTeamLogo }
            ];

            for (const t of teamsToProcess) {
                if (!existingTeamsSet.has(t.id)) {
                    newTeams.push({
                        id: t.id,
                        bancaId: config.bancaId,
                        name: t.name,
                        logo: t.logo || ''
                    });
                    existingTeamsSet.add(t.id);
                }
            }

            // New Match
            if (!existingMatchesSet.has(jogo.id)) {
                newMatches.push({
                    id: jogo.id,
                    bancaId: config.bancaId,
                    championshipApiId: jogo.championshipId,
                    homeTeamId: jogo.homeTeamId,
                    awayTeamId: jogo.awayTeamId,
                    dateTime: jogo.dateTime,
                    status: 'scheduled',
                    odds: calculateDefaultOdds(),
                    isImported: false
                });
                existingMatchesSet.add(jogo.id);
            }
        }

        const totalNews = newChampionships.length + newMatches.length;
        const msg = totalNews > 0 
            ? `Sincronização concluída: ${newChampionships.length} ligas e ${newMatches.length} partidas encontradas.`
            : 'Sincronização concluída. Nenhum dado novo encontrado para o período.';

        return { 
            newChampionships, newTeams, newMatches, 
            success: true, 
            message: msg
        };
    } catch (error: any) {
        console.error("Erro crítico na sincronização de futebol:", error);
        return { 
            newChampionships: [], newTeams: [], newMatches: [], 
            success: false, message: error.message || 'Ocorreu um erro inesperado durante a comunicação com a API.' 
        };
    }
}
