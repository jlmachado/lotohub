
import QRCode from 'qrcode';

/**
 * @fileOverview Gerador de bilhetes em imagem (PNG) usando Canvas API.
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

  // Configurações do bilhete (formato vertical estilo recibo)
  const width = 400;
  const height = 650;
  canvas.width = width;
  canvas.height = height;

  // Fundo branco
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Bordas e detalhes decorativos
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Cabeçalho
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('LOTOHUB PREMIUM', width / 2, 50);

  ctx.strokeStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.moveTo(30, 70);
  ctx.lineTo(width - 30, 70);
  ctx.stroke();

  // Dados do Bilhete
  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 14px Arial';
  
  const drawField = (label: string, value: string, y: number) => {
    ctx.fillStyle = '#64748B';
    ctx.fillText(label, 40, y);
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 16px Courier New';
    ctx.fillText(value, 40, y + 25);
    ctx.font = 'bold 14px Arial';
  };

  drawField('POULE:', ticket.poule, 110);
  drawField('TERMINAL:', ticket.terminal, 170);
  drawField('JOGO:', ticket.jogo, 230);
  drawField('APOSTA:', ticket.aposta, 290);
  drawField('VALOR:', `R$ ${ticket.valor.toFixed(2).replace('.', ',')}`, 350);
  drawField('DATA:', ticket.data, 410);

  // Status Badge
  ctx.fillStyle = '#F1F5F9';
  ctx.roundRect?.(width - 150, 100, 110, 30, 5); // Fallback se roundRect não existir
  ctx.fill();
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.fillText(ticket.status, width - 95, 120);

  // Gerar QR Code
  const validationUrl = `${window.location.origin}/poule/${ticket.poule}`;
  const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
    margin: 1,
    width: 120,
    color: { dark: '#1E293B', light: '#FFFFFF' }
  });

  const qrImage = new Image();
  qrImage.src = qrCodeDataUrl;
  await new Promise((resolve) => { qrImage.onload = resolve; });
  ctx.drawImage(qrImage, (width / 2) - 60, 460, 120, 120);

  // Rodapé
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'italic 10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Bilhete válido somente mediante consulta', width / 2, 610);
  ctx.fillText('da poule no sistema oficial LotoHub.', width / 2, 625);

  return canvas.toDataURL('image/png');
}
