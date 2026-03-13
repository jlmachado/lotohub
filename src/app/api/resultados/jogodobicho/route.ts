import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

/**
 * @fileOverview Scraper Profissional para PortalBrasil.net (CORRIGIDO)
 * Extrai resultados reais do Jogo do Bicho ignorando variações de heading e 
 * assumindo RJ como estado padrão da página principal.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const url = 'https://portalbrasil.net/jogodobicho/resultado-do-jogo-do-bicho/';

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Erro ao acessar fonte externa' }, { status: 502 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: any[] = [];

    // 1. Tentar extrair a data global da página
    let pageDate = new Date().toISOString().split('T')[0];
    const fullText = $('body').text();
    const dateMatch = fullText.match(/(\d{2})\/(\d{2})\/(\d{4})/) || fullText.match(/(\d{2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
    
    if (dateMatch) {
      if (dateMatch[3]) { // Formato DD/MM/YYYY
        pageDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }
    }

    // 2. Percorrer Headings (h3 ou h2) que contêm o padrão de horário/extração
    $('h3, h2').each((_, el) => {
      const title = $(el).text().trim();
      
      // Regex para capturar Horário e Sigla (Ex: ...das 11h00 – PTM)
      // Suporta hífens simples, travessões e espaços variados
      const drawMatch = title.match(/das\s+(\d{2})h(\d{2})\s*[–-]\s*([A-ZÇÃÕÉÊÍÓÚ\s]+)/i);
      if (!drawMatch) return;

      const hours = drawMatch[1];
      const minutes = drawMatch[2];
      const time = `${hours}:${minutes}`;
      const extractionName = drawMatch[3].trim();

      // 3. Coletar todo o texto útil entre este heading e o próximo
      let contentText = "";
      let nextElem = $(el).next();
      
      while (nextElem.length > 0 && !['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(nextElem.get(0).tagName)) {
        contentText += nextElem.text() + "\n";
        nextElem = nextElem.next();
      }

      if (!contentText.trim() || contentText.includes("clique aqui para atualizar") || contentText.includes("Não há extrações")) {
        return;
      }

      // 4. Parsear linhas de prêmio dentro do bloco de texto acumulado
      const lines = contentText.split('\n');
      const prizes: any[] = [];

      lines.forEach(line => {
        // Regex robusta para capturar posição e milhar
        // Padrão esperado: 1º ► 0718-05 — CACHORRO ou 1º 0718-05
        const prizeMatch = line.match(/(\d+)[º°]?.*?(\d{3,4})-(\d{2})\s*[—–-]?\s*(.*)/i);
        
        if (prizeMatch) {
          const milhar = prizeMatch[2].padStart(4, '0');
          prizes.push({
            position: parseInt(prizeMatch[1], 10),
            milhar,
            centena: milhar.slice(-3),
            dezena: milhar.slice(-2),
            grupo: prizeMatch[3],
            animal: (prizeMatch[4] || "").trim().toUpperCase()
          });
        }
      });

      // 5. Validar consistência (Mínimo de 5 prêmios para ser considerado válido)
      if (prizes.length >= 5) {
        results.push({
          stateName: "Rio de Janeiro",
          stateCode: "RJ",
          extractionName,
          time,
          date: pageDate,
          prizes: prizes.sort((a, b) => a.position - b.position),
          checksum: prizes.map(p => p.milhar).join('|')
        });
      }
    });

    return NextResponse.json({
      success: true,
      source: 'Portal Brasil',
      date: pageDate,
      count: results.length,
      data: results
    });

  } catch (error: any) {
    console.error('[JDB Scraper API] Erro Crítico:', error.message);
    return NextResponse.json({ error: 'Falha na captura automática', details: error.message }, { status: 500 });
  }
}
