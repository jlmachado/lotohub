import { NextResponse } from 'next/server';

/**
 * @fileOverview Rota de API para simular dados de canais de sinuca.
 * Atualizada para retornar apenas IDs sintaticamente válidos e sinalizar mocks.
 */

export async function GET() {
  try {
    // IDs reais de 11 caracteres para testes de UI que não quebrem o player (Exemplos de lives genéricas)
    const mockYoutubeData = [
      {
        id: { videoId: "hW_W_L7R_As" }, // ID sintático 1
        snippet: {
          title: "AO VIVO: BAIANINHO DE MAUÁ X MAYCON DE TEIXEIRA - DESAFIO DE GIGANTES",
          description: "Acompanhe agora o maior desafio de sinuca do Brasil. Baianinho de Mauá vs Maycon de Teixeira.",
          liveBroadcastContent: "live",
          actualStartTime: new Date().toISOString(),
          thumbnails: { medium: { url: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=400" } }
        },
        isMock: true,
        isEmbeddableCandidate: true
      },
      {
        id: { videoId: "L_jWHffIx5E" }, // ID sintático 2
        snippet: {
          title: "PRÓXIMO: BRUNINHO VS COCO - SEMIFINAL TORNEIO DE VERÃO",
          description: "Grande semifinal agendada no canal TV Snooker Brasil.",
          liveBroadcastContent: "upcoming",
          scheduledStartTime: new Date(Date.now() + 3600000 * 2).toISOString(),
          thumbnails: { medium: { url: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=400" } }
        },
        isMock: true,
        isEmbeddableCandidate: true
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
