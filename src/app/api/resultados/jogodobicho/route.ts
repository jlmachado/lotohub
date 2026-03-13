import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

/**
 * @fileOverview Scraper Multiestado para PortalBrasil.net
 * Captura resultados de 13 regiões diferentes de forma paralela.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PORTAL_BRASIL_STATES = [
  { code: "RJ", name: "Rio de Janeiro", url: "https://portalbrasil.net/jogodobicho/resultado-do-jogo-do-bicho/" },
  { code: "SP", name: "São Paulo", url: "https://portalbrasil.net/jogodobicho/sao-paulo/" },
  { code: "BA", name: "Bahia", url: "https://portalbrasil.net/jogodobicho/bahia/" },
  { code: "GO", name: "Goiás", url: "https://portalbrasil.net/jogodobicho/goias/" },
  { code: "DF", name: "Brasília", url: "https://portalbrasil.net/jogodobicho/brasilia-df/" },
  { code: "PB", name: "Paraíba", url: "https://portalbrasil.net/jogodobicho/paraiba/" },
  { code: "MG", name: "Minas Gerais", url: "https://portalbrasil.net/jogodobicho/minas-gerais/" },
  { code: "CE", name: "Ceará", url: "https://portalbrasil.net/jogodobicho/ceara/" },
  { code: "PR", name: "Paraná", url: "https://portalbrasil.net/jogodobicho/parana/" },
  { code: "PE", name: "Pernambuco", url: "https://portalbrasil.net/jogodobicho/pernambuco/" },
  { code: "RN", name: "Rio Grande do Norte", url: "https://portalbrasil.net/jogodobicho/rio-grande-do-norte/" },
  { code: "RS", name: "Rio Grande do Sul", url: "https://portalbrasil.net/jogodobicho/rio-grande-do-sul/" },
  { code: "SE", name: "Sergipe", url: "https://portalbrasil.net/jogodobicho/sergipe/" }
];

async function scrapeState(state: typeof PORTAL_BRASIL_STATES[0]) {
  try {
    const response = await fetch(state.url, {
      next: { revalidate: 60 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: any[] = [];

    // 1. Tentar extrair a data global da página
    let pageDate = new Date().toISOString().split('T')[0];
    const fullText = $('body').text();
    const dateMatch = fullText.match(/(\d{2})\/(\d{2})\/(\d{4})/) || fullText.match(/(\d{2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
    
    if (dateMatch) {
      if (dateMatch[3]) {
        if (dateMatch[0].includes('/')) {
           pageDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        } else {
           const meses: Record<string, string> = {
             'janeiro': '01', 'fevereiro': '02', 'marco': '03', 'março': '03', 'abril': '04', 'maio': '05', 'junho': '06',
             'julho': '07', 'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
           };
           const mes = meses[dateMatch[2].toLowerCase()] || '01';
           pageDate = `${dateMatch[3]}-${mes}-${dateMatch[1].padStart(2, '0')}`;
        }
      }
    }

    // 2. Percorrer Headings (h3 ou h2) que contêm o padrão de horário/extração
    $('h3, h2').each((_, el) => {
      const title = $(el).text().trim();
      const drawMatch = title.match(/das\s+(\d{2})h(\d{2})\s*[–-]\s*([A-ZÇÃÕÉÊÍÓÚ\s]+)/i);
      if (!drawMatch) return;

      const time = `${drawMatch[1]}:${drawMatch[2]}`;
      const extractionName = drawMatch[3].trim();

      let contentText = "";
      let nextElem = $(el).next();
      while (nextElem.length > 0 && !['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(nextElem.get(0).tagName)) {
        contentText += nextElem.text() + "\n";
        nextElem = nextElem.next();
      }

      if (!contentText.trim() || contentText.includes("clique aqui para atualizar") || contentText.includes("Não há extrações")) return;

      const lines = contentText.split('\n');
      const prizes: any[] = [];
      lines.forEach(line => {
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

      if (prizes.length >= 5) {
        results.push({
          stateName: state.name,
          stateCode: state.code,
          extractionName,
          time,
          date: pageDate,
          prizes: prizes.sort((a, b) => a.position - b.position),
          checksum: prizes.map(p => p.milhar).join('|')
        });
      }
    });

    return results;
  } catch (error) {
    console.error(`[JDB Scraper] Erro ao processar ${state.code}:`, error);
    return [];
  }
}

export async function GET() {
  try {
    // Execução paralela para melhor performance
    const allResultsArrays = await Promise.all(PORTAL_BRASIL_STATES.map(scrapeState));
    const flattenedResults = allResultsArrays.flat();

    return NextResponse.json({
      success: true,
      source: 'Portal Brasil Multi-State',
      count: flattenedResults.length,
      data: flattenedResults
    });

  } catch (error: any) {
    console.error('[JDB Scraper API] Erro Crítico:', error.message);
    return NextResponse.json({ error: 'Falha na captura automática', details: error.message }, { status: 500 });
  }
}
