import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

/**
 * @fileOverview Scraper Multiestado para PortalBrasil.net
 * Captura resultados de 13 regiões diferentes de forma paralela.
 * Parser robusto para diferentes formatos de heading por estado.
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
    // O parser agora localiza o horário e limpa o título para achar o nome da banca/extração
    $('h3, h2').each((_, el) => {
      const title = $(el).text().trim();
      const timeMatch = title.match(/(\d{2})h(\d{2})/i);
      if (!timeMatch) return;

      const time = `${timeMatch[1]}:${timeMatch[2]}`;
      
      // Tenta extrair o nome da banca/extração limpando o título
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

      // Se ficou vazio, usa o horário como nome
      if (!baseExtractionName) baseExtractionName = `Extração ${time}`;

      // 3. Capturar todo o conteúdo até o próximo heading
      let contentText = "";
      let nextElem = $(el).next();
      while (nextElem.length > 0 && !['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(nextElem.get(0).tagName)) {
        contentText += nextElem.text() + "\n";
        nextElem = nextElem.next();
      }

      if (!contentText.trim() || contentText.includes("clique aqui para atualizar") || contentText.includes("Não há extrações")) return;

      // 4. Lógica de Múltiplas Bancas no mesmo bloco (Ex: Bahia - Paratodos e Maluca)
      // Se detectarmos subtítulos internos de banca, dividimos o bloco
      const bankSubHeaders = contentText.match(/Resultado do jogo do bicho ([A-ZÇÃÕÉÊÍÓÚ\s]{3,})/gi);
      
      if (bankSubHeaders && bankSubHeaders.length > 1) {
        // Bloco múltiplo detectado
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
        // Bloco simples
        const prizes = parsePrizesFromText(contentText);
        if (prizes.length >= 5) {
          results.push(buildResultObject(state, baseExtractionName, time, pageDate, prizes));
        }
      }
    });

    return results;
  } catch (error) {
    console.error(`[JDB Scraper] Erro ao processar ${state.code}:`, error);
    return [];
  }
}

/**
 * Extrai prêmios de um bloco de texto usando regex tolerante
 */
function parsePrizesFromText(text: string) {
  const lines = text.split('\n');
  const prizes: any[] = [];
  
  lines.forEach(line => {
    // Regex tolerante para: 1º ► 6558-15 — JACARÉ
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
  
  return prizes.sort((a, b) => a.position - b.position);
}

/**
 * Monta o objeto de resultado no padrão do sistema
 */
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
