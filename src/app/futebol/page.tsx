'use client';

import { useMemo, useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BetSlipItem {
    id: string;
    match: any;
    pick: 'home' | 'draw' | 'away';
    pickLabel: string;
    odd: number;
    value: number;
}

const BetSlipItemComponent = ({ item, onRemove, onValueChange }: { item: BetSlipItem, onRemove: (id: string) => void, onValueChange: (id: string, value: number) => void }) => {
    
    const getBetItemClass = (pick: 'home' | 'draw' | 'away') => {
        if (pick === 'home') return 'casa';
        if (pick === 'draw') return 'empate';
        return 'fora';
    }

    return (
        <div className={`aposta-item ${getBetItemClass(item.pick)}`}>
            <div className="aposta-info">
                 <p className="aposta-jogo">{item.match.homeTeamName} vs {item.match.awayTeamName}</p>
                 <p className="aposta-mercado">Vencedor da Partida: <span className="font-bold">{item.pickLabel}</span></p>
                 <p className="aposta-odd">@{item.odd.toFixed(2)}</p>
            </div>
            <div className="aposta-actions">
                 <button className="remover-aposta" onClick={() => onRemove(item.id)}>&times;</button>
            </div>
            <div className="aposta-valor">
                <Input 
                    placeholder="Valor R$"
                    type="number" 
                    value={item.value || ''}
                    onChange={e => onValueChange(item.id, parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                />
            </div>
        </div>
    );
};

const FeaturedMatch = ({ match, betSlip, handleAddBet }: { match: any, betSlip: BetSlipItem[], handleAddBet: (match: any, pick: 'home' | 'draw' | 'away') => void }) => {
    if (!match) return null;

    // Simulate live data for demonstration
    const isLive = true; 
    const gameTime = 'Primeiro tempo 10:50';
    const scoreHome = 0;
    const scoreAway = 0;

    return (
        <div className="live-player">
            <div className="game-info">
                <span className="league">{match.championshipName}</span>
                {isLive && <span className="time">{gameTime}</span>}
            </div>
            <div className="scoreboard">
                <span className="team">{match.homeTeamName}</span>
                <span className="score">{scoreHome} : {scoreAway}</span>
                <span className="team">{match.awayTeamName}</span>
            </div>
             <Tabs defaultValue="vencedor" className="w-full market-tabs">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="vencedor">Vencedor</TabsTrigger>
                    <TabsTrigger value="gols" disabled>Gols</TabsTrigger>
                    <TabsTrigger value="handicap" disabled>Handicap</TabsTrigger>
                </TabsList>
                <TabsContent value="vencedor">
                    <div className="odds-container">
                        <button className={`odd-btn ${betSlip.find(b => b.id === `${match.id}-home`) ? 'active' : ''}`} onClick={() => handleAddBet(match, 'home')}>
                            <span className="odd-label">Casa</span>
                            <span className="odd-value">{match.odds.home.toFixed(2)}</span>
                        </button>
                        <button className={`odd-btn ${betSlip.find(b => b.id === `${match.id}-draw`) ? 'active' : ''}`} onClick={() => handleAddBet(match, 'draw')}>
                            <span className="odd-label">Empate</span>
                            <span className="odd-value">{match.odds.draw.toFixed(2)}</span>
                        </button>
                        <button className={`odd-btn ${betSlip.find(b => b.id === `${match.id}-away`) ? 'active' : ''}`} onClick={() => handleAddBet(match, 'away')}>
                            <span className="odd-label">Fora</span>
                            <span className="odd-value">{match.odds.away.toFixed(2)}</span>
                        </button>
                        <button className="odd-btn" disabled>
                            <span className="odd-label">Mais Mercados</span>
                            <span className="odd-value">+350</span>
                        </button>
                    </div>
                </TabsContent>
                 <TabsContent value="gols">
                     <div className="p-4 text-center text-white/50">Em breve</div>
                </TabsContent>
                <TabsContent value="handicap">
                     <div className="p-4 text-center text-white/50">Em breve</div>
                </TabsContent>
            </Tabs>
        </div>
    );
};


export default function FutebolPage() {
    const { footballMatches, footballTeams, footballChampionships, placeFootballBet } = useAppContext();
    const { toast } = useToast();
    const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
    const [activeChampionship, setActiveChampionship] = useState<string | 'all'>('all');
    const [isBoletimOpen, setIsBoletimOpen] = useState(false);

    useEffect(() => {
        try {
            const savedSlip = localStorage.getItem('football_bet_slip');
            if (savedSlip) {
                setBetSlip(JSON.parse(savedSlip));
            }
        } catch (error) {
            console.error("Failed to load bet slip from localStorage", error);
            setBetSlip([]);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('football_bet_slip', JSON.stringify(betSlip));
        } catch (error) {
            console.error("Failed to save bet slip to localStorage", error);
        }
    }, [betSlip]);

    const matchesByChampionship = useMemo(() => {
        const grouped: Record<string, any> = {};
        const importedMatches = footballMatches.filter(match => match.isImported);

        importedMatches.forEach(match => {
            if (match.status !== 'scheduled') return;
            
            const championship = footballChampionships.find(c => c.apiId === match.championshipApiId);
            if (!championship) return;

            if (!grouped[championship.id]) {
                grouped[championship.id] = {
                    championshipId: championship.id,
                    championshipName: championship.name,
                    championshipLogo: championship.logo,
                    matches: []
                };
            }
            
            const homeTeam = footballTeams.find(t => t.id === match.homeTeamId);
            const awayTeam = footballTeams.find(t => t.id === match.awayTeamId);

            grouped[championship.id].matches.push({
                ...match,
                homeTeamName: homeTeam?.name,
                awayTeamName: awayTeam?.name,
                homeTeamLogo: homeTeam?.logo,
                awayTeamLogo: awayTeam?.logo,
            });
        });
        return Object.values(grouped).map(group => {
            group.matches.sort((a:any,b:any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
            return group;
        });
    }, [footballMatches, footballTeams, footballChampionships]);

    const displayedMatches = useMemo(() => {
        if (activeChampionship === 'all') {
            return matchesByChampionship;
        }
        return matchesByChampionship.filter(group => group.championshipId === activeChampionship);
    }, [matchesByChampionship, activeChampionship]);
    
    const featuredMatch = useMemo(() => {
        const allImportedMatches = matchesByChampionship.flatMap(group => group.matches);
        return allImportedMatches.length > 0 ? allImportedMatches[0] : null;
    }, [matchesByChampionship]);


    const handleAddBet = (match: any, pick: 'home' | 'draw' | 'away') => {
        const pickLabel = pick === 'home' ? match.homeTeamName : pick === 'draw' ? 'Empate' : match.awayTeamName;
        const newBet: BetSlipItem = {
            id: `${match.id}-${pick}`,
            match,
            pick,
            pickLabel,
            odd: match.odds[pick],
            value: 0,
        };

        setBetSlip(prev => {
            const existingIndex = prev.findIndex(item => item.match.id === match.id);
            if (existingIndex > -1) {
                if (prev[existingIndex].id === newBet.id) {
                    return prev.filter(item => item.id !== newBet.id);
                }
                const updatedSlip = [...prev];
                const existingBet = updatedSlip[existingIndex];
                updatedSlip[existingIndex] = { ...newBet, value: existingBet?.value || 0 };
                return updatedSlip;
            }
            if(prev.length === 0) setIsBoletimOpen(true);
            return [...prev, newBet];
        });
    };
    
    const handleRemoveBet = (id: string) => {
        setBetSlip(prev => prev.filter(item => item.id !== id));
    };

    const handleBetValueChange = (id: string, value: number) => {
        setBetSlip(prev => prev.map(bet => bet.id === id ? { ...bet, value } : bet));
    };

    const { totalValue, totalReturn } = useMemo(() => {
        return betSlip.reduce(
            (acc, item) => {
                acc.totalValue += item.value;
                acc.totalReturn += item.value * item.odd;
                return acc;
            },
            { totalValue: 0, totalReturn: 0 }
        );
    }, [betSlip]);
    
    const handlePlaceBet = () => {
        if (totalValue <= 0) {
            toast({ variant: 'destructive', title: 'Valor Inválido', description: 'O valor total da aposta deve ser maior que zero.' });
            return;
        }
        const success = placeFootballBet(betSlip);
        if (success) {
            setBetSlip([]);
            setIsBoletimOpen(false);
        }
    };


  return (
    <div>
      <Header />
      <main className="p-4 md:p-8">
         <h2 className="text-3xl font-bold mb-6">Próximos Jogos de Futebol</h2>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
             <div className="hidden lg:block lg:col-span-1 sidebar-campeonatos">
                <h4 className="font-bold text-lg mb-4">Campeonatos</h4>
                <div className={`campeonato-item ${activeChampionship === 'all' ? 'active' : ''}`}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveChampionship('all'); }}>
                        Todos os Jogos
                    </a>
                </div>
                {matchesByChampionship.map(group => (
                    <div key={group.championshipId} className={`campeonato-item ${activeChampionship === group.championshipId ? 'active' : ''}`}>
                        <a href="#" onClick={(e) => { e.preventDefault(); setActiveChampionship(group.championshipId); }}>
                            {group.championshipName}
                            <span className="badge">{group.matches.length}</span>
                        </a>
                    </div>
                ))}
            </div>

            <div className="lg:col-span-3 space-y-6">
                {featuredMatch && <FeaturedMatch match={featuredMatch} betSlip={betSlip} handleAddBet={handleAddBet} />}
                
                {displayedMatches.length === 0 && (
                    <div className="jogo-card">
                        <div className="p-8 text-center text-muted-foreground">
                            <p>Nenhum jogo programado para os campeonatos selecionados.</p>
                        </div>
                    </div>
                )}
                {displayedMatches.map(group => (
                    <div key={group.championshipName}>
                        <div className="space-y-4">
                           {group.matches.map((match: any) => (
                                <div key={match.id} className="jogo-card">
                                  <div className="jogo-header">
                                    <span className="liga">{group.championshipName}</span>
                                    <span className="status-badge">{new Date(match.dateTime).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} {new Date(match.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>

                                  <div className="jogo-info">
                                    <div className="times">
                                      <div className="time time-casa">
                                        {match.homeTeamLogo && <Image src={match.homeTeamLogo} alt={match.homeTeamName} width={28} height={28} />}
                                        <span className="nome">{match.homeTeamName}</span>
                                      </div>
                                      <div className="versus">VS</div>
                                      <div className="time time-fora">
                                        {match.awayTeamLogo && <Image src={match.awayTeamLogo} alt={match.awayTeamName} width={28} height={28} />}
                                        <span className="nome">{match.awayTeamName}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="odds-container">
                                    <button className={`odd-btn ${betSlip.find(b => b.id === `${match.id}-home`) ? 'active' : ''}`} onClick={() => handleAddBet(match, 'home')}>
                                      <span className="odd-label">Casa</span>
                                      <span className="odd-value">{match.odds.home.toFixed(2)}</span>
                                    </button>
                                    <button className={`odd-btn ${betSlip.find(b => b.id === `${match.id}-draw`) ? 'active' : ''}`} onClick={() => handleAddBet(match, 'draw')}>
                                      <span className="odd-label">Empate</span>
                                      <span className="odd-value">{match.odds.draw.toFixed(2)}</span>
                                    </button>
                                    <button className={`odd-btn ${betSlip.find(b => b.id === `${match.id}-away`) ? 'active' : ''}`} onClick={() => handleAddBet(match, 'away')}>
                                      <span className="odd-label">Fora</span>
                                      <span className="odd-value">{match.odds.away.toFixed(2)}</span>
                                    </button>
                                     <button className="odd-btn" disabled>
                                      <span className="odd-label">Mais Mercados</span>
                                      <span className="odd-value">+350</span>
                                    </button>
                                  </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <>
                <button id="boletimBtn" className="boletim-btn" onClick={() => setIsBoletimOpen(true)}>
                    <span className="boletim-icone">🎰</span>
                    {betSlip.length > 0 && <span className="boletim-count" id="boletim-count">{betSlip.length}</span>}
                </button>

                <div id="boletim-overlay" className={`boletim-overlay ${isBoletimOpen ? 'active' : ''}`} onClick={() => setIsBoletimOpen(false)}></div>

                <div id="boletim-panel" className={`boletim-panel ${isBoletimOpen ? 'aberto' : ''}`}>
                    <div className="boletim-header">
                        <h3>Boletim de Apostas</h3>
                        <button id="boletim-close" className="boletim-fechar" onClick={() => setIsBoletimOpen(false)}>&times;</button>
                    </div>
                    
                    <div className="boletim-body" id="boletim-body">
                        {betSlip.length === 0 ? (
                            <div className="boletim-vazio" id="boletim-vazio">
                                Nenhuma aposta selecionada
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {betSlip.map(item => <BetSlipItemComponent key={item.id} item={item} onRemove={handleRemoveBet} onValueChange={handleBetValueChange} />)}
                            </div>
                        )}
                    </div>
                    
                    {betSlip.length > 0 && (
                        <div className="boletim-footer" id="boletim-footer">
                            <div className="boletim-resumo">
                                <span>Total de Apostas: <strong>{betSlip.length}</strong></span>
                                <span>Valor Total: <strong>R$ {totalValue.toFixed(2).replace('.', ',')}</strong></span>
                                <span>Retorno Potencial: <strong>R$ {totalReturn.toFixed(2).replace('.', ',')}</strong></span>
                            </div>
                             <Button 
                                className="btn-finalizar" 
                                disabled={betSlip.length === 0 || totalValue <= 0}
                                onClick={handlePlaceBet}
                            >
                                Fazer Aposta
                            </Button>
                        </div>
                    )}
                </div>
            </>
         </div>
      </main>
    </div>
  );
}
