'use client';

import { useMemo, useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LotteryBetSlip } from '@/components/LotteryBetSlip';
import { TicketDialog } from '@/components/ticket-dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Trophy, Calendar, Zap, Globe } from 'lucide-react';

interface BetSlipItem {
    id: string;
    match: any;
    pick: 'home' | 'draw' | 'away';
    pickLabel: string;
    odd: number;
    value: number;
}

export default function FutebolPage() {
    const { 
      footballMatches, 
      footballTeams, 
      footballChampionships, 
      placeFootballBet,
      user
    } = useAppContext();
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
    const [activeChampionship, setActiveChampionship] = useState<string | 'all'>('all');
    
    // Ticket Dialog States
    const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
    const [generatedTicketId, setGeneratedTicketId] = useState<string | null>(null);
    const [ticketGenerationTime, setTicketGenerationTime] = useState<string | null>(null);

    const matchesByChampionship = useMemo(() => {
        const grouped: Record<string, any> = {};
        const importedMatches = footballMatches.filter(match => match.isImported);

        importedMatches.forEach(match => {
            const championship = footballChampionships.find(c => c.apiId === match.championshipApiId);
            if (!championship) return;

            // Filtro de pesquisa
            const homeTeam = footballTeams.find(t => t.id === match.homeTeamId);
            const awayTeam = footballTeams.find(t => t.id === match.awayTeamId);
            
            if (searchTerm && 
                !homeTeam?.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
                !awayTeam?.name.toLowerCase().includes(searchTerm.toLowerCase())) {
              return;
            }

            if (!grouped[championship.id]) {
                grouped[championship.id] = {
                    championshipId: championship.id,
                    championshipName: championship.name,
                    championshipLogo: championship.logo,
                    matches: []
                };
            }
            
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
    }, [footballMatches, footballTeams, footballChampionships, searchTerm]);

    const handleAddBet = (match: any, pick: 'home' | 'draw' | 'away') => {
        if (!user) {
          toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Faça login para apostar.' });
          return;
        }

        const pickLabel = pick === 'home' ? match.homeTeamName : pick === 'draw' ? 'Empate' : match.awayTeamName;
        const oddValue = match.odds[pick] || 1.95; // Fallback se não houver odd sincronizada

        const newBet: BetSlipItem = {
            id: `${match.id}-${pick}`,
            match,
            pick,
            pickLabel,
            odd: oddValue,
            value: 10,
        };

        setBetSlip(prev => {
            const existingIndex = prev.findIndex(item => item.match.id === match.id);
            if (existingIndex > -1) {
                if (prev[existingIndex].id === newBet.id) return prev.filter(item => item.id !== newBet.id);
                const updatedSlip = [...prev];
                updatedSlip[existingIndex] = { ...newBet, value: prev[existingIndex].value };
                return updatedSlip;
            }
            return [...prev, newBet];
        });
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

    return (
        <div className="min-h-screen bg-[#0a0f1e]">
            <Header />
            <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Futebol Ao Vivo</h2>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar time..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="bg-slate-900 border-white/10 h-11 pl-10 text-white rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-24">
                    {/* Sidebar Ligas */}
                    <div className="hidden lg:block lg:col-span-3 space-y-4">
                        <Card className="bg-slate-900/50 border-white/5 rounded-2xl overflow-hidden">
                          <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
                            <Trophy size={16} className="text-primary" />
                            <span className="font-black uppercase italic text-xs tracking-widest text-white">Campeonatos</span>
                          </div>
                          <div className="p-2 space-y-1">
                            <button 
                              onClick={() => setActiveChampionship('all')}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-bold text-sm ${activeChampionship === 'all' ? 'bg-primary text-black' : 'text-slate-400 hover:bg-white/5'}`}
                            >
                              <Globe size={16} /> Todos os Jogos
                            </button>
                            {matchesByChampionship.map(group => (
                              <button 
                                key={group.championshipId}
                                onClick={() => setActiveChampionship(group.championshipId)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold text-sm ${activeChampionship === group.championshipId ? 'bg-primary text-black' : 'text-slate-400 hover:bg-white/5'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Image src={group.championshipLogo} alt="" width={20} height={20} />
                                  <span className="truncate max-w-[140px]">{group.championshipName}</span>
                                </div>
                                <Badge variant="outline" className="bg-white/10 border-0 h-5 text-[10px]">{group.matches.length}</Badge>
                              </button>
                            ))}
                          </div>
                        </Card>
                    </div>

                    {/* Lista de Jogos */}
                    <div className="lg:col-span-9 space-y-8">
                        {matchesByChampionship
                          .filter(g => activeChampionship === 'all' || g.championshipId === activeChampionship)
                          .map(group => (
                            <div key={group.championshipId} className="space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <Image src={group.championshipLogo} alt="" width={24} height={24} />
                                  </div>
                                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight">{group.championshipName}</h3>
                                </div>

                                <div className="grid gap-4">
                                  {group.matches.map((match: any) => (
                                    <Card key={match.id} className="bg-slate-900 border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-colors">
                                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex-1 flex items-center justify-between md:justify-start gap-8">
                                          {/* Time Casa */}
                                          <div className="flex flex-col items-center gap-2 w-24 text-center">
                                            <div className="w-12 h-12 relative bg-white/5 rounded-full p-2">
                                              <Image src={match.homeTeamLogo} alt="" fill className="object-contain p-2" />
                                            </div>
                                            <span className="text-xs font-bold text-white line-clamp-2">{match.homeTeamName}</span>
                                          </div>

                                          <div className="flex flex-col items-center gap-1">
                                            {match.status === 'live' ? (
                                              <Badge className="bg-red-600 animate-pulse text-[9px] h-5">AO VIVO</Badge>
                                            ) : (
                                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                {new Date(match.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            )}
                                            <span className="text-2xl font-black italic text-primary">VS</span>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{match.round}</span>
                                          </div>

                                          {/* Time Fora */}
                                          <div className="flex flex-col items-center gap-2 w-24 text-center">
                                            <div className="w-12 h-12 relative bg-white/5 rounded-full p-2">
                                              <Image src={match.awayTeamLogo} alt="" fill className="object-contain p-2" />
                                            </div>
                                            <span className="text-xs font-bold text-white line-clamp-2">{match.awayTeamName}</span>
                                          </div>
                                        </div>

                                        {/* Odds */}
                                        <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
                                          {[
                                            { label: 'Casa', key: 'home' },
                                            { label: 'Empate', key: 'draw' },
                                            { label: 'Fora', key: 'away' }
                                          ].map(opt => (
                                            <button 
                                              key={opt.key}
                                              onClick={() => handleAddBet(match, opt.key as any)}
                                              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all h-16 w-full md:w-24 ${betSlip.find(b => b.id === `${match.id}-${opt.key}`) ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}
                                            >
                                              <span className="text-[9px] uppercase font-black opacity-70">{opt.label}</span>
                                              <span className="text-sm font-black italic">{(match.odds[opt.key as keyof typeof match.odds] || 1.95).toFixed(2)}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <LotteryBetSlip 
                    items={betSlip}
                    totalValue={totalValue}
                    totalPossibleReturn={totalReturn}
                    onRemoveItem={(id) => setBetSlip(betSlip.filter(b => b.id !== id))}
                    onFinalize={() => {}}
                    lotteryName="Futebol"
                />
            </main>
        </div>
    );
}
