
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Search, ChevronLeft, ChevronRight, Filter, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUsers, User, upsertUser, logAdminAction } from '@/utils/usersStorage';
import { getBancas } from '@/utils/bancasStorage';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { useToast } from '@/hooks/use-toast';
import { AdjustWalletModal } from '@/components/admin/users/AdjustWalletModal';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getActiveContext } from '@/utils/bancaContext';

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const context = getActiveContext();
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [bancas, setBancas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'USUARIO' | 'PROMOTOR' | 'CAMBISTA' | 'ADMIN' | 'SUPER_ADMIN'>('ALL');
  const [bancaFilter, setBancaFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  useEffect(() => {
    refreshData();
    setBancas(getBancas());
  }, []);

  const refreshData = () => {
    setAllUsers(getUsers());
  };

  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const matchSearch = user.terminal.includes(searchTerm) || 
                          (user.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.cpf || '').includes(searchTerm);
      const matchStatus = statusFilter === 'ALL' || user.status === statusFilter;
      const matchType = typeFilter === 'ALL' || user.tipoUsuario === typeFilter;
      
      // Filtro de Banca (SuperAdmin vê tudo, Admin vê apenas sua banca)
      let matchBanca = true;
      if (context?.mode === 'BANCA') {
        matchBanca = user.bancaId === context.bancaId;
      } else if (bancaFilter !== 'all') {
        matchBanca = user.bancaId === bancaFilter;
      }

      return matchSearch && matchStatus && matchType && matchBanca;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allUsers, searchTerm, statusFilter, typeFilter, bancaFilter, context]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    upsertUser({ terminal: user.terminal, status: newStatus });
    logAdminAction({
      adminUser: 'admin',
      action: newStatus === 'ACTIVE' ? 'UNBLOCK_USER' : 'BLOCK_USER',
      terminal: user.terminal,
      reason: 'Alteração manual via lista',
      bancaId: user.bancaId
    });
    toast({ title: newStatus === 'ACTIVE' ? 'Usuário Desbloqueado' : 'Usuário Bloqueado' });
    refreshData();
  };

  const handleResetPassword = (user: User) => {
    const newPass = prompt(`Digite a nova senha para o terminal ${user.terminal}:`, '1234');
    if (newPass && newPass.length >= 4) {
      upsertUser({ terminal: user.terminal, password: newPass });
      logAdminAction({
        adminUser: 'admin',
        action: 'RESET_PASSWORD',
        terminal: user.terminal,
        reason: 'Reset via painel administrativo',
        bancaId: user.bancaId
      });
      toast({ title: 'Senha resetada com sucesso!' });
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Gerenciar Terminais</h1>
        </div>
        <Button onClick={() => router.push('/admin/usuarios/novo')} className="lux-shine">
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card className="border-white/10">
        <CardHeader className="pb-3 border-b border-white/5 bg-slate-950/50 rounded-t-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black uppercase italic">Auditoria de Usuários</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Controle total de acessos e cargos</CardDescription>
            </div>
            
            {context?.mode === 'GLOBAL' && (
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-primary" />
                <Select value={bancaFilter} onValueChange={setBancaFilter}>
                  <SelectTrigger className="w-[180px] h-8 bg-black/40 border-white/10 text-[10px] uppercase font-bold">
                    <SelectValue placeholder="Filtrar Banca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Bancas</SelectItem>
                    {bancas.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por Terminal, Nome, E-mail ou CPF..." 
                className="pl-9 h-10 bg-black/20 border-white/10"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(v: any) => { setTypeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px] h-10 bg-black/20 border-white/10 text-[10px] uppercase font-bold">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos Perfis</SelectItem>
                  <SelectItem value="USUARIO">Jogadores</SelectItem>
                  <SelectItem value="PROMOTOR">Promotores</SelectItem>
                  <SelectItem value="CAMBISTA">Cambistas</SelectItem>
                  <SelectItem value="ADMIN">Admins</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px] h-10 bg-black/20 border-white/10 text-[10px] uppercase font-bold">
                  <Filter className="h-3 w-3 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos Status</SelectItem>
                  <SelectItem value="ACTIVE">Ativos</SelectItem>
                  <SelectItem value="BLOCKED">Bloqueados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <UsersTable 
            users={paginatedUsers} 
            onToggleStatus={handleToggleStatus}
            onResetPassword={handleResetPassword}
            onAdjustBalance={(u) => { setSelectedUser(u); setWalletModalOpen(true); }}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                Página {currentPage} de {totalPages} ({filteredUsers.length} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 border-white/10"><ChevronLeft size={14}/></Button>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 border-white/10"><ChevronRight size={14}/></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AdjustWalletModal 
        isOpen={walletModalOpen}
        user={selectedUser}
        type="BALANCE"
        onClose={() => setWalletModalOpen(false)}
        onSuccess={refreshData}
      />
    </div>
  );
}
