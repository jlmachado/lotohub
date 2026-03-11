/**
 * @fileOverview Modal de sucesso pós-aposta com opções de impressão e compartilhamento.
 * Implementa restrição de visibilidade de ações por perfil de usuário.
 */

'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Ticket, Printer, MessageCircle, Download } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { BilheteContent } from './BilheteContent';
import { generateTicketImage } from '@/utils/generateTicketImage';
import { shareTicketWhatsApp } from '@/utils/shareTicketWhatsApp';
import { cn } from '@/lib/utils';

interface TicketDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onNewBet: () => void;
  ticketId: string | null;
  generationTime: string | null;
  lotteryName: string;
  ticketItems: any[];
  totalValue: number;
  possibleReturn: number;
}

export function TicketDialog({
  isOpen,
  onOpenChange,
  onNewBet,
  ticketId,
  generationTime,
  lotteryName,
  ticketItems,
  totalValue,
  possibleReturn,
}: TicketDialogProps) {
  const { terminal, user } = useAppContext();
  const { toast } = useToast();
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Regra de perfil para exibição das ações de administrador (Cambista/Promotor)
  const isAgent = user?.tipoUsuario === 'CAMBISTA' || user?.tipoUsuario === 'PROMOTOR' || user?.tipoUsuario === 'ADMIN' || user?.tipoUsuario === 'SUPER_ADMIN';

  const getSummaryText = () => {
    const isFootball = lotteryName === 'Futebol';
    return (ticketItems || []).map(i => {
      if (isFootball) {
        return `${i.matchName || 'Jogo'}: ${i.pickLabel} (@${i.odd?.toFixed(2)})`;
      }
      return `${i.modalabilityLabel || i.modalidadeLabel}: ${Array.isArray(i.numeros) ? i.numeros.join(',') : i.numero}`;
    }).join('; ');
  };

  const handleShareWhatsApp = () => {
    if (!ticketId) return;
    shareTicketWhatsApp({
      poule: ticketId,
      terminal: terminal,
      jogo: lotteryName,
      aposta: getSummaryText(),
      valor: totalValue
    });
  };

  const handleDownloadImage = async () => {
    if (!ticketId || !generationTime) return;
    setIsGeneratingImage(true);
    try {
      const dataUrl = await generateTicketImage({
        poule: ticketId,
        terminal: terminal,
        jogo: lotteryName,
        aposta: getSummaryText(),
        valor: totalValue,
        data: generationTime,
        status: 'PENDENTE'
      });

      const link = document.createElement('a');
      link.download = `Bilhete-${ticketId}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'Sucesso!', description: 'Imagem do bilhete gerada e baixada.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao gerar imagem do bilhete.' });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handlePrint = () => {
    if (!ticketId) return;

    if (typeof window !== 'undefined' && document.fullscreenElement) {
      sessionStorage.setItem('app:restore_fullscreen:v1', 'true');
    }

    const isFootball = lotteryName === 'Futebol';
    const ticketData = {
      banca: 'LotoHub',
      ticketId: ticketId,
      terminal: terminal || '',
      datetime: generationTime || new Date().toLocaleString('pt-BR'),
      jogo: lotteryName,
      apostas: (ticketItems || []).map((item) => {
        if (isFootball) {
          return {
            modalidade: item.matchName || 'Sportsbook',
            numero: `Vencedor: ${item.pickLabel} (@${item.odd?.toFixed(2)})`,
            valor: (item.stake || totalValue).toFixed(2),
          };
        }
        return {
          modalidade: item.modalidadeLabel || '',
          numero: Array.isArray(item.numeros) ? item.numeros.join(', ') : String(item.numero || ''),
          valor: (parseFloat(String(item.valor || '0').replace(',', '.')) || 0).toFixed(2),
        };
      }),
      total: `R$ ${(totalValue || 0).toFixed(2).replace('.', ',')}`,
      possivelRetorno: (possibleReturn || 0).toFixed(2).replace('.', ','),
    };

    localStorage.setItem('PRINT_TICKET_DATA', JSON.stringify(ticketData));
    
    const printWindow = window.open('/impressao.html', 'ImpressaoLotoHub', 'width=400,height=600');
    
    if (!printWindow) {
      toast({
        variant: 'destructive',
        title: 'Pop-up bloqueado',
        description: 'Por favor, habilite pop-ups para imprimir o bilhete.',
      });
    }
  };

  if (!ticketId || !generationTime) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] sm:max-w-lg mx-auto rounded-t-[32px] flex flex-col p-0 overflow-hidden border-t-4 border-primary/20">
        <div className="p-6 border-b bg-card/50 flex-shrink-0">
          <SheetHeader className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
              <Ticket className="h-10 w-10 text-primary" />
            </div>
            <SheetTitle className="text-3xl font-black italic uppercase tracking-tighter text-white">LotoHub</SheetTitle>
            <SheetDescription className="flex flex-col gap-1 font-bold">
              <span>Pule N°: <span className="font-mono text-primary">{ticketId}</span></span>
              <span>Terminal: <span className="font-mono text-primary">{terminal}</span></span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{generationTime}</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-grow overflow-y-auto p-6 bg-muted/5 custom-scrollbar">
          <BilheteContent
            lotteryName={lotteryName}
            ticketItems={ticketItems}
            totalValue={totalValue}
            possibleReturn={possibleReturn}
          />
        </div>

        <div className="p-6 border-t bg-card shadow-[0_-15px_30px_rgba(0,0,0,0.3)] flex-shrink-0">
          {isAgent && (
            <div className="grid grid-cols-2 gap-3 mb-3 animate-in slide-in-from-bottom-2 duration-500">
              <Button variant="outline" onClick={handleDownloadImage} disabled={isGeneratingImage} className="h-12 rounded-xl font-bold gap-2">
                <Download size={18} /> {isGeneratingImage ? 'Gerando...' : 'Imagem'}
              </Button>
              <Button onClick={handleShareWhatsApp} className="h-12 rounded-xl font-bold bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 border-0">
                <MessageCircle size={18} /> WhatsApp
              </Button>
            </div>
          )}
          
          <div className={cn("grid gap-3", isAgent ? "grid-cols-2" : "grid-cols-1")}>
            {isAgent && (
              <Button variant="outline" onClick={handlePrint} className="h-12 rounded-xl font-bold gap-2">
                <Printer size={18} /> Imprimir
              </Button>
            )}
            <Button size="lg" className="h-12 rounded-xl font-black uppercase italic text-lg lux-shine" onClick={onNewBet}>
              Nova Aposta
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
