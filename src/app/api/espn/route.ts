import { NextResponse } from 'next/server';

/**
 * @fileOverview Redirecionador legado para manter compatibilidade básica.
 * Prefira as rotas modais em /api/espn/[resource].
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource') || 'scoreboard';
  const league = searchParams.get('league') || 'bra.1';
  
  // Redireciona internamente para a nova estrutura se necessário,
  // ou apenas avisa que deve ser atualizado.
  return NextResponse.json({ 
    ok: false, 
    message: 'Esta rota genérica foi desativada. Use /api/espn/[recurso]?league=...' 
  }, { status: 410 });
}
