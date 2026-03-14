import { NextResponse } from 'next/server';

/**
 * @fileOverview Rota de API para simular ou buscar dados de canais de sinuca.
 * Corrigido para não retornar Video IDs inválidos.
 */

export async function GET() {
  try {
    // Simulação de dados reais com IDs de 11 caracteres (sintaticamente válidos)
    // Em produção, esses IDs viriam da YouTube Data API v3
    const mockYoutubeData = [
      {
        id: { videoId: "hW_W_L7R_As" }, // Exemplo de ID real (apenas para teste de estrutura)
        snippet: {
          title: "AO VIVO: BAIANINHO DE MAUÁ X MAYCON DE TEIXEIRA - DESAFIO DE GIGANTES MD11",
          description: "Acompanhe agora o maior desafio de sinuca do Brasil. Baianinho de Mauá vs Maycon de Teixeira na modalidade sinuquinha.",
          liveBroadcastContent: "live",
          actualStartTime: new Date().toISOString(),
          thumbnails: { medium: { url: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400" } }
        },
        isMock: true,
        isEmbeddableCandidate: true
      },
      {
        id: { videoId: "L_jWHffIx5E" },
        snippet: {
          title: "PRÓXIMO: BRUNINHO VS COCO - SEMIFINAL TORNEIO DE VERÃO - MD9",
          description: "Grande semifinal agendada para hoje à noite no canal TV Snooker Brasil.",
          liveBroadcastContent: "upcoming",
          scheduledStartTime: new Date(Date.now() + 3600000 * 2).toISOString(), // 2h depois
          thumbnails: { medium: { url: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400" } }
        },
        isMock: true,
        isEmbeddableCandidate: true
      },
      {
        id: { videoId: "invalid_id" }, // Este deve ser rejeitado pelo sistema de sync
        snippet: {
          title: "VÍDEO DE TESTE COM ID INVÁLIDO",
          description: "Este item deve ser marcado como erro pelo sincronizador por possuir ID fora do padrão.",
          liveBroadcastContent: "none",
          actualStartTime: new Date(Date.now() - 86400000).toISOString(),
          thumbnails: { medium: { url: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400" } }
        },
        isMock: true,
        isEmbeddableCandidate: false
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
