'use client';

import React, { useState } from 'react';
import { Header } from '@/components/header';
import { useAppContext } from '@/context/AppContext';
import { FootballWidget, FootballWidgetContainer } from '@/components/football/widgets/FootballWidgetContainer';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, LayoutGrid, Info, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

export default function FutebolPage() {
  const { footballApiConfig } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <Header />
      <main className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        
        {/* Cabeçalho de Navegação */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Central Futebol</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-red-600 animate-pulse text-[10px] h-5">AO VIVO</Badge>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest italic">Integração Oficial API-FOOTBALL</span>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-900 border-white/10 h-11 pl-10 text-white rounded-xl focus:border-primary/50"
            />
          </div>
        </div>

        {/* Layout de Widgets 3 Colunas */}
        <FootballWidgetContainer>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUNA 1: LIGAS (Sidebar Esquerda) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-primary" />
                    <span className="font-black uppercase italic text-xs tracking-widest text-white">Competições</span>
                  </div>
                </div>
                <div className="p-2 h-[600px] overflow-y-auto custom-scrollbar">
                  <FootballWidget 
                    type="leagues" 
                    targetLeague="wg-football-games"
                    targetStandings="wg-football-standings"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* COLUNA 2: JOGOS (Centro) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    <span className="font-black uppercase italic text-xs tracking-widest text-white">Próximos Confrontos</span>
                  </div>
                </div>
                <div className="p-2 h-[600px] overflow-y-auto custom-scrollbar">
                  <FootballWidget 
                    id="wg-football-games"
                    type="fixtures" 
                    targetGame="wg-football-details"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* COLUNA 3: DETALHES & CLASSIFICAÇÃO (Direita) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Card de Detalhes da Partida / Time */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-2xl min-h-[300px]">
                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={16} className="text-primary" />
                    <span className="font-black uppercase italic text-xs tracking-widest text-white">Detalhes do Evento</span>
                  </div>
                </div>
                <div className="p-4">
                  <div id="wg-football-details" className="w-full min-h-[250px] flex flex-col items-center justify-center text-center">
                    <FootballWidget type="fixture" className="w-full" />
                    <div className="mt-8 space-y-2 text-muted-foreground animate-pulse">
                      <Info className="mx-auto h-8 w-8 opacity-20" />
                      <p className="text-[10px] font-bold uppercase tracking-tighter">Selecione uma partida para ver detalhes, estatísticas e eventos em tempo real.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card de Classificação */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-primary" />
                    <span className="font-black uppercase italic text-xs tracking-widest text-white">Tabela de Classificação</span>
                  </div>
                </div>
                <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div id="wg-football-standings">
                    <FootballWidget type="standings" targetTeam="wg-football-details" className="w-full" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </FootballWidgetContainer>

        {/* Banner Informativo Inferior */}
        <Card className="bg-primary/10 border-primary/20 p-6 rounded-3xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <h4 className="text-xl font-black uppercase italic tracking-tighter text-primary">Operação em Tempo Real</h4>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest max-w-lg">
                Os dados são atualizados automaticamente a cada {footballApiConfig.widgetConfig.refresh} segundos. 
                Utilize os filtros laterais para navegar entre ligas do mundo todo.
              </p>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px] px-4 py-2 font-black uppercase tracking-[2px]">
              CERTIFIED INTEGRATION
            </Badge>
          </div>
        </Card>

      </main>
    </div>
  );
}
