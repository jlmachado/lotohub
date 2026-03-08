'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, ShieldCheck, ChevronLeft, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { getBancas, Banca, setBancaContextBanca } from '@/utils/bancasStorage';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function AdminBancasPage() {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setBancas(getBancas());
  }, []);

  const handleEnterAs = (banca: Banca) => {
    setBancaContextBanca(banca);
    toast({
      title: `Contexto alterado`,
      description: `Você agora está operando como a banca: ${banca.nome}`,
    });
    router.push('/admin');
  };

  return (
    <main className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-3xl font-bold">Gerenciar Bancas</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/select-banca')}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Trocar Contexto
          </Button>
          <Link href="/admin/bancas/novo">
            <Button className="lux-shine bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Nova Banca
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle>Bancas Cadastradas</CardTitle>
          <CardDescription>Gerencie as unidades, acessos e módulos habilitados em todo o ecossistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Nome / Subdomínio</TableHead>
                <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Cidade</TableHead>
                <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Módulos Ativos</TableHead>
                <TableHead className="text-muted-foreground uppercase text-[10px] font-bold">Status</TableHead>
                <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bancas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                    Nenhuma banca cadastrada no momento.
                  </TableCell>
                </TableRow>
              ) : (
                bancas.map((banca) => (
                  <TableRow key={banca.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{banca.nome}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{banca.subdomain}.lotohub.com</span>
                      </div>
                    </TableCell>
                    <TableCell>{banca.cidade || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {Object.entries(banca.modulos).map(([key, enabled]) => 
                          enabled ? <Badge key={key} variant="secondary" className="text-[8px] uppercase bg-slate-800 border-0 h-4">{key}</Badge> : null
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={banca.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-[9px] uppercase">
                        {banca.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEnterAs(banca)}
                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-xs font-bold gap-1"
                      >
                        <ShieldCheck className="h-4 w-4" /> Entrar
                      </Button>
                      <Link href={`/admin/bancas/${banca.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          <Edit className="h-3 w-3 mr-1" /> Editar
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
