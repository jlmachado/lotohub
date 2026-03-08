'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUserByTerminal, upsertUser, logAdminAction, UserType, getDefaultPermissions } from '@/utils/usersStorage';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminNewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [terminal, setTerminal] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [saldo, setSaldo] = useState('0');
  const [tipoUsuario, setTipoUsuario] = useState<UserType>('USUARIO');
  const [comissao, setComissao] = useState('0');
  const [loading, setLoading] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!terminal || !password) {
      toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios' });
      return;
    }

    if (password.length < 4) {
      toast({ variant: 'destructive', title: 'Senha muito curta', description: 'Mínimo 4 caracteres.' });
      return;
    }

    if (getUserByTerminal(terminal)) {
      toast({ variant: 'destructive', title: 'Terminal já existe', description: 'Escolha outro número.' });
      return;
    }

    setLoading(true);
    
    upsertUser({
      terminal,
      password,
      nome,
      saldo: parseFloat(saldo) || 0,
      status: 'ACTIVE',
      tipoUsuario,
      permissoes: getDefaultPermissions(tipoUsuario),
      promotorConfig: (tipoUsuario === 'PROMOTOR' || tipoUsuario === 'CAMBISTA') ? { porcentagemComissao: parseFloat(comissao) || 0 } : undefined
    });

    logAdminAction({
      adminUser: 'admin',
      action: 'CREATE_USER',
      terminal,
      delta: parseFloat(saldo) || 0,
      reason: `Criação inicial via painel como ${tipoUsuario}`
    });

    toast({ title: 'Sucesso!', description: `Usuário ${terminal} criado com sucesso.` });
    router.push('/admin/usuarios');
  };

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/usuarios">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-3xl font-bold">Novo Usuário</h1>
        </div>

        <form onSubmit={handleCreate}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Dados de Acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="terminal">Número do Terminal</Label>
                  <Input 
                    id="terminal" 
                    placeholder="Ex: 12345" 
                    value={terminal}
                    onChange={(e) => setTerminal(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha Master</Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="****"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome / Apelido</Label>
                  <Input 
                    id="nome" 
                    placeholder="João Silva" 
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Perfil</Label>
                  <Select value={tipoUsuario} onValueChange={(v: any) => setTipoUsuario(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USUARIO">Usuário</SelectItem>
                      <SelectItem value="PROMOTOR">Promotor</SelectItem>
                      <SelectItem value="CAMBISTA">Cambista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(tipoUsuario === 'PROMOTOR' || tipoUsuario === 'CAMBISTA') && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label>Porcentagem de Comissão (%)</Label>
                  <Input 
                    type="number"
                    value={comissao}
                    onChange={(e) => setComissao(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="saldo">Saldo Inicial (R$)</Label>
                <Input 
                  id="saldo" 
                  type="number"
                  step="0.01"
                  value={saldo}
                  onChange={(e) => setSaldo(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-3 border-t pt-6 bg-muted/10">
              <Link href="/admin/usuarios">
                <Button variant="ghost">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={loading} className='lux-shine px-8'>
                {loading ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </main>
  );
}
