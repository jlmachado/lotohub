'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { register, getSession } from '@/utils/auth';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    nome: '',
    terminal: '',
    password: '',
    confirmPassword: '',
    whatsapp: '',
  });
  
  const [loading, setLoading] = useState(false);

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (getSession()) router.push('/');
  }, [router]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.terminal || !formData.password) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Preencha os dados obrigatórios.' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ variant: 'destructive', title: 'Erro de senha', description: 'As senhas não coincidem.' });
      return;
    }

    if (formData.password.length < 4) {
      toast({ variant: 'destructive', title: 'Senha fraca', description: 'A senha deve ter no mínimo 4 caracteres.' });
      return;
    }

    setLoading(true);

    // Simular delay para melhor UX
    setTimeout(() => {
      const result = register({
        nome: formData.nome,
        terminal: formData.terminal,
        password: formData.password,
        whatsapp: formData.whatsapp,
      });

      if (result.success) {
        toast({ 
          title: 'Conta criada!', 
          description: result.message,
        });
        router.push('/login');
      } else {
        toast({ variant: 'destructive', title: 'Erro no cadastro', description: result.message });
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <Logo height={40} />
      </div>

      <Card className="w-full max-w-lg border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">Criar Nova Conta</CardTitle>
          <CardDescription className="text-slate-400 font-medium">Cadastre seu terminal para começar a jogar agora</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">Nome Completo</Label>
                <Input 
                  id="nome" 
                  placeholder="João Silva" 
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="bg-black/40 border-white/10 h-12 text-white focus:border-primary/50 transition-all rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terminal" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">Nº do Terminal</Label>
                <Input 
                  id="terminal" 
                  placeholder="Ex: 10001" 
                  value={formData.terminal}
                  onChange={(e) => setFormData({...formData, terminal: e.target.value.replace(/\D/g, '')})}
                  className="bg-black/40 border-white/10 h-12 text-white text-lg font-mono focus:border-primary/50 transition-all rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pass" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">Senha</Label>
                <Input 
                  id="pass" 
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="bg-black/40 border-white/10 h-12 text-white focus:border-primary/50 transition-all rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">Confirmar Senha</Label>
                <Input 
                  id="confirm" 
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="bg-black/40 border-white/10 h-12 text-white focus:border-primary/50 transition-all rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">WhatsApp (Para suporte e saques)</Label>
              <Input 
                id="whatsapp" 
                placeholder="+55 11 99999-9999" 
                value={formData.whatsapp}
                onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                className="bg-black/40 border-white/10 h-12 text-white focus:border-primary/50 transition-all rounded-xl"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 mt-2">
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase italic text-lg lux-shine rounded-xl shadow-lg active:scale-95 transition-transform">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Finalizar Cadastro</span>
                </div>
              )}
            </Button>
            
            <div className="flex items-center justify-between w-full px-1">
              <Link href="/login" className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
                <ArrowLeft size={14} /> Já tenho uma conta
              </Link>
              <Link href="/" className="text-xs text-slate-500 hover:text-white transition-colors">
                Voltar ao início
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
      
      <p className="mt-8 text-[10px] text-slate-600 font-bold uppercase tracking-[4px]">LotoHub Premium &copy; 2024</p>
    </div>
  );
}