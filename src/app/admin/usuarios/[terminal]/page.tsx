'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, User, Wallet, Shield, History, Save, Key, Banknote } from 'lucide-react';
import { getUserByTerminal, upsertUser, logAdminAction, getAuditLogs, AdminLog, User as UserType, UserType as UserRole, getDefaultPermissions, addPromoterCredit } from '@/utils/usersStorage';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/utils/currency';
import Link from 'next/link';
import { AdjustWalletModal } from '@/components/admin/users/AdjustWalletModal';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const terminal = params.terminal as string;

  const [user, setUser] = useState<UserType | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  
  // Forms
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'BLOCKED'>('ACTIVE');
  const [tipoUsuario, setTipoUsuario] = useState<UserRole>('USUARIO');
  const [comissao, setComissao] = useState('0');
  const [loginFechamento, setLoginFechamento] = useState('');
  const [senhaFechamento, setSenhaFechamento] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Wallet Modal
  const [walletType, setWalletType] = useState<'BALANCE' | 'BONUS'>('BALANCE');
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  useEffect(() => {
    const found = getUserByTerminal(terminal);
    if (!found) {
      toast({ variant: 'destructive', title: 'Usuário não encontrado' });
      router.push('/admin/usuarios');
      return;
    }
    setUser(found);
    setNome(found.nome || '');
    setStatus(found.status);
    setTipoUsuario(found.tipoUsuario);
    setComissao(String(found.promotorConfig?.porcentagemComissao || 0));
    setLoginFechamento(found.cambistaConfig?.loginFechamento || '');
    setSenhaFechamento(found.cambistaConfig?.senhaFechamento || '');
    setLogs(getAuditLogs(terminal));
  }, [terminal, toast, router]);

  const handleUpdateProfile = () => {
    const updatedData: Partial<UserType> = { 
      terminal, 
      nome, 
      status, 
      tipoUsuario,
      permissoes: getDefaultPermissions(tipoUsuario)
    };

    if (tipoUsuario === 'PROMOTOR' || tipoUsuario === 'CAMBISTA') {
      updatedData.promotorConfig = { porcentagemComissao: parseFloat(comissao) || 0 };
    }

    if (tipoUsuario === 'CAMBISTA') {
      updatedData.cambistaConfig = { loginFechamento, senhaFechamento };
    }

    upsertUser(updatedData as UserType);
    
    logAdminAction({
      adminUser: 'admin',
      action: 'UPDATE_PROFILE',
      terminal,
      reason: `Alteração de perfil (Nome: ${nome}, Tipo: ${tipoUsuario}, Status: ${status})`
    });

    toast({ title: 'Perfil atualizado com sucesso!' });
    refreshData();
  };

  const handleResetPassword = () => {
    if (newPassword.length < 4) {
      toast({ variant: 'destructive', title: 'Senha muito curta' });
      return;
    }
    upsertUser({ terminal, password: newPassword });
    logAdminAction({
      adminUser: 'admin',
      action: 'RESET_PASSWORD',
      terminal,
      reason: 'Nova senha definida pelo administrador'
    });
    toast({ title: 'Senha alterada!' });
    setNewPassword('');
    refreshData();
  };

  const handleAddBalanceToPromoter = () => {
    const amount = prompt(`Digite o valor de saldo administrativo para adicionar ao terminal ${terminal}:`, "100");
    const reason = prompt(`Digite o motivo deste crédito:`, "Injeção de saldo operacional");
    
    if (amount && reason) {
      const val = parseFloat(amount);
      if (!isNaN(val)) {
        addPromoterCredit(terminal, val, reason);
        toast({ title: "Saldo adicionado!", description: `R$ ${val.toFixed(2)} injetados com sucesso.` });
        refreshData();
      }
    }
  };

  const refreshData = () => {
    const found = getUserByTerminal(terminal);
    if (found) {
      setUser(found);
      setLogs(getAuditLogs(terminal));
    }
  };

  if (!user) return null;

  return (
    <main className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/usuarios">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Detalhes do Terminal</h1>
            <div className='flex items-center gap-2'>
              <p className="text-muted-foreground font-mono font-bold text-primary">{user.terminal}</p>
              <Badge variant="secondary" className='text-[10px] uppercase font-black'>{user.tipoUsuario}</Badge>
            </div>
          </div>
        </div>
        <Badge className="text-lg px-4 py-1" variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>
          {user.status === 'ACTIVE' ? 'ATIVO' : 'BLOQUEADO'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm uppercase text-muted-foreground">Resumo da Carteira</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground uppercase font-bold">Saldo Disponível</p>
              <p className="text-3xl font-black">{formatBRL(user.saldo)}</p>
              <div className="flex flex-col gap-1 mt-2">
                <Button variant="link" className="p-0 h-auto text-primary text-xs justify-start" onClick={() => { setWalletType('BALANCE'); setWalletModalOpen(true); }}>
                  Ajuste Manual
                </Button>
                {user.tipoUsuario === 'PROMOTOR' && (
                  <Button variant="link" className="p-0 h-auto text-amber-600 text-xs justify-start" onClick={handleAddBalanceToPromoter}>
                    <Banknote className="h-3 w-3 mr-1" /> Crédito Administrativo
                  </Button>
                )}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
              <p className="text-xs text-muted-foreground uppercase font-bold text-green-600">Bônus Acumulado</p>
              <p className="text-3xl font-black text-green-600">{formatBRL(user.bonus)}</p>
              <Button variant="link" className="p-0 h-auto text-green-600 text-xs" onClick={() => { setWalletType('BONUS'); setWalletModalOpen(true); }}>
                Ajustar Bônus
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <Tabs defaultValue="perfil" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-none border-b bg-transparent h-auto p-0">
              <TabsTrigger value="perfil" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3">
                <User className="h-4 w-4 mr-2" /> Perfil
              </TabsTrigger>
              <TabsTrigger value="seguranca" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3">
                <Shield className="h-4 w-4 mr-2" /> Segurança
              </TabsTrigger>
              <TabsTrigger value="historico" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3">
                <History className="h-4 w-4 mr-2" /> Auditoria
              </TabsTrigger>
            </TabsList>

            <TabsContent value="perfil" className="p-6 space-y-6">
              <div className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome / Apelido</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Usuário</Label>
                    <Select value={tipoUsuario} onValueChange={(v: any) => setTipoUsuario(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USUARIO">Usuário Comum</SelectItem>
                        <SelectItem value="PROMOTOR">Promotor (Afiliado)</SelectItem>
                        <SelectItem value="CAMBISTA">Cambista (Ponto de Venda)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(tipoUsuario === 'PROMOTOR' || tipoUsuario === 'CAMBISTA') && (
                  <div className='p-4 border rounded-xl bg-muted/20 space-y-4'>
                    <h4 className='text-xs font-black uppercase text-primary'>Configurações de Comissão</h4>
                    <div className='grid gap-2'>
                      <Label>Porcentagem de Ganho (%)</Label>
                      <Input type='number' value={comissao} onChange={e => setComissao(e.target.value)} />
                      <p className='text-[10px] text-muted-foreground'>Ganha sobre cada aposta realizada.</p>
                    </div>
                  </div>
                )}

                {tipoUsuario === 'CAMBISTA' && (
                  <div className='p-4 border rounded-xl bg-muted/20 space-y-4'>
                    <h4 className='text-xs font-black uppercase text-primary'>Configurações de Cambista</h4>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='space-y-2'>
                        <Label>Login de Fechamento</Label>
                        <Input value={loginFechamento} onChange={e => setLoginFechamento(e.target.value)} placeholder="caixa01" />
                      </div>
                      <div className='space-y-2'>
                        <Label>Senha de Fechamento</Label>
                        <Input type='password' value={senhaFechamento} onChange={e => setSenhaFechamento(e.target.value)} placeholder="****" />
                      </div>
                    </div>
                    <p className='text-[10px] text-muted-foreground'>Credenciais exclusivas para ações de caixa.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status do Terminal</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant={status === 'ACTIVE' ? 'default' : 'outline'}
                      className="flex-1 h-11"
                      onClick={() => setStatus('ACTIVE')}
                    >
                      Ativo
                    </Button>
                    <Button 
                      variant={status === 'BLOCKED' ? 'destructive' : 'outline'}
                      className="flex-1 h-11"
                      onClick={() => setStatus('BLOCKED')}
                    >
                      Bloqueado
                    </Button>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t flex justify-end">
                <Button onClick={handleUpdateProfile} size="lg" className='lux-shine'>
                  <Save className="h-4 w-4 mr-2" /> Salvar Perfil
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="seguranca" className="p-6 space-y-6">
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-700 font-bold mb-1 flex items-center">
                  <Key className="h-4 w-4 mr-2" /> Reset de Senha Master
                </p>
                <p className="text-xs text-muted-foreground">O usuário usará esta senha para o login normal no sistema.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 4 dígitos" />
                </div>
                <Button onClick={handleResetPassword} disabled={!newPassword}>Redefinir Senha</Button>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="p-0">
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground italic">Nenhum evento registrado.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-4 text-sm hover:bg-muted/30">
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.at).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="font-bold">{log.reason || 'Sem descrição'}</p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </main>
  );
}
