'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Building2, Search, ArrowRight, ShieldCheck, MapPin, MessageCircle } from 'lucide-react';
import { getBancas, Banca, setBancaContextGlobal, setBancaContextBanca } from '@/utils/bancasStorage';
import { cn } from '@/lib/utils';

export default function SelectBancaPage() {
  const router = useRouter();
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setBancas(getBancas());
  }, []);

  const filteredBancas = useMemo(() => {
    return bancas.filter(b => 
      b.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.cidade || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bancas, searchTerm]);

  const handleSelectGlobal = () => {
    setBancaContextGlobal();
    router.push('/admin');
  };

  const handleSelectBanca = (banca: Banca) => {
    if (banca.status !== 'ACTIVE') return;
    setBancaContextBanca(banca);
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Header />
      
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-12">
        <div className="text-center space-y-2 mt-8">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Escolha o contexto do painel</h1>
          <p className="text-slate-400 max-w-xl mx-auto">Acesse a gestão centralizada do sistema ou entre em uma unidade específica para auditoria detalhada.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Opção Global */}
          <div className="lg:col-span-4">
            <Card className="bg-blue-600 border-0 shadow-2xl shadow-blue-500/20 hover:scale-[1.02] transition-transform cursor-pointer overflow-hidden group h-full flex flex-col" onClick={handleSelectGlobal}>
              <CardHeader className="relative z-10">
                <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl text-white font-black italic uppercase tracking-tight">Painel Global</CardTitle>
                <CardDescription className="text-blue-100 font-medium">Visualização master de todas as unidades, usuários e financeiros do sistema.</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto relative z-10 pb-8">
                <Button className="w-full bg-white text-blue-600 hover:bg-slate-100 font-black uppercase italic text-lg h-14 rounded-xl gap-2">
                  Entrar no Global <ArrowRight className="h-5 w-5" />
                </Button>
              </CardFooter>
              <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Globe size={240} />
              </div>
            </Card>
          </div>

          {/* Seleção de Banca */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 rounded-lg">
                  <Building2 className="h-5 w-5 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-tight">Selecionar Unidade</h2>
                <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-400">{filteredBancas.length} Bancas</Badge>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Buscar unidade..." 
                  className="pl-9 bg-slate-900 border-white/10 h-11 rounded-xl text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBancas.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
                  <Building2 className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">Nenhuma unidade encontrada.</p>
                </div>
              ) : (
                filteredBancas.map((banca) => (
                  <Card key={banca.id} className="bg-slate-900 border-white/5 hover:border-amber-500/50 transition-colors shadow-lg group">
                    <CardHeader className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-black uppercase text-white tracking-tight">{banca.nome}</CardTitle>
                          <p className="text-xs text-slate-500 font-mono">{banca.subdomain}.lotohub.com</p>
                        </div>
                        <Badge variant={banca.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-[9px] uppercase tracking-widest">
                          {banca.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 mt-4">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <MapPin size={12} className="text-slate-600" />
                          {banca.cidade || 'Localização não informada'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <MessageCircle size={12} className="text-slate-600" />
                          {banca.whatsapp || 'WhatsApp não cadastrado'}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-4">
                        {Object.entries(banca.modulos).map(([key, enabled]) => 
                          enabled ? <Badge key={key} variant="secondary" className="bg-slate-800 text-slate-400 text-[8px] border-0 h-4 uppercase">{key}</Badge> : null
                        )}
                      </div>
                    </CardHeader>
                    <CardFooter className="p-5 pt-0">
                      <Button 
                        onClick={() => handleSelectBanca(banca)} 
                        disabled={banca.status !== 'ACTIVE'}
                        className="w-full h-11 bg-slate-800 hover:bg-amber-500 hover:text-black font-bold uppercase italic text-sm rounded-lg transition-all gap-2"
                      >
                        <ShieldCheck size={16} /> Entrar na Unidade
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
