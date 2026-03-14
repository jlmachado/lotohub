import { NextResponse } from 'next/server';

/**
 * @fileOverview Rota de API para simular ou buscar dados do canal TV Snooker Brasil.
 * Em produção, aqui seria feita a chamada real à YouTube Data API v3.
 */

export async function GET() {
  try {
    // Simulação de dados reais baseados nos padrões observados no canal TV Snooker Brasil
    const mockYoutubeData = [
      {
        id: { videoId: "baianinho_maycon_live" },
        snippet: {
          title: "AO VIVO: BAIANINHO DE MAUÁ X MAYCON DE TEIXEIRA - DESAFIO DE GIGANTES MD11",
          description: "Acompanhe agora o maior desafio de sinuca do Brasil. Baianinho de Mauá vs Maycon de Teixeira na modalidade sinuquinha.",
          liveBroadcastContent: "live",
          actualStartTime: new Date().toISOString(),
          thumbnails: { medium: { url: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400" } }
        }
      },
      {
        id: { videoId: "upcoming_torneio_verao" },
        snippet: {
          title: "PRÓXIMO: BRUNINHO VS COCO - SEMIFINAL TORNEIO DE VERÃO - MD9",
          description: "Grande semifinal agendada para hoje à noite no canal TV Snooker Brasil.",
          liveBroadcastContent: "upcoming",
          scheduledStartTime: new Date(Date.now() + 3600000 * 2).toISOString(), // 2h depois
          thumbnails: { medium: { url: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400" } }
        }
      },
      {
        id: { videoId: "recent_final_video" },
        snippet: {
          title: "FINAL: FELIPINHO X ITAZINHO - CIRCUITO MINEIRO SNOOKER",
          description: "Confira como foi a final eletrizante do circuito mineiro de sinuca.",
          liveBroadcastContent: "none", // Indica vídeo/finalizado
          actualStartTime: new Date(Date.now() - 86400000).toISOString(),
          thumbnails: { medium: { url: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400" } }
        }
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockYoutubeData,
      source: 'YouTube Data API (Realistic Simulation)'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
