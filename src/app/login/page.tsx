'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { login, getSession } from '@/utils/auth';
import { useToast } from '@/hooks/use-toast';
import { LogIn, ArrowLeft, Loader2 } from 'lucide-react';
import { getBancas, setBancaContextBanca } from '@/utils/bancasStorage';
import { useAppContext } from '@/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { refreshData } = useAppContext();
  
  const [terminal, setTerminal] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirecionar se já estiver logado
  useEffect(() => {
    const session = getSession();
    if (session) {
      if (['ADMIN', 'SUPER_ADMIN'].includes(session.tipoUsuario)) {
        router.push('/admin');
      } else if (session.tipoUsuario === 'CAMBISTA') {
        router.push('/cambista/caixa');
      } else if (session.tipoUsuario === 'PROMOTOR') {
        router.push('/promotor/comissao');
      } else {
        router.push('/');
      }
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminal || !password) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Informe seu terminal e senha.' });
      return;
    }

    setLoading(true);
    
    // Simular delay para melhor UX
    setTimeout(() => {
      const result = login(terminal, password);

      if (result.success) {
        const user = result.user;

        // 1. AUTO-SET BANCA CONTEXT
        if (user?.bancaId) {
          const bancas = getBancas();
          const targetBanca = bancas.find(b => b.id === user.bancaId);
          if (targetBanca) {
            setBancaContextBanca(targetBanca);
          }
        }

        // 2. Notificar AppContext para atualizar o estado do usuário imediatamente
        refreshData();

        toast({ title: 'Acesso autorizado!', description: `Bem-vindo, ${user?.nome}` });

        // 3. Redirect com base no perfil
        if (user?.tipoUsuario === 'ADMIN' || user?.tipoUsuario === 'SUPER_ADMIN') {
          router.push('/admin');
        } else if (user?.tipoUsuario === 'CAMBISTA') {
          router.push('/cambista/caixa');
        } else if (user?.tipoUsuario === 'PROMOTOR') {
          router.push('/promotor/comissao');
        } else {
          router.push('/');
        }
      } else {
        toast({ variant: 'destructive', title: 'Falha no login', description: result.message });
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <Logo height={48} />
      </div>

      <Card className="w-full max-w-md border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">Entrar no Sistema</CardTitle>
          <CardDescription className="text-slate-400 font-medium">Acesse sua conta para continuar jogando</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="terminal" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">Terminal ou Usuário</Label>
              <Input 
                id="terminal" 
                placeholder="Ex: 10001 ou email" 
                value={terminal} 
                onChange={(e) => setTerminal(e.target.value)}
                className="bg-black/40 border-white/10 h-12 text-white text-lg focus:border-primary/50 transition-all rounded-xl"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" name="password" className="text-white/70 font-bold uppercase text-[10px] tracking-widest">Senha Master</Label>
                <Link href="#" className="text-[10px] font-black uppercase text-primary hover:underline tracking-widest">Esqueceu?</Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/40 border-white/10 h-12 text-white text-lg focus:border-primary/50 transition-all rounded-xl"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase italic text-lg lux-shine rounded-xl shadow-lg active:scale-95 transition-transform">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Autenticando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="h-5 w-5" />
                  <span>Acessar Conta</span>
                </div>
              )}
            </Button>
            
            <div className="flex items-center justify-between w-full px-1">
              <Link href="/" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
                <ArrowLeft size={14} /> Voltar para o início
              </Link>
              <div className="text-xs text-slate-400">
                Não tem conta?{' '}
                <Link href="/cadastro" className="text-primary font-bold hover:underline">Cadastre-se</Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
      
      <p className="mt-8 text-[10px] text-slate-600 font-bold uppercase tracking-[4px]">LotoHub Premium &copy; 2024</p>
    </div>
  );
}