import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getGroupByNumber, getBichoByGroup } from '@/utils/jdb-constants';

/**
 * @fileOverview Scraper Profissional para PortalBrasil.net
 * Extrai resultados multi-estado e normaliza para o sistema.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const url = 'https://portalbrasil.net/jogodobicho/resultado-do-jogo-do-bicho/';

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Erro ao acessar fonte externa' }, { status: 502 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: any[] = [];

    // Tentar extrair a data global da página
    let pageDate = new Date().toISOString().split('T')[0];
    const dateMatch = $('title').text().match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      pageDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // O PortalBrasil organiza por blocos de extração dentro de h3 ou h2
    $('h3.wp-block-heading, h2.wp-block-heading').each((_, el) => {
      const title = $(el).text().trim();
      
      // Regex para capturar Estado e Horário (Ex: Rio de Janeiro das 11h00 – PTM)
      const stateMatch = title.match(/(.*?)\s+das\s+(\d{2}h\d{2})\s*[–-]\s*(.*)/i);
      if (!stateMatch) return;

      const stateName = stateMatch[1].trim();
      const time = stateMatch[2].replace('h', ':');
      const extractionName = stateMatch[3].trim();

      // Buscar o parágrafo de resultados logo abaixo do título
      let contentPara = $(el).next();
      while (contentPara.length > 0 && contentPara.get(0).tagName !== 'p') {
        contentPara = contentPara.next();
      }

      const rawLines = contentPara.text().split('\n').filter(l => l.includes('►') || l.includes('º'));
      if (rawLines.length === 0) return;

      const prizes = rawLines.map(line => {
        // Formato esperado: 1º ► 0718-05 — CACHORRO
        const match = line.match(/(\d+)º.*?►\s*(\d{4})-(\d{2})\s*[—–-]\s*(.*)/);
        if (match) {
          const milhar = match[2];
          return {
            position: parseInt(match[1], 10),
            milhar,
            centena: milhar.slice(-3),
            dezena: milhar.slice(-2),
            grupo: match[3],
            animal: match[4].trim()
          };
        }
        return null;
      }).filter(Boolean);

      if (prizes.length > 0) {
        results.push({
          stateName,
          extractionName,
          time,
          date: pageDate,
          prizes,
          checksum: prizes.map(p => p.milhar).join('|')
        });
      }
    });

    return NextResponse.json({
      success: true,
      date: pageDate,
      source: 'Portal Brasil',
      count: results.length,
      data: results
    });

  } catch (error: any) {
    console.error('[JDB Scraper API] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
