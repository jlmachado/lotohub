'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, upsertUser, logAdminAction } from '@/utils/usersStorage';
import { formatBRL } from '@/utils/currency';

interface Props {
  user: User | null;
  type: 'BALANCE' | 'BONUS';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdjustWalletModal({ user, type, isOpen, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [operation, setOperation] = useState<'ADD' | 'REMOVE'>('ADD');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleConfirm = () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast({ variant: 'destructive', title: 'Valor inválido' });
      return;
    }

    if (!reason.trim()) {
      toast({ variant: 'destructive', title: 'Motivo obrigatório' });
      return;
    }

    setLoading(true);
    const delta = operation === 'ADD' ? value : -value;
    
    const field = type === 'BALANCE' ? 'saldo' : 'bonus';
    const currentVal = user[field];
    const newVal = Math.max(0, currentVal + delta);

    upsertUser({ 
      terminal: user.terminal, 
      [field]: newVal 
    });

    logAdminAction({
      adminUser: 'admin',
      action: type === 'BALANCE' ? 'ADJUST_BALANCE' : 'ADJUST_BONUS',
      terminal: user.terminal,
      delta,
      reason
    });

    toast({ 
      title: 'Carteira atualizada', 
      description: `${type === 'BALANCE' ? 'Saldo' : 'Bônus'} ajustado para ${formatBRL(newVal)}` 
    });
    
    setLoading(false);
    setAmount('');
    setReason('');
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar {type === 'BALANCE' ? 'Saldo' : 'Bônus'}</DialogTitle>
          <DialogDescription>
            Terminal: {user.terminal} | Atual: {formatBRL(type === 'BALANCE' ? user.saldo : user.bonus)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Operação</Label>
              <Select value={operation} onValueChange={(v: any) => setOperation(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADD">Adicionar (+)</SelectItem>
                  <SelectItem value="REMOVE">Remover (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Motivo / Observação</Label>
            <Input 
              placeholder="Ex: Depósito PIX aprovado" 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading}>Confirmar Ajuste</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
