'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, PlusCircle, Edit, Trash2, ArrowUp, ArrowDown, Calendar, Copy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useAppContext, Banner, ImageMetadata } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ImageUploader, UploadedImageData } from '@/components/admin/ImageUploader';
import { formatBytes, PLACEHOLDER_IMAGE_DATA_URI } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type FormState = Omit<Banner, 'id' | 'bancaId' | 'createdAt' | 'updatedAt'>;

const initialFormState: FormState = {
  title: '',
  content: '',
  imageUrl: '',
  thumbUrl: '',
  linkUrl: '',
  position: 0,
  active: true,
  startAt: '',
  endAt: '',
};

export default function AdminStatusPage() {
  const { banners, addBanner, updateBanner, deleteBanner } = useAppContext();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<FormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const sortedBanners = [...banners].sort((a, b) => a.position - b.position);

  const handleAddNew = () => {
    setEditingId(null);
    setCurrentBanner({ ...initialFormState, position: (sortedBanners[sortedBanners.length-1]?.position || 0) + 1 });
    setIsDialogOpen(true);
  };
  
  const handleEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setCurrentBanner(banner);
    setIsDialogOpen(true);
  };

  const handleUploadComplete = (data: UploadedImageData) => {
    setCurrentBanner(prev => ({
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
      deleteBanner(deletingId);
      toast({ title: 'Status excluído com sucesso!' });
    }
    setIsDeleteAlertOpen(false);
    setDeletingId(null);
  };

  const handleSave = () => {
    if (!currentBanner.title || !currentBanner.imageUrl) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Título e Imagem são obrigatórios.' });
      return;
    }
    
    if (editingId) {
      updateBanner({ ...currentBanner, id: editingId } as Banner);
      toast({ title: 'Status atualizado com sucesso!' });
    } else {
      addBanner(currentBanner);
      toast({ title: 'Status criado com sucesso!' });
    }

    setIsDialogOpen(false);
    setEditingId(null);
  };
  
  const handleMove = (id: string, direction: 'up' | 'down') => {
    const index = sortedBanners.findIndex(b => b.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      const bannerA = sortedBanners[index];
      const bannerB = sortedBanners[index-1];
      updateBanner({ ...bannerA, position: bannerB.position });
      updateBanner({ ...bannerB, position: bannerA.position });
    } else if (direction === 'down' && index < sortedBanners.length - 1) {
      const bannerA = sortedBanners[index];
      const bannerB = sortedBanners[index+1];
      updateBanner({ ...bannerA, position: bannerB.position });
      updateBanner({ ...bannerB, position: bannerA.position });
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'O link da imagem foi copiado.' });
  }
  
  const isScheduled = (banner: Banner) => banner.startAt || banner.endAt;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = PLACEHOLDER_IMAGE_DATA_URI;
  };

  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/imagens"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-3xl font-bold">Gerenciar Status (Stories)</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Status da Página Inicial</CardTitle>
            <CardDescription>Gerencie os status estilo Instagram que aparecem no topo.</CardDescription>
          </div>
          <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Novo Status</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBanners.map((banner, index) => (
                <TableRow key={banner.id}>
                  <TableCell className="space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleMove(banner.id, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleMove(banner.id, 'down')} disabled={index === sortedBanners.length - 1}><ArrowDown className="h-4 w-4"/></Button>
                  </TableCell>
                  <TableCell>
                      <div className="w-12 h-12 rounded-full border-2 border-primary overflow-hidden relative bg-muted">
                      <Image
                          src={banner.imageUrl}
                          alt={banner.title}
                          fill
                          className="object-cover"
                          onError={handleImageError}
                        />
                      </div>
                  </TableCell>
                  <TableCell className="font-medium">{banner.title}</TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Badge variant={banner.active ? 'default' : 'secondary'}>{banner.active ? 'Ativo' : 'Inativa'}</Badge>
                      {isScheduled(banner) && <Badge variant="outline"><Calendar className="h-3 w-3 mr-1" /> Agendado</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                      <TooltipProvider>
                      {banner.imageMeta && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className='cursor-default'>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatBytes(banner.imageMeta.sizeBytes)}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(banner.imageUrl)}><Copy className="h-4 w-4"/></Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(banner)}><Edit className="mr-2 h-4 w-4" />Editar</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(banner.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Status' : 'Adicionar Novo Status'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
             <div className="grid gap-1.5">
                <Label htmlFor="image" className="text-xs font-bold uppercase text-muted-foreground">Imagem do Status (9:16)</Label>
                <div className="status-preview">
                  <ImageUploader 
                    onUploadComplete={handleUploadComplete}
                    maxSizeKb={800}
                    outputWidth={1080}
                    outputQuality={0.8}
                    aspectRatio={9/16}
                    currentImagePreview={currentBanner.imageUrl}
                  />
                </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="title" className="text-xs font-bold uppercase text-muted-foreground">Título Curto</Label>
              <Input id="title" value={currentBanner.title} onChange={(e) => setCurrentBanner({ ...currentBanner, title: e.target.value })} maxLength={15} placeholder="Ex: Promoção" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="content" className="text-xs font-bold uppercase text-muted-foreground">Conteúdo do Status</Label>
              <Textarea 
                id="content" 
                value={currentBanner.content} 
                onChange={(e) => setCurrentBanner({ ...currentBanner, content: e.target.value })} 
                placeholder="Texto que aparecerá sobre a imagem..." 
                className="max-h-[80px] resize-none"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="linkUrl" className="text-xs font-bold uppercase text-muted-foreground">Link do Botão (Opcional)</Label>
              <Input id="linkUrl" value={currentBanner.linkUrl} onChange={(e) => setCurrentBanner({ ...currentBanner, linkUrl: e.target.value })} placeholder="/loterias" />
            </div>
             <div className="flex items-center space-x-2 pt-1">
                <Switch id="active" checked={currentBanner.active} onCheckedChange={(checked) => setCurrentBanner({...currentBanner, active: checked})}/>
                <Label htmlFor="active" className="text-sm">Status Ativo</Label>
            </div>
            <div className='grid grid-cols-2 gap-3 pt-1'>
                <div className="grid gap-1.5">
                    <Label htmlFor="startAt" className="text-xs font-bold uppercase text-muted-foreground">Início Exibição</Label>
                    <Input id="startAt" type='datetime-local' value={currentBanner.startAt} onChange={(e) => setCurrentBanner({ ...currentBanner, startAt: e.target.value })} className="text-xs" />
                </div>
                 <div className="grid gap-1.5">
                    <Label htmlFor="endAt" className="text-xs font-bold uppercase text-muted-foreground">Fim Exibição</Label>
                    <Input id="endAt" type='datetime-local' value={currentBanner.endAt} onChange={(e) => setCurrentBanner({ ...currentBanner, endAt: e.target.value })} className="text-xs" />
                </div>
            </div>
          </div>
          <DialogFooter className="status-actions flex flex-row gap-2 justify-center mt-4">
            <DialogClose asChild>
              <Button variant="outline" className="h-11 px-6 rounded-xl">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave} className="h-11 px-8 rounded-xl font-bold">Salvar Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não pode ser desfeita. Isso excluirá permanentemente o status.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
