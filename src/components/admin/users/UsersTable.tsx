'use client';

import { User } from '@/utils/usersStorage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Lock, Unlock, Key, Wallet, UserCheck, Briefcase, UserX } from 'lucide-react';
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
      case 'PROMOTOR': return <Badge className="bg-purple-600 hover:bg-purple-700">PROMOTOR</Badge>;
      case 'CAMBISTA': return <Badge className="bg-amber-500 hover:bg-amber-600 text-black">CAMBISTA</Badge>;
      default: return <Badge variant="secondary">USUÁRIO</Badge>;
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Terminal</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado.</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono font-bold text-primary">{user.terminal}</TableCell>
                  <TableCell>{user.nome || '-'}</TableCell>
                  <TableCell>{getRoleBadge(user.tipoUsuario)}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>
                      {user.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatBRL(user.saldo)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Ações de Gestão</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/admin/usuarios/${user.terminal}`)}>
                          <Edit className="mr-2 h-4 w-4" /> Ver Detalhes / Auditoria
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdjustBalance(user)}>
                          <Wallet className="mr-2 h-4 w-4" /> Ajustar Saldo
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Alterar Perfil</DropdownMenuLabel>
                        
                        {user.tipoUsuario !== 'USUARIO' && (
                          <DropdownMenuItem onClick={() => router.push(`/admin/usuarios/${user.terminal}`)}>
                            <UserX className="mr-2 h-4 w-4" /> Voltar para Usuário
                          </DropdownMenuItem>
                        )}
                        {user.tipoUsuario !== 'PROMOTOR' && (
                          <DropdownMenuItem onClick={() => router.push(`/admin/usuarios/${user.terminal}`)}>
                            <UserCheck className="mr-2 h-4 w-4 text-purple-500" /> Tornar Promotor
                          </DropdownMenuItem>
                        )}
                        {user.tipoUsuario !== 'CAMBISTA' && (
                          <DropdownMenuItem onClick={() => router.push(`/admin/usuarios/${user.terminal}`)}>
                            <Briefcase className="mr-2 h-4 w-4 text-amber-500" /> Tornar Cambista
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onResetPassword(user)}>
                          <Key className="mr-2 h-4 w-4" /> Resetar Senha
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className={cn(user.status === 'ACTIVE' ? 'text-destructive' : 'text-green-600')}
                          onClick={() => onToggleStatus(user)}
                        >
                          {user.status === 'ACTIVE' ? <Lock className="mr-2 h-4 w-4" /> : <Unlock className="mr-2 h-4 w-4" />}
                          {user.status === 'ACTIVE' ? 'Bloquear Terminal' : 'Desbloquear'}
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
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Terminal</p>
                <p className="font-mono text-lg font-black text-primary">{user.terminal}</p>
              </div>
              <div className='flex flex-col gap-1 items-end'>
                {getRoleBadge(user.tipoUsuario)}
                <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'} className='text-[10px]'>
                  {user.status === 'ACTIVE' ? 'ATIVO' : 'BLOQUEADO'}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Saldo</p>
                <p className="font-bold">{formatBRL(user.saldo)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Nome</p>
                <p className="truncate font-medium">{user.nome || '-'}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(`/admin/usuarios/${user.terminal}`)}>
                <Edit className="h-4 w-4 mr-1" /> Gerenciar
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onAdjustBalance(user)}>
                <Wallet className="h-4 w-4 mr-1" /> Saldo
              </Button>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhum usuário.</p>}
      </div>
    </div>
  );
}
