'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUsers, User, upsertUser, logAdminAction } from '@/utils/usersStorage';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { useToast } from '@/hooks/use-toast';
import { AdjustWalletModal } from '@/components/admin/users/AdjustWalletModal';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'USUARIO' | 'PROMOTOR' | 'CAMBISTA'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Wallet Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setAllUsers(getUsers());
  };

  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const matchSearch = user.terminal.includes(searchTerm) || 
                          (user.nome || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || user.status === statusFilter;
      const matchType = typeFilter === 'ALL' || user.tipoUsuario === typeFilter;
      return matchSearch && matchStatus && matchType;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allUsers, searchTerm, statusFilter, typeFilter]);

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
    } else if (newPass) {
      alert('A senha deve ter no mínimo 4 caracteres.');
    }
  };

  const handleAdjustBalance = (user: User) => {
    setSelectedUser(user);
    setWalletModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
        </div>
        <Button onClick={() => router.push('/admin/usuarios/novo')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Todos os Terminais</CardTitle>
          <CardDescription>Gerencie acessos, saldos e bônus dos usuários do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar terminal ou nome..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(v: any) => { setTypeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos Tipos</SelectItem>
                  <SelectItem value="USUARIO">Usuário</SelectItem>
                  <SelectItem value="PROMOTOR">Promotor</SelectItem>
                  <SelectItem value="CAMBISTA">Cambista</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
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
            onAdjustBalance={handleAdjustBalance}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {paginatedUsers.length} de {filteredUsers.length} usuários
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Próximo <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
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
