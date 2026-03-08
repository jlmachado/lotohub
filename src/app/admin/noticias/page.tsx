'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, PlusCircle, Edit, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useAppContext, NewsMessage } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AdminNoticiasPage() {
  const { news, addNews, updateNews, deleteNews } = useAppContext();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentMsg, setCurrentMsg] = useState<Omit<NewsMessage, 'id'>>({ text: '', order: 0, active: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedNews = [...news].sort((a, b) => a.order - b.order);

  const handleAddNew = () => {
    setEditingId(null);
    setCurrentMsg({ text: '', order: (sortedNews[sortedNews.length - 1]?.order || 0) + 1, active: true });
    setIsDialogOpen(true);
  };

  const handleEdit = (msg: NewsMessage) => {
    setEditingId(msg.id);
    setCurrentMsg({ text: msg.text, order: msg.order, active: msg.active });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!currentMsg.text.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'A mensagem não pode estar vazia.' });
      return;
    }

    if (editingId) {
      updateNews({ ...currentMsg, id: editingId });
      toast({ title: 'Notícia atualizada!' });
    } else {
      addNews(currentMsg);
      toast({ title: 'Notícia criada!' });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteNews(deletingId);
      toast({ title: 'Notícia excluída.' });
    }
    setIsDeleteAlertOpen(false);
  };

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Gerenciar Notícias (Ticker)</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Mensagens do Feed</CardTitle>
            <CardDescription>Crie mensagens curtas que aparecem na home.</CardDescription>
          </div>
          <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Nova Notícia</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Ordem</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedNews.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell className="font-mono">{msg.order}</TableCell>
                  <TableCell className="font-medium">{msg.text}</TableCell>
                  <TableCell>
                    <Badge variant={msg.active ? 'default' : 'secondary'}>{msg.active ? 'Ativa' : 'Inativa'}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(msg)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(msg.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {news.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma notícia cadastrada.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Notícia' : 'Nova Notícia'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="text">Mensagem</Label>
              <Input id="text" value={currentMsg.text} onChange={e => setCurrentMsg({...currentMsg, text: e.target.value})} placeholder="🎉 Promoção de hoje..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order">Ordem</Label>
                <Input id="order" type="number" value={currentMsg.order} onChange={e => setCurrentMsg({...currentMsg, order: parseInt(e.target.value) || 0})} />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch id="active" checked={currentMsg.active} onCheckedChange={v => setCurrentMsg({...currentMsg, active: v})} />
                <Label htmlFor="active">Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Notícia?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
