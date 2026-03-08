'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronLeft, Edit, Play } from 'lucide-react';
import Image from 'next/image';

const games = [
    {
        name: 'Fortune Tiger',
        provider: 'PG Soft (Demo)',
        status: 'active',
        playUrl: '/games/fortune-tiger/',
        imageUrl: '/img/cassino.png' 
    }
];

export default function AdminCassinoJogosPage() {
  return (
    <main className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/cassino"><Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-3xl font-bold">Gerenciar Jogos do Cassino</h1>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>Lista de Jogos</CardTitle>
              <CardDescription>Visualize e gerencie os jogos disponíveis no seu cassino.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Jogo</TableHead>
                          <TableHead>Provedor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {games.map((game) => (
                          <TableRow key={game.name}>
                              <TableCell className="font-medium flex items-center gap-3">
                                  <Image src={game.imageUrl} alt={game.name} width={40} height={40} className="rounded-md" />
                                  {game.name}
                              </TableCell>
                              <TableCell>{game.provider}</TableCell>
                              <TableCell>
                                  <Badge variant={game.status === 'active' ? 'default' : 'destructive'}>
                                      {game.status === 'active' ? 'Ativo' : 'Inativo'}
                                  </Badge>
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                   <Link href={game.playUrl} target="_blank" rel="noopener noreferrer">
                                      <Button variant="outline" size="sm">
                                          <Play className="mr-2 h-4 w-4" />
                                          Abrir
                                      </Button>
                                  </Link>
                                  <Button variant="outline" size="sm" disabled>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                  </Button>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
    </main>
  );
}
