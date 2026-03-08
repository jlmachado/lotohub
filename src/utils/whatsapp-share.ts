
/**
 * @fileOverview Funções para compartilhamento de bilhetes no WhatsApp.
 */

export interface ShareTicketData {
  poule: string;
  jogo: string;
  aposta: string;
  valor: number;
}

export function shareTicketWhatsApp(ticket: ShareTicketData) {
  const validationUrl = `${window.location.origin}/poule/${ticket.poule}`;
  
  const message = `🎟️ *LOTOHUB PREMIUM*

*POULE:* \`${ticket.poule}\`
*JOGO:* ${ticket.jogo}
*APOSTA:* ${ticket.aposta}
*VALOR:* R$ ${ticket.valor.toFixed(2).replace('.', ',')}

✅ *Consultar status do bilhete:*
${validationUrl}

_Bilhete oficial gerado pelo sistema LotoHub._`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}
