import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

/**
 * @fileOverview Scraper Multiestado para PortalBrasil.net
 * Versão V4: Suporte a premiações variáveis (1-10) e segmentação inteligente de seções.
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(state.url, {
      next: { revalidate: 60 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: any[] = [];

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

    $('h3, h2').each((_, el) => {
      const title = $(el).text().trim();
      const timeMatch = title.match(/(\d{2})h(\d{2})/i);
      if (!timeMatch) return;

      const time = `${timeMatch[1]}:${timeMatch[2]}`;
      
      let baseExtractionName = title
        .replace(/Resultado do Jogo do Bicho de Hoje/i, '')
        .replace(/Resultado da/i, '')
        .replace(/das \d{2}h\d{2}/i, '')
        .replace(/\d{2}h\d{2}/i, '')
        .replace(/[–-]/g, '')
        .replace(new RegExp(state.name, 'gi'), '')
        .replace(/Loterias/gi, '')
        .replace(/Brasília DF/gi, '')
        .replace(/São Paulo/gi, '')
        .trim();

      if (!baseExtractionName) baseExtractionName = `Extração ${time}`;

      let contentText = "";
      let nextElem = $(el).next();
      while (nextElem.length > 0 && !['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(nextElem.get(0).tagName)) {
        contentText += nextElem.text() + "\n";
        nextElem = nextElem.next();
      }

      if (!contentText.trim() || contentText.includes("clique aqui para atualizar")) return;

      // Suporte para estados com múltiplas bancas (ex: Bahia)
      const bankSubHeaders = contentText.match(/Resultado do jogo do bicho ([A-ZÇÃÕÉÊÍÓÚ\s]{3,})/gi);
      
      if (bankSubHeaders && bankSubHeaders.length > 1) {
        bankSubHeaders.forEach((subHeader, idx) => {
          const bankName = subHeader.replace(/Resultado do jogo do bicho/i, '').trim();
          const startIdx = contentText.indexOf(subHeader);
          const endIdx = idx < bankSubHeaders.length - 1 ? contentText.indexOf(bankSubHeaders[idx+1]) : contentText.length;
          const subBlockText = contentText.substring(startIdx, endIdx);
          
          const prizes = parsePrizesFromText(subBlockText);
          if (prizes.length >= 5) {
            results.push(buildResultObject(state, bankName, time, pageDate, prizes));
          }
        });
      } else {
        const prizes = parsePrizesFromText(contentText);
        if (prizes.length >= 5) {
          results.push(buildResultObject(state, baseExtractionName, time, pageDate, prizes));
        }
      }
    });

    return results;
  } catch (error) {
    console.warn(`[JDB Scraper] Falha em ${state.code}`);
    return [];
  }
}

function parsePrizesFromText(text: string) {
  // Regex para detectar seções como "Resultados do 1º ao 10º"
  const sectionSplitRegex = /Resultados\s+do\s+1º\s+ao\s+(\d+)[º°]/gi;
  const sections: { count: number, content: string }[] = [];
  let match;
  let lastPos = 0;

  // Encontra todas as seções
  const matches = Array.from(text.matchAll(sectionSplitRegex));
  
  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const start = currentMatch.index! + currentMatch[0].length;
      const end = i < matches.length - 1 ? matches[i+1].index! : text.length;
      
      sections.push({
        count: parseInt(currentMatch[1], 10),
        content: text.substring(start, end)
      });
    }

    // Processa cada seção e escolhe a mais completa que tenha prêmios válidos
    const parsedSections = sections.map(s => ({
      count: s.count,
      prizes: parseRawLines(s.content)
    })).filter(s => s.prizes.length >= 5);

    if (parsedSections.length > 0) {
      // Ordena por quantidade de prêmios (mais completo primeiro)
      parsedSections.sort((a, b) => b.prizes.length - a.prizes.length);
      return parsedSections[0].prizes;
    }
  }

  // Fallback se não encontrar cabeçalhos de seção
  return parseRawLines(text);
}

function parseRawLines(text: string) {
  const lines = text.split('\n');
  const prizes: any[] = [];
  const seen = new Set();

  lines.forEach(line => {
    // Regex tolerante para linhas de prêmio (1º ao 10º)
    const prizeMatch = line.match(/(\d+)[º°]?\s*[►»\-:]?\s*(\d{3,4})-(\d{2})\s*[—–-]?\s*([A-ZÇÃÕÉÊÍÓÚ\s]+)/i);
    if (prizeMatch) {
      const position = parseInt(prizeMatch[1], 10);
      if (seen.has(position)) return;
      seen.add(position);

      const milhar = prizeMatch[2].padStart(4, '0');
      prizes.push({
        position,
        milhar,
        centena: milhar.slice(-3),
        dezena: milhar.slice(-2),
        grupo: prizeMatch[3],
        animal: (prizeMatch[4] || "").trim().toUpperCase()
      });
    }
  });
  return prizes.sort((a, b) => a.position - b.position);
}

function buildResultObject(state: any, extractionName: string, time: string, date: string, prizes: any[]) {
  return {
    stateName: state.name,
    stateCode: state.code,
    extractionName: extractionName || `Extração ${time}`,
    time,
    date,
    prizes,
    sourceName: 'Portal Brasil',
    checksum: prizes.map(p => p.milhar).join('|')
  };
}

export async function GET() {
  try {
    const allResultsArrays = await Promise.all(PORTAL_BRASIL_STATES.map(scrapeState));
    const flattenedResults = allResultsArrays.flat();

    return NextResponse.json({
      success: true,
      source: 'Portal Brasil Professional V4',
      count: flattenedResults.length,
      data: flattenedResults
    });

  } catch (error: any) {
    console.error('[JDB Scraper API] Erro:', error.message);
    return NextResponse.json({ error: 'Falha na captura automática', details: error.message }, { status: 500 });
  }
}
