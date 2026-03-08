'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, PlusCircle, Edit, Trash2, Calendar, Copy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useAppContext, Popup } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ImageUploader, UploadedImageData } from '@/components/admin/ImageUploader';
import { formatBytes, PLACEHOLDER_IMAGE_DATA_URI } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type FormState = Omit<Popup, 'id' | 'bancaId' | 'createdAt' | 'updatedAt'>;

const initialFormState: FormState = {
  title: '',
  description: '',
  imageUrl: '',
  thumbUrl: '',
  linkUrl: '',
  buttonText: '',
  active: true,
  priority: 10,
  startAt: '',
  endAt: '',
};

export default function AdminPopupsPage() {
  const { popups, addPopup, updatePopup, deletePopup } = useAppContext();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentPopup, setCurrentPopup] = useState<FormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedPopups = [...popups].sort((a, b) => b.priority - a.priority);

  const handleAddNew = () => {
    setEditingId(null);
    setCurrentPopup(initialFormState);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (popup: Popup) => {
    setEditingId(popup.id);
    setCurrentPopup(popup);
    setIsDialogOpen(true);
  };
  
  const handleUploadComplete = (data: UploadedImageData) => {
    setCurrentPopup(prev => ({
      ...prev,
      imageUrl: data.imageUrl,
      thumbUrl: data.thumbUrl,
      imageMeta: data.metadata
    }));
  };
  
  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deletePopup(deletingId);
      toast({ title: 'Pop-up excluído com sucesso!' });
    }
    setIsDeleteAlertOpen(false);
    setDeletingId(null);
  };

  const handleSave = () => {
    if (!currentPopup.title) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O título é obrigatório.' });
      return;
    }
    
    if (editingId) {
      updatePopup({ ...currentPopup, id: editingId } as Popup);
      toast({ title: 'Pop-up atualizado com sucesso!' });
    } else {
      addPopup(currentPopup);
      toast({ title: 'Pop-up criado com sucesso!' });
    }

    setIsDialogOpen(false);
    setEditingId(null);
  };

  const copyToClipboard = (text: string) => {
    if(!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'O link da imagem foi copiado.' });
  }

  const isScheduled = (popup: Popup) => popup.startAt || popup.endAt;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = PLACEHOLDER_IMAGE_DATA_URI;
  };
  
  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/imagens"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Gerenciar Pop-ups</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pop-ups Promocionais</CardTitle>
            <CardDescription>Crie e gerencie os pop-ups (modais) da página inicial.</CardDescription>
          </div>
          <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Pop-up</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPopups.map(popup => (
                <TableRow key={popup.id}>
                  <TableCell>
                    {popup.thumbUrl && (
                      <Image
                        src={popup.thumbUrl}
                        alt={popup.title}
                        width={60}
                        height={40}
                        className="rounded-md object-cover aspect-video border"
                        onError={handleImageError}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{popup.title}</TableCell>
                  <TableCell>{popup.priority}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={popup.active ? 'default' : 'secondary'}>{popup.active ? 'Ativo' : 'Inativo'}</Badge>
                      {isScheduled(popup) && <Badge variant="outline"><Calendar className="h-3 w-3 mr-1" /> Agendado</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <TooltipProvider>
                      {popup.imageMeta && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className='cursor-default'>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatBytes(popup.imageMeta.sizeBytes)}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(popup.imageUrl || '')} disabled={!popup.imageUrl}><Copy className="h-4 w-4"/></Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(popup)}><Edit className="mr-2 h-4 w-4" />Editar</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(popup.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Pop-up' : 'Adicionar Novo Pop-up'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
             <div className="grid gap-2">
                <Label htmlFor="image-popup">Imagem do Pop-up (opcional)</Label>
                 <ImageUploader 
                  onUploadComplete={handleUploadComplete}
                  maxSizeKb={700}
                  outputWidth={900}
                  outputQuality={0.80}
                  aspectRatio={4/3}
                  currentImagePreview={currentPopup.imageUrl}
                />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title-popup">Título</Label>
              <Input id="title-popup" value={currentPopup.title} onChange={(e) => setCurrentPopup({ ...currentPopup, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc-popup">Descrição (opcional)</Label>
              <Textarea id="desc-popup" value={currentPopup.description} onChange={(e) => setCurrentPopup({ ...currentPopup, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                <Label htmlFor="buttonText-popup">Texto do Botão (opcional)</Label>
                <Input id="buttonText-popup" value={currentPopup.buttonText} onChange={(e) => setCurrentPopup({ ...currentPopup, buttonText: e.target.value })} placeholder="Jogar Agora" />
                </div>
                <div className="grid gap-2">
                <Label htmlFor="linkUrl-popup">URL do Link do Botão (opcional)</Label>
                <Input id="linkUrl-popup" value={currentPopup.linkUrl} onChange={(e) => setCurrentPopup({ ...currentPopup, linkUrl: e.target.value })} placeholder="/cassino" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 items-center">
                 <div className="grid gap-2">
                    <Label htmlFor="priority-popup">Prioridade</Label>
                    <Input id="priority-popup" type="number" value={currentPopup.priority} onChange={(e) => setCurrentPopup({ ...currentPopup, priority: Number(e.target.value) })} />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                    <Switch id="active-popup" checked={currentPopup.active} onCheckedChange={(checked) => setCurrentPopup({...currentPopup, active: checked})}/>
                    <Label htmlFor="active-popup">Ativo</Label>
                </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
                <div className="grid gap-2">
                    <Label htmlFor="startAt-popup">Início (opcional)</Label>
                    <Input id="startAt-popup" type='datetime-local' value={currentPopup.startAt} onChange={(e) => setCurrentPopup({ ...currentPopup, startAt: e.target.value })} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="endAt-popup">Fim (opcional)</Label>
                    <Input id="endAt-popup" type='datetime-local' value={currentPopup.endAt} onChange={(e) => setCurrentPopup({ ...currentPopup, endAt: e.target.value })} />
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não pode ser desfeita. Isso excluirá permanentemente o pop-up.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
