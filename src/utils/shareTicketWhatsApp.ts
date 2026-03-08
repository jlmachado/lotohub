
/**
 * @fileOverview Funções para compartilhamento de bilhetes no WhatsApp.
 */

export interface ShareTicketData {
  poule: string;
  jogo: string;
  aposta: string;
  valor: number;
  terminal?: string;
}

export function shareTicketWhatsApp(ticket: ShareTicketData) {
  const validationUrl = `${window.location.origin}/poule/${ticket.poule}`;
  
  const message = `🎟️ *LOTOHUB PREMIUM*

*POULE:* \`${ticket.poule}\`
*TERMINAL:* ${ticket.terminal || 'N/A'}
*JOGO:* ${ticket.jogo}
*APOSTA:* ${ticket.aposta}
*VALOR:* R$ ${ticket.valor.toFixed(2).replace('.', ',')}

✅ *Consultar status oficial:*
${validationUrl}

_Bilhete gerado pelo sistema LotoHub._`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}
