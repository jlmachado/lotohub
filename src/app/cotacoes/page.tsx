'use client';

import { Header } from '@/components/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MODALIDADES_PADRAO } from '@/constants/loterias';

export default function CotacoesPage() {
  const cotacoesJogoDoBicho = (Array.isArray(MODALIDADES_PADRAO) ? MODALIDADES_PADRAO : []).map(m => ({ 
    modalidade: m.nome, 
    cotacao: `${m.multiplicador}x`
  }));

  const cotacoesLoteriaUruguai = [
    { modalidade: '3 Dígitos', cotacao: '500x' },
    { modalidade: '2 Dígitos', cotacao: '70x' },
    { modalidade: '1 Dígito', cotacao: '7x' },
  ];

  const cotacoesSeninha = [
    { modalidade: 'SENINHA 14D', cotacao: '5000x' },
    { modalidade: 'SENINHA 15D', cotacao: '3500x' },
    { modalidade: 'SENINHA 16D', cotacao: '2000x' },
    { modalidade: 'SENINHA 17D', cotacao: '1500x' },
    { modalidade: 'SENINHA 18D', cotacao: '850x' },
    { modalidade: 'SENINHA 19D', cotacao: '650x' },
    { modalidade: 'SENINHA 20D', cotacao: '500x' },
    { modalidade: 'SENINHA 25D', cotacao: '110x' },
    { modalidade: 'SENINHA 30D', cotacao: '28x' },
    { modalidade: 'SENINHA 35D', cotacao: '8x' },
    { modalidade: 'SENINHA 40D', cotacao: '5x' },
  ];

  const cotacoesQuininha = [
    { modalidade: 'QUININHA 13D', cotacao: '5000x' },
    { modalidade: 'QUININHA 14D', cotacao: '3900x' },
    { modalidade: 'QUININHA 15D', cotacao: '2700x' },
    { modalidade: 'QUININHA 16D', cotacao: '2200x' },
    { modalidade: 'QUININHA 17D', cotacao: '1600x' },
    { modalidade: 'QUININHA 18D', cotacao: '1100x' },
    { modalidade: 'QUININHA 19D', cotacao: '800x' },
    { modalidade: 'QUININHA 20D', cotacao: '700x' },
    { modalidade: 'QUININHA 25D', cotacao: '180x' },
    { modalidade: 'QUININHA 30D', cotacao: '65x' },
    { modalidade: 'QUININHA 35D', cotacao: '29x' },
    { modalidade: 'QUININHA 40D', cotacao: '10x' },
    { modalidade: 'QUININHA 45D', cotacao: '7x' },
  ];

  const cotacoesLotinha = [
    { modalidade: 'LOTINHA 16D', cotacao: '5.000x' },
    { modalidade: 'LOTINHA 17D', cotacao: '200x' },
    { modalidade: 'LOTINHA 18D', cotacao: '100x' },
    { modalidade: 'LOTINHA 19D', cotacao: '50x' },
    { modalidade: 'LOTINHA 20D', cotacao: '25x' },
    { modalidade: 'LOTINHA 21D', cotacao: '15x' },
    { modalidade: 'LOTINHA 22D', cotacao: '8x' },
  ];

  const loterias = [
    {
      nome: 'Jogo do Bicho',
      data: cotacoesJogoDoBicho,
      descricao:
        'Cotações padrão. A cotação é dividida pelo número de prêmios (colocação) escolhidos. Ex: 1º ao 2º prêmio divide a cotação por 2.',
    },
    {
      nome: 'Loteria Uruguai',
      data: cotacoesLoteriaUruguai,
      descricao:
        'A cotação é dividida pelo número de prêmios escolhidos. Ex: Apostar até o 10º prêmio divide a cotação por 10.',
    },
    { nome: 'Seninha', data: cotacoesSeninha, descricao: 'Acerte as 6 dezenas sorteadas para ganhar.' },
    { nome: 'Quininha', data: cotacoesQuininha, descricao: 'Acerte as 5 dezenas sorteadas para ganhar.' },
    { nome: 'Lotinha', data: cotacoesLotinha, descricao: 'Acerte as 15 dezenas sorteadas para ganhar.' },
  ];

  return (
    <div>
      <Header />
      <main className="p-4 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold">Cotações das Loterias</h1>
        {loterias.map((loteria) => (
          <Card key={loteria.nome}>
            <CardHeader>
              <CardTitle>{loteria.nome}</CardTitle>
              {loteria.descricao && (
                <CardDescription>{loteria.descricao}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modalidade</TableHead>
                    <TableHead className="text-right">Cotação (Prêmio)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(loteria.data) && loteria.data.map((cotacao) => (
                    <TableRow key={cotacao.modalidade}>
                      <TableCell className="font-medium">
                        {cotacao.modalidade}
                      </TableCell>
                      <TableCell className="text-right">
                        {cotacao.cotacao}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
