
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Maximize2, Trophy, User } from 'lucide-react';
import { useAppContext, BingoWinner } from '@/context/AppContext';
import { getBingoWaitingState, getBingoUiState, BingoUiState } from '@/lib/bingoUiAdapter';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// --- COMPONENTE DE POP-UP DE VENCEDOR ---

const WinnerPopup = ({ 
  phase, 
  winners, 
  allWinners 
}: { 
  phase: string; 
  winners: any[]; 
  allWinners?: BingoWinner[] 
}) => {
  const isKeno = phase.toUpperCase() === 'KENO';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-4 border-[#ffd400] animate-in zoom-in-95 duration-300">
        <div className="bg-[#b30000] p-4 text-center">
          <Trophy className="h-12 w-12 text-[#ffd400] mx-auto mb-2" />
          <h2 className="text-white font-black italic uppercase text-2xl tracking-tighter">
            {isKeno ? "🏆 RESUMO DA RODADA 🏆" : `🎉 GANHADOR DA ${phase} 🎉`}
          </h2>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {isKeno && allWinners ? (
            <div className="space-y-4">
              {allWinners.map((w, i) => (
                <div key={`summary-${w.category}-${i}`} className="flex justify-between items-center p-3 border-b">
                  <div>
                    <Badge className="bg-blue-600 mb-1">{w.category.toUpperCase()}</Badge>
                    <p className="font-bold text-gray-700">{w.terminalId} - {w.userName}</p>
                  </div>
                  <div className="flex gap-1">
                    {w.winningNumbers.map((n, idx) => (
                      <span key={`sum-num-${idx}`} className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold border border-green-200">{n}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {winners.map((w, i) => (
                <div key={`winner-simple-${i}`} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="bg-[#ffd400] text-black font-black px-3 py-1 rounded-lg text-sm shadow-sm">
                      #{w.terminalId}
                    </span>
                    <span className="text-gray-800 font-bold text-lg">{w.userName}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {w.winningNumbers.map((n, idx) => (
                      <div key={`winner-n-${idx}`} className="w-10 h-10 rounded-full bg-[#2ecc71] text-white flex items-center justify-center font-black shadow-md border-2 border-white">
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-gray-100 p-3 text-center">
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Retornando ao jogo...</p>
        </div>
      </div>
    </div>
  );
};

// --- CONTROLLER DE VENCEDORES ---

const WinnerPopupController = ({ ui }: { ui: BingoUiState }) => {
  const [activePopup, setActivePopup] = useState<{ phase: string, winners: any[] } | null>(null);
  const [shownWinners, setShownWinners] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (ui.status !== 'DRAWING' || !ui.drawId) return;

    // Detecta novos ganhadores para exibir popup
    const newWinners = ui.roundWinners.filter(w => !shownWinners.has(`${ui.drawId}-${w.category}`));
    
    if (newWinners.length > 0) {
      const winner = newWinners[0];
      setShownWinners(prev => new Set(prev).add(`${ui.drawId}-${winner.category}`));
      
      setActivePopup({ 
        phase: winner.category.toUpperCase(), 
        winners: [winner] 
      });

      const timer = setTimeout(() => setActivePopup(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [ui.roundWinners, ui.drawId, ui.status, shownWinners]);

  if (!activePopup) return null;

  return (
    <WinnerPopup 
      phase={activePopup.phase} 
      winners={activePopup.winners} 
      allWinners={activePopup.phase === 'KENO' ? ui.roundWinners : undefined}
    />
  );
};

// --- TELA DE ESPERA ---

const BingoWaitingScreen = ({ 
  ui, 
  onBuy, 
  numCartelas, 
  setNumCartelas,
  purchaseStep,
  setPurchaseStep
}: { 
  ui: any, 
  onBuy: () => void, 
  numCartelas: number, 
  setNumCartelas: (n: number) => void,
  purchaseStep: number,
  setPurchaseStep: (n: number) => void
}) => {
  const isHold = ui.status === 'PRE_DRAW_HOLD';

  return (
    <div className="flex-grow flex flex-col items-center justify-between p-2 md:p-4 gap-2 bg-gradient-to-b from-[#1a1a2e] to-[#16213e] overflow-hidden select-none">
      <div className="w-full max-w-lg bg-[#0f3460] rounded-2xl p-4 md:p-6 border-2 border-white/10 shadow-2xl flex flex-col items-center gap-1">
        <h2 className="text-white/70 uppercase tracking-widest text-xs font-bold">
          {isHold ? "Iniciando em Breve" : "Próximo Sorteio"}
        </h2>
        <div className={cn(
          "text-white font-black font-mono tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]",
          isHold ? "text-2xl md:text-4xl" : "text-6xl md:text-7xl"
        )}>
          {isHold ? (
            <span className="text-[#ffd400] animate-pulse uppercase">AGUARDANDO SORTEIO</span>
          ) : (
            ui.countdownSeconds > 0 
              ? `${Math.floor(ui.countdownSeconds / 60).toString().padStart(2, '0')}:${(ui.countdownSeconds % 60).toString().padStart(2, '0')}`
              : "00:00"
          )}
        </div>
      </div>

      <div className="w-full max-w-lg space-y-1.5">
        {[
          { label: 'Kuadra', val: ui.prizeQuadra },
          { label: 'Kina', val: ui.prizeKina },
          { label: 'Keno', val: ui.prizeKeno }
        ].map(p => (
          <div key={p.label} className="bg-[#1a5fb4] flex justify-between items-center px-6 py-2 md:py-3 rounded-xl border border-white/5 shadow-md">
            <span className="text-[#ffd400] font-black uppercase text-base md:text-lg italic">{p.label}</span>
            <span className="text-white font-black text-xl md:text-2xl">R$ {p.val}</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400 p-1 rounded-xl shadow-xl">
        <div className="bg-transparent flex items-center justify-between px-4 py-1.5 md:py-2">
          <span className="text-[#ffd400] font-black text-lg md:text-xl italic uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">Acumulado</span>
          <div className="flex items-center gap-3">
            <div className="bg-[#e60000] px-4 py-1 rounded-lg text-white font-black text-xl md:text-2xl border-2 border-white/20">
              R$ {ui.accumulatedValue}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg grid grid-cols-3 gap-2">
        <div className="bg-[#0f3460] p-1.5 md:p-2 rounded-xl border border-white/10 text-center">
          <p className="text-white/50 text-[9px] uppercase font-bold">Sorteio</p>
          <p className="text-white font-bold text-xs md:sm">#{ui.drawNumberText}</p>
        </div>
        <div className="bg-[#0f3460] p-1.5 md:p-2 rounded-xl border border-white/10 text-center">
          <p className="text-white/50 text-[9px] uppercase font-bold">Dia-Hora</p>
          <p className="text-white font-bold text-xs md:sm">{ui.dayHourText}</p>
        </div>
        <div className="bg-[#0f3460] p-1.5 md:p-2 rounded-xl border border-white/10 text-center">
          <p className="text-white/50 text-[9px] uppercase font-bold">Doação</p>
          <p className="text-white font-bold text-xs md:sm">R$ {ui.donationValue}</p>
        </div>
      </div>

      <div className="w-full max-w-lg space-y-3">
        <div className="flex flex-wrap justify-center gap-1.5">
          {[10, 20, 30, 40, 50, 100, 200].map((v: number) => (
            <button 
              key={v} 
              disabled={isHold}
              onClick={() => setPurchaseStep(v)}
              className={cn(
                "font-bold py-1.5 px-3 md:px-4 rounded-lg border transition-colors text-xs md:text-sm",
                purchaseStep === v 
                  ? "bg-amber-500 border-amber-400 text-black" 
                  : "bg-[#0f3460] text-white border-white/10 hover:bg-[#1a5fb4]",
                isHold && "opacity-50 grayscale cursor-not-allowed"
              )}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
            <button 
              disabled={isHold}
              onClick={() => setNumCartelas(Math.max(0, numCartelas - purchaseStep))} 
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-[#ffd400] text-2xl md:text-3xl font-black hover:bg-white/5 rounded-l-lg transition-colors"
            >
              −
            </button>
            <div className="w-12 md:w-16 text-center text-white font-black text-xl md:text-2xl">{numCartelas}</div>
            <button 
              disabled={isHold}
              onClick={() => setNumCartelas(numCartelas + purchaseStep)} 
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-[#ffd400] text-2xl md:text-3xl font-black hover:bg-white/5 rounded-r-lg transition-colors"
            >
              +
            </button>
          </div>
          
          <div className="flex-1 bg-white h-12 md:h-14 rounded-xl flex items-center justify-center shadow-inner px-2">
            <span className="text-[#1a1a2e] font-black text-xl md:text-2xl tracking-tight">R$ {(ui.ticketPrice * numCartelas).toFixed(2).replace('.', ',')}</span>
          </div>

          <button 
            onClick={onBuy}
            disabled={numCartelas === 0 || isHold}
            className="h-12 md:h-14 px-6 md:px-8 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-black text-lg md:text-xl italic rounded-xl shadow-[0_4px_0_rgb(39,174,96)] active:translate-y-1 active:shadow-none transition-all"
          >
            DOAR
          </button>
        </div>
      </div>
    </div>
  );
};

// --- TELA DE SORTEIO ---

const BingoDrawScreen = ({ ui }: { ui: BingoUiState }) => {
  const targetHits = useMemo(() => {
    if (ui.phaseLabel.includes("Quadra")) return 4;
    if (ui.phaseLabel.includes("Kina")) return 5;
    return 25;
  }, [ui.phaseLabel]);

  const topParticipants = useMemo(() => {
    const drawnSet = new Set(ui.drawnNumbers);
    return ui.participants
      .map(p => {
        const hits = p.numbers.filter(n => drawnSet.has(n)).length;
        const missingCount = Math.max(0, targetHits - hits);
        const missingPool = p.numbers.filter(n => !drawnSet.has(n));
        return {
          ...p,
          hits,
          missingCount,
          missingNumbersToShow: missingPool.slice(0, 6),
          totalMissingInPool: missingPool.length
        };
      })
      .sort((a, b) => a.missingCount - b.missingCount)
      .slice(0, 10);
  }, [ui.participants, ui.drawnNumbers, targetHits]);

  return (
    <div className="flex-grow flex flex-col bg-[#f4f6f9] overflow-hidden select-none h-full relative">
      <WinnerPopupController ui={ui} />

      <div className="grid grid-cols-3 gap-2 p-2 shrink-0">
        {[
          { label: 'Kuadra', val: ui.prizeQuadra },
          { label: 'Kina', val: ui.prizeKina },
          { label: 'Keno', val: ui.prizeKeno }
        ].map(p => (
          <div key={p.label} className="bg-[#1a5fb4] rounded-lg p-2 shadow-sm border border-white/10 flex flex-col items-center">
            <span className="text-[#ffd400] font-black text-[10px] md:text-xs uppercase italic">{p.label}</span>
            <span className="text-white font-black text-lg md:text-xl">R$ {p.val}</span>
          </div>
        ))}
      </div>

      <div className="px-2 mb-2 shrink-0">
        <div className="bg-[#c40000] rounded-lg p-3 flex items-center justify-between shadow-md">
          <div className="flex flex-col">
            <span className="text-[#ffd400] text-[10px] font-black uppercase italic">Acumulado</span>
            <span className="text-white font-black text-2xl">R$ {ui.accumulatedValue}</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-4 border-[#ff0000] shadow-lg">
            <span className="text-[#ff0000] font-black text-xl">{ui.orderNumber}</span>
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col md:flex-row gap-2 px-2 overflow-hidden min-h-0">
        <div className="md:w-1/3 flex flex-col gap-4 items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200 p-2 md:p-4">
          <div className="relative">
            <div className="w-24 h-24 md:w-44 md:h-44 rounded-full bg-[#e60000] border-8 border-white/20 shadow-2xl flex items-center justify-center">
              <div className="w-16 h-16 md:w-32 md:h-32 rounded-full bg-white flex items-center justify-center">
                <span className="text-[#b30000] text-3xl md:text-7xl font-black">{ui.lastNumber || '--'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            {ui.ballsPreview.slice(1).map((n, i) => (
              <div key={`ball-p-${i}`} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#e5e5e5] flex items-center justify-center border-2 border-white shadow-sm">
                <span className="text-gray-700 font-black text-xs md:text-sm">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-[#1a1a2e] rounded-xl p-2 shadow-inner border border-black/20 overflow-hidden">
          <div className="grid grid-cols-10 gap-1 h-full">
            {Array.from({ length: 90 }, (_, i) => i + 1).map(num => {
              const isDrawn = ui.drawnNumbers.includes(num);
              const isLast = num === ui.lastNumber;
              return (
                <div 
                  key={`grid-${num}`} 
                  className={cn(
                    "flex items-center justify-center rounded-sm font-black text-[10px] md:text-sm transition-all duration-200",
                    !isDrawn && "bg-gray-800 text-gray-600",
                    isDrawn && !isLast && "bg-[#00ff66] text-black",
                    isLast && "bg-[#ff0000] text-white scale-110 shadow-[0_0_10px_rgba(255,0,0,0.5)] z-10"
                  )}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TABELA DE GANHADORES (NOVA) */}
      <div className="mt-2 bg-white px-2 py-1 shrink-0 h-[120px] overflow-hidden border-t-2 border-blue-100">
        <h4 className="text-[10px] font-black uppercase text-blue-800 mb-1 px-1">Ganhadores da Rodada</h4>
        <div className="h-full overflow-y-auto rounded border border-gray-100">
          <table className="w-full text-[10px] border-collapse">
            <thead className="bg-blue-50 sticky top-0">
              <tr>
                <th className="p-1 text-left font-bold text-gray-500">CATEGORIA</th>
                <th className="p-1 text-left font-bold text-gray-500">TERMINAL</th>
                <th className="p-1 text-left font-bold text-gray-500">NOME</th>
                <th className="p-1 text-left font-bold text-gray-500">TIPO</th>
                <th className="p-1 text-right font-bold text-gray-500">VALOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ui.roundWinners.map((w, idx) => (
                <tr key={`winner-row-${idx}`} className="bg-white">
                  <td className="p-1"><Badge variant="outline" className="text-[8px] h-4 uppercase">{w.category}</Badge></td>
                  <td className="p-1 font-mono text-gray-600">{w.terminalId}</td>
                  <td className="p-1 font-bold text-gray-800 uppercase">{w.userName}</td>
                  <td className="p-1">
                    <Badge className={cn("text-[8px] h-4", w.type === 'BOT_WIN' ? "bg-gray-400" : "bg-green-600")}>
                      {w.type === 'BOT_WIN' ? 'BOT' : 'REAL'}
                    </Badge>
                  </td>
                  <td className="p-1 text-right font-black text-green-700">R$ {w.winAmount.toFixed(2)}</td>
                </tr>
              ))}
              {ui.roundWinners.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-400 italic">Aguardando primeiros resultados...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#b30000] py-1.5 px-4 flex justify-between items-center shrink-0">
        <div className="flex gap-4 text-white text-[9px] font-bold uppercase italic">
          <span>Sorteio #{ui.drawNumberText}</span>
          <span>Doação R$ {ui.donationValue}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white text-[9px] font-black uppercase italic">Ordem</span>
          <div className="bg-[#ffd400] text-black font-black px-2 py-0.5 rounded shadow-sm text-xs">
            {ui.orderNumber}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export default function BingoPage() {
  const router = useRouter();
  const { bingoDraws, bingoTickets, bingoSettings, buyBingoTickets, startBingoDraw } = useAppContext();
  
  const [numCartelas, setNumCartelas] = useState(0);
  const [purchaseStep, setPurchaseStep] = useState(10);
  const [ticker, setTicker] = useState(0);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    const interval = setInterval(() => setTicker(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeDraw = useMemo(() => {
    const live = bingoDraws.find(d => d.status === 'live');
    if (live) return live;
    return bingoDraws
      .filter(d => d.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  }, [bingoDraws]);

  const ui = useMemo(() => {
    const myCount = bingoTickets.filter(t => t.drawId === activeDraw?.id && t.userId === 'user-01').length;
    if (activeDraw?.status === 'live') return getBingoUiState(activeDraw, bingoTickets, myCount, bingoSettings);
    return getBingoWaitingState(activeDraw, myCount, bingoSettings);
  }, [activeDraw, bingoTickets, bingoSettings, ticker]);

  const handleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };

  if (!isClient) return null;

  return (
    <div className="bg-black h-screen flex flex-col font-sans overflow-hidden">
      <header className="bg-[#a00000] text-white h-12 flex items-center justify-between px-4 shadow-md z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white hover:bg-white/10 p-2 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-black uppercase italic tracking-tighter">BINGO</h1>
        </div>
        <button onClick={handleFullscreen} className="text-white hover:bg-white/10 p-2 rounded-full">
          <Maximize2 className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-grow overflow-hidden flex flex-col">
        {ui.status === 'DRAWING' ? (
          <BingoDrawScreen ui={ui as BingoUiState} />
        ) : (
          <BingoWaitingScreen 
            ui={ui} 
            onBuy={() => buyBingoTickets(activeDraw?.id || '', numCartelas) && setNumCartelas(0)} 
            numCartelas={numCartelas} 
            setNumCartelas={setNumCartelas}
            purchaseStep={purchaseStep}
            setPurchaseStep={setPurchaseStep}
          />
        )}
      </div>

      <footer className="bg-[#b30000] text-white h-12 flex items-center justify-between px-4 shadow-inner shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-white/60 text-[8px] uppercase font-black leading-none">Cartelas</span>
            <span className="text-white font-black text-lg leading-tight">{ui.cartelasCount}</span>
          </div>
          <div className="px-3 py-0.5 bg-[#ffd400] text-black rounded-full">
            <span className="text-[10px] font-black uppercase italic animate-pulse">
              {ui.phaseLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setNumCartelas(Math.max(0, numCartelas - purchaseStep))} className="w-8 h-8 bg-[#ffd400] text-black font-black rounded flex items-center justify-center">−</button>
            <button onClick={() => setNumCartelas(numCartelas + purchaseStep)} className="w-8 h-8 bg-[#ffd400] text-black font-black rounded flex items-center justify-center">+</button>
        </div>
      </footer>
    </div>
  );
}
