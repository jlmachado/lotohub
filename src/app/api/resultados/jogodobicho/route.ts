import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Define the structure for a single result item
interface ResultadoItem {
    pos: number;
    numero: string;
    grupo: string;
    bicho: string;
}

// Define the structure for an extraction (e.g., PTM, PT, PTV)
interface Extracao {
    titulo: string;
    itens: ResultadoItem[];
}

// Define the overall structure of the API response
interface ApiResponse {
    data: string;
    fonte: string;
    extracoes: Extracao[];
}

export async function GET() {
    const url = 'https://portalbrasil.net/jogodobicho/resultado-do-jogo-do-bicho/';

    try {
        // Fetch the HTML from the target website with a 60-second revalidation cache
        const response = await fetch(url, {
            next: { revalidate: 60 },
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Falha ao buscar dados. Status: ${response.status}` }, { status: 502 });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const extracoes: Extracao[] = [];
        let dataResultado = new Date().toLocaleDateString('pt-BR'); // Default to today

        // Find all result blocks. The site uses h3 tags for titles.
        $('h3.wp-block-heading').each((i, el) => {
            const tituloEl = $(el);
            const tituloCompleto = tituloEl.text().trim();

            // Example title: "### Resultado do Jogo do Bicho de Hoje das 09h00 – PPT"
            const match = tituloCompleto.match(/(\d{2}h\d{2})\s*–\s*([A-Z]+)/);
            if (!match) return;

            const titulo = `${match[1]} – ${match[2]}`;
            
            // The results are in a <p> tag immediately following the <h3>
            // The structure is inconsistent, so we look for the next element that contains the results
            let pElement = tituloEl.next();
            while(pElement.length > 0 && pElement.get(0)?.tagName !== 'p' && !pElement.text().includes('►')) {
                pElement = pElement.next();
            }

            const textoResultados = pElement.text();
            if (!textoResultados) return;

            const itens: ResultadoItem[] = [];
            const linhas = textoResultados.split('\n').filter(line => line.trim().length > 0);
            
            // Regex to capture: 1º ► 0718-05 — CACHORRO
            const regex = /(\d+)º\s*►\s*(\d{4})-(\d{2})\s*—\s*([A-Z\sÁÉÍÓÚÃÕÇ]+)/;

            linhas.forEach(linha => {
                const itemMatch = linha.match(regex);
                if (itemMatch) {
                    const [, pos, numero, grupo, bicho] = itemMatch;
                    itens.push({
                        pos: parseInt(pos, 10),
                        numero: numero.trim(),
                        grupo: grupo.trim(),
                        bicho: bicho.trim(),
                    });
                }
            });

            if (itens.length > 0) {
                extracoes.push({ titulo, itens });
            }
        });
        
        // Try to get a more specific date from the page title
        const pageTitle = $('title').text();
        const dateMatch = pageTitle.match(/(\d{2}\/\d{2}\/\d{4})/);
        if(dateMatch) {
            dataResultado = dateMatch[0];
        }

        if (extracoes.length === 0) {
            return NextResponse.json({ error: 'Nenhuma extração encontrada. O layout do site pode ter mudado.' }, { status: 502 });
        }

        const apiResponse: ApiResponse = {
            data: dataResultado,
            fonte: 'portalbrasil.net',
            extracoes,
        };

        return NextResponse.json(apiResponse);

    } catch (error) {
        console.error('Erro no scraping dos resultados:', error);
        return NextResponse.json({ error: 'Erro interno do servidor ao processar a solicitação.' }, { status: 500 });
    }
}

// This line is crucial for deploying to Vercel/Next.js hosting environments
export const dynamic = 'force-dynamic';
