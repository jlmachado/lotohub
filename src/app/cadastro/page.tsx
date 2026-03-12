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
import { UserPlus, ArrowLeft, Loader2, CheckCircle2, Copy, LogIn } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    cidade: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ terminal: string } | null>(null);

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (getSession()) router.push('/');
  }, [router]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.cpf || !formData.email || !formData.password) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Preencha todos os dados obrigatórios.' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ variant: 'destructive', title: 'Erro de senha', description: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);

    // Simular delay para melhor UX
    setTimeout(() => {
      const result = register({
        nome: formData.nome,
        cpf: formData.cpf,
        cidade: formData.cidade,
        email: formData.email,
        password: formData.password,
      });

      if (result.success && result.terminal) {
        setSuccessData({ terminal: result.terminal });
        toast({ 
          title: 'Conta criada!', 
          description: `Seu terminal é: ${result.terminal}`,
        });
      } else {
        toast({ variant: 'destructive', title: 'Erro no cadastro', description: result.message });
        setLoading(false);
      }
    }, 1200);
  };

  const copyTerminal = () => {
    if (successData) {
      navigator.clipboard.writeText(successData.terminal);
      toast({ title: 'Copiado!', description: 'Número do terminal copiado para a área de transferência.' });
    }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="mb-8 animate-in fade-in zoom-in duration-500">
          <Logo height={40} />
        </div>
        <Card className="w-full max-w-md border-primary/20 bg-slate-900/90 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-black uppercase italic text-white">Cadastro Concluído!</CardTitle>
            <CardDescription className="text-slate-400">Guarde seu número de acesso com cuidado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 rounded-2xl bg-black/40 border border-white/5 text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground">Seu Terminal de Acesso</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-5xl font-black text-primary font-mono tracking-tighter">{successData.terminal}</span>
                <Button variant="ghost" size="icon" onClick={copyTerminal} className="h-10 w-10 rounded-full hover:bg-white/5">
                  <Copy className="h-5 w-5 text-primary" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-center text-slate-500 leading-relaxed">
              Utilize este número e a senha cadastrada para entrar no sistema em qualquer dispositivo.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/login')} className="w-full h-14 font-black uppercase italic text-lg lux-shine rounded-xl">
              <LogIn className="mr-2 h-5 w-5" /> Ir para o Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <Logo height={40} />
      </div>

      <Card className="w-full max-w-lg border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">Criar Nova Conta</CardTitle>
          <CardDescription className="text-slate-400 font-medium">Preencha seus dados para gerar seu terminal</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">Nome Completo</Label>
              <Input 
                id="nome" 
                placeholder="Ex: João Silva Sauro" 
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="bg-black/40 border-white/10 h-11 text-white focus:border-primary/50 transition-all rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">CPF</Label>
                <Input 
                  id="cpf" 
                  placeholder="000.000.000-00" 
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: e.target.value.replace(/\D/g, '')})}
                  maxLength={11}
                  className="bg-black/40 border-white/10 h-11 text-white focus:border-primary/50 transition-all rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">Cidade</Label>
                <Input 
                  id="cidade" 
                  placeholder="Sua cidade" 
                  value={formData.cidade}
                  onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                  className="bg-black/40 border-white/10 h-11 text-white focus:border-primary/50 transition-all rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">E-mail</Label>
              <Input 
                id="email" 
                type="email"
                placeholder="joao@exemplo.com" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="bg-black/40 border-white/10 h-11 text-white focus:border-primary/50 transition-all rounded-xl"
                required
              />
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
                  className="bg-black/40 border-white/10 h-11 text-white focus:border-primary/50 transition-all rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-white/70 font-bold uppercase text-[10px] tracking-widest ml-1">Confirmar</Label>
                <Input 
                  id="confirm" 
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="bg-black/40 border-white/10 h-11 text-white focus:border-primary/50 transition-all rounded-xl"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 mt-2">
            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase italic text-lg lux-shine rounded-xl shadow-lg active:scale-95 transition-transform">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Gerando Acesso...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  <span>Cadastrar e Gerar Terminal</span>
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
