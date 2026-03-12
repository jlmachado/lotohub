'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Save, Globe } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { upsertBanca, BancaModulos } from '@/utils/bancasStorage';
import { useToast } from '@/hooks/use-toast';

export default function NewBancaPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [subdomain, setSubdomain] = useState('');
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [cidade, setCidade] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  const [modulos, setModulos] = useState<BancaModulos>({
    bingo: true,
    cassino: true,
    jogoDoBicho: true,
    seninha: true,
    quininha: true,
    lotinha: true,
    futebol: true,
    sinucaAoVivo: true,
    loteriaUruguai: true
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subdomain || !nome || !login || !password) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha o subdomínio, nome e credenciais.' });
      return;
    }

    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    upsertBanca({
      subdomain: cleanSubdomain,
      nome,
      adminLogin: login,
      adminPassword: password,
      cidade,
      whatsapp,
      modulos,
      status: 'ACTIVE'
    });

    toast({ title: 'Banca criada!', description: `A unidade ${nome} foi configurada com sucesso.` });
    router.push('/admin/bancas');
  };

  const toggleModule = (key: keyof BancaModulos) => {
    setModulos(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/bancas">
          <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold">Nova Banca</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração de Acesso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subdomínio (Identificador Único)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="ex: matrizsp" 
                    className="pl-9 font-mono"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground uppercase">Este será o link: subdomain.lotohub.com</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Login Admin</Label>
                  <Input value={login} onChange={e => setLogin(e.target.value)} placeholder="admin" />
                </div>
                <div className="space-y-2">
                  <Label>Senha Admin</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="****" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Unidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome de Exibição</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: LotoHub Matriz" />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="São Paulo" />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp para Suporte</Label>
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+55 11 9..." />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Módulos Habilitados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Object.entries(modulos).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Label className="capitalize cursor-pointer" htmlFor={key}>{key.replace(/([A-Z])/g, ' $1')}</Label>
                  <Switch 
                    id={key}
                    checked={enabled} 
                    onCheckedChange={() => toggleModule(key as keyof BancaModulos)} 
                  />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t pt-6">
            <Button type="submit" size="lg" className="lux-shine px-8">
              <Save className="mr-2 h-4 w-4" /> Salvar Banca
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
