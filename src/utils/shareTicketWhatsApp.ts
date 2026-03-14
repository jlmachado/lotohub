
/**
 * @fileOverview Funções para compartilhamento de bilhetes no WhatsApp sem dependência de QR Code.
 * Versão V3: Texto limpo, organizado e focado nos dados regionais.
 */

export interface ShareTicketData {
  poule: string;
  jogo: string;
  aposta: string;
  valor: number;
  terminal?: string;
}

export function shareTicketWhatsApp(ticket: ShareTicketData) {
  // Removido link de QR/Validação para focar em dados textuais puros e seguros
  const message = `🎟️ *LOTOHUB PREMIUM*
----------------------------
*POULE:* \`${ticket.poule}\`
*TERMINAL:* ${ticket.terminal || 'N/A'}
----------------------------
*DADOS DA EXTRAÇÃO*
*LOCAL/HORÁRIO:* ${ticket.jogo}
----------------------------
*PALPITES:*
${ticket.aposta}
----------------------------
*VALOR TOTAL:* R$ ${ticket.valor.toFixed(2).replace('.', ',')}

✅ _Consulte este bilhete informando a poule no painel oficial LotoHub._
_Boa sorte!_`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}
