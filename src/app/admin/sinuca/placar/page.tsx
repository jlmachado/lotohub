
'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, Minus, Plus, Zap, ShieldCheck, RefreshCw, Eye, BrainCircuit, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext, SnookerScoreboard, SnookerScoreReading } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SnookerScoreRecognitionService } from '@/services/snooker-score-recognition-service';

export default function AdminSinucaPlacarPage() {
    const { 
      snookerScoreboards, 
      snookerChannels, 
      updateSnookerScoreboard,
      snookerScoreRecognitionSettings,
      updateSnookerScoreRecognitionSettings
    } = useAppContext();
    const { toast } = useToast();

    const [selectedChannelId, setSelectedChannelId] = useState<string>('');
    const [scoreboard, setScoreboard] = useState<SnookerScoreboard | null>(null);
    const [lastReading, setLastReading] = useState<SnookerScoreReading | null>(null);
    const [isOCRProcessing, setIsOCRProcessing] = useState(false);
    
    const recognitionLoopRef = useRef<NodeJS.Timeout | null>(null);
    const isRunningRef = useRef(false);
    const isCancelledRef = useRef(false);

    const activeChannel = useMemo(() => 
        snookerChannels.find(c => c.id === selectedChannelId), 
    [selectedChannelId, snookerChannels]);

    useEffect(() => {
        if (selectedChannelId && snookerScoreboards[selectedChannelId]) {
            setScoreboard(JSON.parse(JSON.stringify(snookerScoreboards[selectedChannelId])));
            setLastReading(null);
            SnookerScoreRecognitionService.clearBuffer(selectedChannelId);
        } else {
            setScoreboard(null);
        }
    }, [selectedChannelId, snookerScoreboards]);

    const runRecognitionCycle = useCallback(async () => {
      if (isCancelledRef.current || !activeChannel || !scoreboard) {
        isRunningRef.current = false;
        return;
      }

      isRunningRef.current = true;
      setIsOCRProcessing(true);

      const reading = await SnookerScoreRecognitionService.processFrame(
        activeChannel,
        scoreboard,
        snookerScoreRecognitionSettings
      );

      setIsOCRProcessing(false);

      if (reading) {
        setLastReading(reading);
        
        if (SnookerScoreRecognitionService.shouldAutoApply(reading, scoreboard, snookerScoreRecognitionSettings)) {
          const updated = { ...scoreboard, scoreA: reading.scoreA, scoreB: reading.scoreB };
          updateSnookerScoreboard(selectedChannelId, updated);
          setScoreboard(updated);
          toast({ 
            title: "Placar Atualizado via OCR", 
            description: `Detectado: ${reading.scoreA} x ${reading.scoreB}` 
          });
        }
      }

      const interval = (snookerScoreRecognitionSettings.captureIntervalSeconds || 10) * 1000;
      recognitionLoopRef.current = setTimeout(runRecognitionCycle, interval);
    }, [activeChannel, scoreboard, selectedChannelId, snookerScoreRecognitionSettings, updateSnookerScoreboard, toast]);

    useEffect(() => {
      isCancelledRef.current = false;
      if (snookerScoreRecognitionSettings.enabled && activeChannel?.status === 'live' && scoreboard) {
        if (!isRunningRef.current) runRecognitionCycle();
      } else {
        if (recognitionLoopRef.current) clearTimeout(recognitionLoopRef.current);
        isRunningRef.current = false;
        setLastReading(null);
      }
      return () => {
        isCancelledRef.current = true;
        if (recognitionLoopRef.current) clearTimeout(recognitionLoopRef.current);
      };
    }, [snookerScoreRecognitionSettings.enabled, activeChannel?.status, selectedChannelId, runRecognitionCycle, scoreboard]);

    const handleScoreChange = (player: 'A' | 'B', delta: number) => {
        if (!scoreboard) return;
        const currentScore = player === 'A' ? scoreboard.scoreA : scoreboard.scoreB;
        const newScore = Math.max(0, currentScore + delta);
        setScoreboard(prev => prev ? { ...prev, [player === 'A' ? 'scoreA' : 'scoreB']: newScore } : null);
    };

    const handleSave = () => {
        if (scoreboard && selectedChannelId) {
            updateSnookerScoreboard(selectedChannelId, scoreboard);
            toast({ title: 'Placar Atualizado!' });
        }
    };

    const handleApplyReading = () => {
      if (lastReading && scoreboard) {
        const updated = { ...scoreboard, scoreA: lastReading.scoreA, scoreB: lastReading.scoreB };
        setScoreboard(updated);
        updateSnookerScoreboard(selectedChannelId, updated);
        toast({ title: "OCR Aplicado" });
      }
    };
    
    return (
        <main className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/sinuca"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Controle de Placar OCR</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-white/5 bg-card/50 shadow-2xl">
                    <CardHeader className="bg-white/5 border-b border-white/5">
                        <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                            <Zap size={16} className="text-primary" /> Juiz em Operação
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6">
                        <div className="grid gap-2 max-w-sm">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Selecionar Mesa</Label>
                            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                                <SelectTrigger className="bg-slate-900 h-12 rounded-xl border-white/10 font-bold text-white">
                                    <SelectValue placeholder="Selecione um canal..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {snookerChannels.filter(c => !c.isArchived).map(c => (
                                        <SelectItem key={c.id} value={c.id} className="font-bold">
                                            {c.playerA.name} x {c.playerB.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {scoreboard ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6 p-6 border border-white/5 rounded-2xl bg-black/20">
                                        <h3 className="font-black text-sm uppercase italic text-primary">{scoreboard.playerA.name}</h3>
                                        <div className="flex items-center gap-4 bg-slate-900 rounded-xl p-2 border border-white/5 shadow-2xl">
                                            <Button size="icon" variant="ghost" className="h-12 w-12 rounded-lg text-white" onClick={() => handleScoreChange('A', -1)}><Minus /></Button>
                                            <Input type="number" className="text-center text-4xl font-black italic bg-transparent border-0 h-12 text-primary" value={scoreboard.scoreA} />
                                            <Button size="icon" variant="ghost" className="h-12 w-12 rounded-lg text-white" onClick={() => handleScoreChange('A', 1)}><Plus /></Button>
                                        </div>
                                    </div>

                                    <div className="space-y-6 p-6 border border-white/5 rounded-2xl bg-black/20">
                                        <h3 className="font-black text-sm uppercase italic text-primary">{scoreboard.playerB.name}</h3>
                                        <div className="flex items-center gap-4 bg-slate-900 rounded-xl p-2 border border-white/5 shadow-2xl">
                                            <Button size="icon" variant="ghost" className="h-12 w-12 rounded-lg text-white" onClick={() => handleScoreChange('B', -1)}><Minus /></Button>
                                            <Input type="number" className="text-center text-4xl font-black italic bg-transparent border-0 h-12 text-primary" value={scoreboard.scoreB} />
                                            <Button size="icon" variant="ghost" className="h-12 w-12 rounded-lg text-white" onClick={() => handleScoreChange('B', 1)}><Plus /></Button>
                                        </div>
                                    </div>
                                </div>
                                <Button size="lg" onClick={handleSave} className="w-full h-14 rounded-xl font-black uppercase italic lux-shine shadow-lg">Salvar Placar Oficial</Button>
                            </>
                        ) : (
                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-40">
                                <p className="font-bold uppercase text-xs tracking-widest text-slate-500">Selecione uma mesa ativa para iniciar.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-primary/20 bg-primary/5 shadow-2xl">
                  <CardHeader className="pb-3 border-b border-primary/10">
                    <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2 text-white">
                      <BrainCircuit size={16} className="text-primary" /> Diagnóstico OCR Real
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {!snookerScoreRecognitionSettings.enabled ? (
                      <div className="text-center py-8">
                        <Badge variant="outline" className="mb-2 border-white/10 text-slate-400">DESATIVADO</Badge>
                        <p className="text-xs text-muted-foreground uppercase font-bold">Ative a automação para ler o vídeo.</p>
                      </div>
                    ) : !selectedChannelId ? (
                      <div className="text-center py-8 text-slate-500">
                        <p className="text-xs uppercase font-bold italic">Aguardando seleção...</p>
                      </div>
                    ) : isOCRProcessing ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Processando Frame...</p>
                      </div>
                    ) : !lastReading ? (
                      <div className="text-center py-8 text-slate-500">
                        <p className="text-xs uppercase font-bold">Vídeo não encontrado ou canal sem transmissão.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in">
                        <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] font-black text-slate-500 uppercase">Confiança OCR</span>
                          <Badge className={cn("font-black italic", lastReading.confidence > 0.7 ? "bg-green-600" : "bg-amber-600")}>
                            {(lastReading.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>

                        <div className="bg-slate-900 p-4 rounded-2xl border border-white/10 shadow-inner">
                          <p className="text-[9px] font-black text-primary uppercase tracking-[3px] text-center mb-4 italic">Leitura Detectada</p>
                          <div className="flex items-center justify-center gap-6">
                            <span className="text-4xl font-black italic text-white tabular-nums">{lastReading.scoreA}</span>
                            <span className="text-xs font-black text-slate-600 uppercase">VS</span>
                            <span className="text-4xl font-black italic text-white tabular-nums">{lastReading.scoreB}</span>
                          </div>
                          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Buffer:</span>
                            <span className="text-[10px] font-black text-white">{lastReading.stableCount} leituras estáveis</span>
                          </div>
                        </div>

                        <div className="p-2 bg-black/20 rounded border border-white/5">
                          <p className="text-[8px] uppercase font-bold text-slate-500 mb-1">Texto Bruto (OCR):</p>
                          <p className="text-[10px] font-mono text-slate-300 break-all">{lastReading.rawText || 'Sem texto'}</p>
                        </div>

                        {lastReading.scoreA !== scoreboard?.scoreA || lastReading.scoreB !== scoreboard?.scoreB ? (
                          <div className="flex gap-2">
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase italic text-xs h-11" onClick={handleApplyReading}><Check size={16} className="mr-1" /> Aplicar Manualmente</Button>
                          </div>
                        ) : (
                          <div className="p-3 bg-green-600/10 border border-green-600/20 rounded-xl flex items-center justify-center gap-2">
                            <CheckCircle2 size={14} className="text-green-500" />
                            <span className="text-[10px] font-black text-green-500 uppercase italic">Placar em Sincronia</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Motor OCR</Label>
                        <Badge variant="outline" className="text-[8px] h-4 bg-primary/5 border-primary/20 text-primary">TESSERACT.JS</Badge>
                      </div>
                      <p className="text-[9px] text-muted-foreground leading-relaxed font-medium uppercase italic">
                        {snookerScoreRecognitionSettings.autoApplyScore 
                          ? `Auto-Apply: ATIVO (${snookerScoreRecognitionSettings.minConfidenceToAutoApply * 100}% conf.)` 
                          : 'Modo Assistido: Clique em aplicar para atualizar.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
        </main>
    );
}
