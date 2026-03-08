'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toJpeg } from 'html-to-image';
import ResultadosJogoDoBicho from '@/components/ResultadosJogoDoBicho';
import { useAppContext } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';

interface ResultadoBicho {
  premio: string;
  milhar: string;
  grupo: string;
  animal: string;
}

export default function ResultadosPage() {
  const [loteria, setLoteria] = useState<string>('');
  const [jogoDoBichoLoteria, setJogoDoBichoLoteria] = useState<string>('');
  const [horario, setHorario] = useState<string>('');
  const [data, setData] = useState<string>('');
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [showHorarioInput, setShowHorarioInput] = useState(false);

  const [resultados, setResultados] = useState<ResultadoBicho[] | null>(null);
  const [otherResultados, setOtherResultados] = useState<string[] | null>(null);
  const [pesquisaFeita, setPesquisaFeita] = useState(false);

  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const { postedResults, jdbLoterias } = useAppContext();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const mainLoterias = [
    { id: 'jogo-do-bicho', nome: 'Jogo do Bicho' },
    { id: 'loteria-uruguai', nome: 'Loteria Uruguai' },
    { id: 'seninha', nome: 'Seninha' },
    { id: 'quininha', nome: 'Quininha' },
    { id: 'lotinha', nome: 'Lotinha' },
  ];
  
  const loteriasDisponiveisJogoDoBicho = useMemo(() => {
    return jdbLoterias.map(l => ({
      id: l.id,
      nome: l.nome,
      horarios: [...new Set(Object.values(l.dias).flatMap(d => d.selecionado ? d.horarios : []).filter(Boolean))].sort()
    }));
  }, [jdbLoterias]);

  useEffect(() => {
    let horarios: string[] = [];
    let showInput = false;

    if (loteria === 'jogo-do-bicho' && jogoDoBichoLoteria) {
      const jdbLoteria = loteriasDisponiveisJogoDoBicho.find(l => l.id === jogoDoBichoLoteria);
      if (jdbLoteria?.horarios) {
        horarios = jdbLoteria.horarios;
      } else {
        showInput = true;
      }
    } else if (loteria === 'loteria-uruguai') {
      const selectedDate = new Date(data + 'T00:00:00');
      const dayOfWeek = selectedDate.getDay(); 
      if (dayOfWeek === 6) { 
        horarios = ['21:00'];
      } else if (dayOfWeek !== 0) { 
        horarios = ['15:00', '21:00'];
      }
    } else if (['seninha', 'quininha', 'lotinha'].includes(loteria)) {
      horarios = ['20:00'];
    }

    setHorariosDisponiveis(horarios);
    setShowHorarioInput(showInput);
    setHorario(''); // Reset horario when lottery changes
  }, [loteria, jogoDoBichoLoteria, data, loteriasDisponiveisJogoDoBicho]);

  const handleLoteriaChange = (value: string) => {
    setLoteria(value);
    setJogoDoBichoLoteria('');
    setHorario('');
  };
  
  const handleJogoDoBichoLoteriaChange = (value: string) => {
    setJogoDoBichoLoteria(value);
    setHorario('');
  };

  const handlePesquisar = () => {
    setPesquisaFeita(true);
    setResultados(null);
    setOtherResultados(null);

    const foundResult = postedResults.find(r => 
        r.loteria === loteria &&
        r.data === data &&
        r.horario === horario &&
        (loteria !== 'jogo-do-bicho' || r.jogoDoBichoLoteria === jogoDoBichoLoteria)
    );

    if (foundResult) {
        if (foundResult.loteria === 'jogo-do-bicho') {
            setResultados(foundResult.resultados as ResultadoBicho[]);
        } else {
            setOtherResultados(foundResult.resultados as string[]);
        }
    }
  };

  const getResultDescription = () => {
    const loteriaPrincipal = mainLoterias.find(l => l.id === loteria)?.nome;
    const loteriaSpecifica = loteriasDisponiveisJogoDoBicho.find(l => l.id === jogoDoBichoLoteria)?.nome;
    const dataFormatada = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '';

    let description = '';
    if (loteriaPrincipal) description += loteriaPrincipal;
    if (loteriaSpecifica) description += ` - ${loteriaSpecifica}`;
    if (dataFormatada) description += ` | ${dataFormatada}`;
    if (horario) description += ` | ${horario}`;
    
    return description;
  }
  
  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const resultsNode = document.getElementById('resultados-content');
    if (!resultsNode) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar imagem',
        description: 'Não foi possível encontrar o conteúdo dos resultados para compartilhar.',
      });
      return;
    }

    const wasDarkMode = document.documentElement.classList.contains('dark');
    if (wasDarkMode) {
      document.documentElement.classList.remove('dark');
    }

    try {
      const dataUrl = await toJpeg(resultsNode, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          const element = node as HTMLElement;
          return !element.classList?.contains('print:hidden');
        },
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'resultados.jpg', { type: 'image/jpeg' });

      if (isClient && navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Resultados - ${getResultDescription()}`,
          text: `Resultados para ${getResultDescription()}`,
        });
      } else {
        const link = document.createElement('a');
        link.download = 'resultados.jpg';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: 'Imagem dos resultados baixada',
          description: 'A função de compartilhar não é suportada neste navegador. A imagem foi baixada.',
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
        toast({
          variant: 'destructive',
          title: 'Erro ao compartilhar',
          description: 'Não foi possível gerar a imagem dos resultados. Tente imprimir.',
        });
        console.error('Erro ao gerar ou compartilhar a imagem dos resultados:', error);
      }
    } finally {
      if (wasDarkMode) {
        document.documentElement.classList.add('dark');
      }
    }
  };


  return (
    <div>
      <Header />
      <main className="p-4 md:p-8 flex flex-col items-center gap-6">
        <ResultadosJogoDoBicho />

        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Pesquisar Resultados Anteriores</CardTitle>
            <CardDescription>
              Filtre pela loteria, data e horário para ver os resultados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="loteria">Loteria Principal</Label>
                <Select value={loteria} onValueChange={handleLoteriaChange}>
                  <SelectTrigger id="loteria">
                    <SelectValue placeholder="Selecione a loteria" />
                  </SelectTrigger>
                  <SelectContent>
                    {mainLoterias.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loteria === 'jogo-do-bicho' && (
                <div className="grid gap-2">
                  <Label htmlFor="jdb-loteria">Loteria (Jogo do Bicho)</Label>
                  <Select value={jogoDoBichoLoteria} onValueChange={handleJogoDoBichoLoteriaChange}>
                    <SelectTrigger id="jdb-loteria">
                      <SelectValue placeholder="Selecione a loteria específica" />
                    </SelectTrigger>
                    <SelectContent>
                      {loteriasDisponiveisJogoDoBicho.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="data">Data</Label>
                <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="horario">Horário</Label>
                {horariosDisponiveis.length > 0 ? (
                  <Select value={horario} onValueChange={setHorario} disabled={!loteria || (loteria === 'jogo-do-bicho' && !jogoDoBichoLoteria)}>
                    <SelectTrigger id="horario">
                      <SelectValue placeholder="Selecione o horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {horariosDisponiveis.map(h => (
                         <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : showHorarioInput ? (
                  <Input id="horario-input" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
                ) : (
                  <Input id="horario-disabled" type="text" placeholder="Selecione os filtros" value={horario} disabled />
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handlePesquisar} disabled={!loteria || !data || !horario}>Pesquisar</Button>
          </CardFooter>
        </Card>

        {pesquisaFeita && (
            <Card className="w-full max-w-lg" id="resultados-content">
                <CardHeader>
                    <CardTitle>Resultado da Pesquisa</CardTitle>
                    <CardDescription>{getResultDescription()}</CardDescription>
                </CardHeader>
                <CardContent>
                    {(resultados && resultados.length > 0) ? (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Prêmio</TableHead>
                                <TableHead>Milhar</TableHead>
                                <TableHead>Grupo</TableHead>
                                <TableHead className="text-right">Bicho</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resultados.map((res) => (
                                <TableRow key={res.premio}>
                                    <TableCell className="font-medium">{res.premio}</TableCell>
                                    <TableCell className="font-mono">{res.milhar}</TableCell>
                                    <TableCell className="font-mono">{res.grupo}</TableCell>
                                    <TableCell className="text-right">{res.animal}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (otherResultados && otherResultados.length > 0) ? (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {otherResultados.map((res, i) => (
                                <Badge key={i} variant="secondary" className="text-lg font-mono">{res}</Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Nenhum resultado encontrado para os filtros selecionados.</p>
                    )}
                </CardContent>
                {((resultados && resultados.length > 0) || (otherResultados && otherResultados.length > 0)) && (
                  <CardFooter className="grid grid-cols-2 gap-4 print:hidden">
                    <Button variant="outline" className="w-full" onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Compartilhar
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handlePrint}>
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                  </CardFooter>
                )}
            </Card>
        )}

      </main>
    </div>
  );
}
