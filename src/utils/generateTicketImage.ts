/**
 * @fileOverview Gerador de bilhetes em imagem (PNG) usando Canvas API.
 * Versão V4: Otimizado para compartilhamento, removido QR Code.
 */

export interface TicketImageData {
  poule: string;
  terminal: string;
  jogo: string;
  aposta: string;
  valor: number;
  data: string;
  status: string;
}

export async function generateTicketImage(ticket: TicketImageData): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Não foi possível obter o contexto do canvas');

  // Largura fixa para mobile/compartilhamento
  const width = 450;
  const height = 600;
  canvas.width = width;
  canvas.height = height;

  // Fundo Premium
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);

  // Bordas Decorativas
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 4;
  ctx.strokeRect(15, 15, width - 30, height - 30);

  // Cabeçalho - Marca
  ctx.fillStyle = '#FBBF24';
  ctx.font = '900 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('LOTOHUB PREMIUM', width / 2, 70);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('COMPROVANTE DE APOSTA', width / 2, 100);

  // Linha divisória
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 120);
  ctx.lineTo(width - 40, 120);
  ctx.stroke();

  // Dados do Bilhete - Corpo
  ctx.textAlign = 'left';
  
  const drawField = (label: string, value: string, y: number, isHighlight = false) => {
    ctx.fillStyle = isHighlight ? '#FBBF24' : '#94A3B8';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(label, 50, y);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = isHighlight ? '900 22px Courier New' : 'bold 16px Courier New';
    
    // Suporte a multiline para detalhes longos
    if (value.length > 35) {
      const words = value.split(' ');
      let line = '';
      let lineY = y + 25;
      for (const word of words) {
        if ((line + word).length > 35) {
          ctx.fillText(line, 50, lineY);
          line = word + ' ';
          lineY += 20;
        } else {
          line += word + ' ';
        }
      }
      ctx.fillText(line, 50, lineY);
      return lineY + 10;
    } else {
      ctx.fillText(value, 50, y + 25);
      return y + 45;
    }
  };

  let currentY = 160;
  currentY = drawField('POULE / IDENTIFICADOR', ticket.poule, currentY);
  currentY = drawField('EXTRAÇÃO / HORÁRIO', ticket.jogo, currentY + 15, true);
  currentY = drawField('DETALHES DA APOSTA', ticket.aposta, currentY + 15);
  currentY = drawField('VALOR APOSTADO', `R$ ${ticket.valor.toFixed(2).replace('.', ',')}`, currentY + 15);
  currentY = drawField('DATA DO REGISTRO', ticket.data, currentY + 15);
  currentY = drawField('TERMINAL', ticket.terminal, currentY + 15);

  // Rodapé
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(ticket.status === 'PENDENTE' ? 'AGUARDANDO SORTEIO' : ticket.status, width / 2, height - 60);
  
  ctx.fillStyle = '#64748B';
  ctx.font = 'italic 10px Arial';
  ctx.fillText('Acesse lotohub.com para validar esta poule.', width / 2, height - 40);

  return canvas.toDataURL('image/png');
}