import { NextResponse } from 'next/server';

/**
 * @fileOverview Rota de API para simular ou buscar dados do canal TV Snooker Brasil.
 * Em produção, aqui seria feita a chamada real à YouTube Data API v3.
 */

export async function GET() {
  try {
    // Simulação de dados reais do canal TV Snooker Brasil
    // Em um cenário real, usaríamos: https://www.googleapis.com/youtube/v3/search?channelId=UC...
    const mockYoutubeData = [
      {
        id: { videoId: "live_now_001" },
        snippet: {
          title: "AO VIVO: BAIANINHO DE MAUÁ X MAYCON DE TEIXEIRA - DESAFIO DE GIGANTES",
          description: "Acompanhe o maior desafio de sinuca do Brasil ao vivo agora.",
          liveBroadcastContent: "live",
          actualStartTime: new Date().toISOString(),
          thumbnails: { medium: { url: "" } }
        }
      },
      {
        id: { videoId: "upcoming_002" },
        snippet: {
          title: "PRÓXIMO: BRUNINHO VS COCO - SEMIFINAL TORNEIO DE VERÃO",
          description: "Grande semifinal agendada para hoje à noite.",
          liveBroadcastContent: "upcoming",
          scheduledStartTime: new Date(Date.now() + 3600000 * 4).toISOString(), // 4h depois
          thumbnails: { medium: { url: "" } }
        }
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockYoutubeData,
      source: 'YouTube Data API (Simulated)'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
