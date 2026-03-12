
'use client';

import { User } from '@/utils/usersStorage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Lock, Unlock, Key, Wallet, UserCheck, Briefcase, UserX, MapPin, Mail } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatBRL } from '@/utils/currency';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Props {
  users: User[];
  onToggleStatus: (user: User) => void;
  onResetPassword: (user: User) => void;
  onAdjustBalance: (user: User) => void;
}

export function UsersTable({ users, onToggleStatus, onResetPassword, onAdjustBalance }: Props) {
  const router = useRouter();

  const getRoleBadge = (role: User['tipoUsuario']) => {
    switch (role) {
      case 'SUPER_ADMIN': return <Badge className="bg-red-600 font-black italic">SUPER ADMIN</Badge>;
      case 'ADMIN': return <Badge className="bg-blue-600">ADMIN</Badge>;
      case 'PROMOTOR': return <Badge className="bg-purple-600">PROMOTOR</Badge>;
      case 'CAMBISTA': return <Badge className="bg-amber-500 text-black">CAMBISTA</Badge>;
      default: return <Badge variant="secondary">JOGADOR</Badge>;
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase font-black">Terminal</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Nome / Contato</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Local / Banca</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Perfil</TableHead>
              <TableHead className="text-[10px] uppercase font-black">Status</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-black">Saldo</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-black">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">Nenhum usuário encontrado.</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono font-bold text-primary">{user.terminal}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{user.nome}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail size={10}/>{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs flex items-center gap-1 font-medium"><MapPin size={10}/>{user.cidade || 'Não informada'}</span>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground">ID: {user.bancaId}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.tipoUsuario)}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-[9px] uppercase font-bold">
                      {user.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-black text-white">{formatBRL(user.saldo)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="text-[10px] uppercase">Gestão de Perfil</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/admin/usuarios/${user.terminal}`)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar / Promover
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdjustBalance(user)}>
                          <Wallet className="mr-2 h-4 w-4" /> Ajustar Saldo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onResetPassword(user)}>
                          <Key className="mr-2 h-4 w-4" /> Resetar Senha
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className={cn(user.status === 'ACTIVE' ? 'text-destructive' : 'text-green-600')}
                          onClick={() => onToggleStatus(user)}
                        >
                          {user.status === 'ACTIVE' ? <Lock className="mr-2 h-4 w-4" /> : <Unlock className="mr-2 h-4 w-4" />}
                          {user.status === 'ACTIVE' ? 'Bloquear Acesso' : 'Desbloquear'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden divide-y">
        {users.map((user) => (
          <div key={user.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="font-mono text-lg font-black text-primary leading-none">{user.terminal}</span>
                <span className="text-xs font-bold text-white mt-1">{user.nome}</span>
              </div>
              <div className='flex flex-col gap-1 items-end'>
                {getRoleBadge(user.tipoUsuario)}
                <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'} className='text-[10px] uppercase font-black'>
                  {user.status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Saldo</p>
                <p className="font-black text-white">{formatBRL(user.saldo)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-bold text-muted-foreground">Cidade</p>
                <p className="font-medium truncate">{user.cidade || '-'}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" className="flex-1 text-[10px] font-bold" onClick={() => router.push(`/admin/usuarios/${user.terminal}`)}>
                GERENCIAR
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-[10px] font-bold" onClick={() => onAdjustBalance(user)}>
                CARTEIRA
              </Button>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhum usuário.</p>}
      </div>
    </div>
  );
}
