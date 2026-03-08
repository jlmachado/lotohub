
'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';

export default function SacarPage() {
  const [valor, setValor] = useState('');
  const [tipoChave, setTipoChave] = useState('');
  const [chavePix, setChavePix] = useState('');
  const { toast } = useToast();
  const { terminal } = useAppContext();
  const numeroSuporte = '17997637890';

  const handleSolicitarSaque = () => {
    if (!valor || !tipoChave || !chavePix) {
      toast({
        variant: 'destructive',
        title: 'Campos Incompletos',
        description: 'Por favor, preencha todos os campos para solicitar o saque.',
      });
      return;
    }

    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
        toast({
            variant: 'destructive',
            title: 'Valor Inválido',
            description: 'Por favor, insira um valor de saque válido.',
        });
        return;
    }

    const mensagem = `Olá, gostaria de solicitar um saque.
Valor: R$ ${valorNumerico.toFixed(2).replace('.', ',')}
Tipo de Chave PIX: ${tipoChave}
Chave PIX: ${chavePix}
Terminal: ${terminal}`;
    
    const urlWhatsApp = `https://wa.me/${numeroSuporte}?text=${encodeURIComponent(mensagem)}`;

    window.open(urlWhatsApp, '_blank');
  };

  return (
    <div>
      <Header />
      <main className="p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Solicitar Saque via PIX</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para solicitar o saque via WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="valor">Valor do Saque (R$)</Label>
                <Input 
                  id="valor" 
                  type="number" 
                  placeholder="Ex: 100,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipo-chave">Tipo de Chave PIX</Label>
                <Select value={tipoChave} onValueChange={setTipoChave}>
                  <SelectTrigger id="tipo-chave">
                    <SelectValue placeholder="Selecione o tipo de chave" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="Email">E-mail</SelectItem>
                    <SelectItem value="Telefone">Telefone</SelectItem>
                    <SelectItem value="Aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="chave-pix">Chave PIX</Label>
                <Input 
                  id="chave-pix" 
                  placeholder="Digite sua chave PIX"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                />
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleSolicitarSaque}>Solicitar Saque via WhatsApp</Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
