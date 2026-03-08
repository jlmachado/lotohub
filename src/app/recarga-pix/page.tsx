'use client';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';

export default function RecargaPixPage() {
  const [valor, setValor] = useState('');
  const [nome, setNome] = useState('');
  const { toast } = useToast();
  const { terminal } = useAppContext();

  const handleSolicitarRecarga = () => {
    if (!valor || !nome) {
      toast({
        variant: 'destructive',
        title: 'Campos Incompletos',
        description: 'Por favor, preencha o valor e seu nome completo.',
      });
      return;
    }

    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
        toast({
            variant: 'destructive',
            title: 'Valor Inválido',
            description: 'Por favor, insira um valor de recarga válido.',
        });
        return;
    }

    const mensagem = `Olá, gostaria de fazer uma recarga no valor de R$ ${valorNumerico.toFixed(2).replace('.', ',')}. Meu nome é ${nome.trim()} e meu terminal é ${terminal}.`;
    const numeroSuporte = '17997637890';
    const urlWhatsApp = `https://wa.me/${numeroSuporte}?text=${encodeURIComponent(mensagem)}`;

    window.open(urlWhatsApp, '_blank');
  };
  
  return (
    <div>
      <Header />
      <main className="p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Solicitar Recarga via WhatsApp</CardTitle>
            <CardDescription>
              Preencha seus dados para solicitar a recarga via PIX pelo WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="valor">Valor da Recarga (R$)</Label>
              <Input 
                id="valor" 
                type="number" 
                placeholder="Ex: 50,00" 
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input 
                id="nome" 
                type="text" 
                placeholder="Seu nome completo" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleSolicitarRecarga}>
              Solicitar Recarga via WhatsApp
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
