import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  Star, 
  Gem, 
  Goal, 
  Video, 
  ImageIcon, 
  Newspaper, 
  FileBarChart, 
  Settings,
  Building2,
  ArrowDownToLine,
  Search,
  Layers,
  ShieldCheck,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

export function getAdminMenuItems(user: any, context: any, modules: any) {
  const items = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/usuarios", label: "Usuários", icon: Users },
  ];

  if (modules && (modules.jogoDoBicho || modules.seninha || modules.quininha || modules.lotinha || modules.loteriaUruguai)) {
    items.push({ href: "/admin/loterias", label: "Loterias", icon: Ticket });
    // Novo item de Resultados
    items.push({ href: "/admin/resultados-bicho", label: "Resultados Bicho", icon: CheckCircle2 });
  }

  if (modules?.bingo) items.push({ href: "/admin/bingo", label: "Bingo", icon: Star });
  if (modules?.cassino) items.push({ href: "/admin/cassino", label: "Cassino", icon: Gem });
  
  if (modules?.futebol) {
    items.push({ href: "/admin/futebol", label: "Futebol: Dashboard", icon: Goal });
    items.push({ href: "/admin/futebol/ligas", label: "Futebol: Ligas", icon: Search });
    items.push({ href: "/admin/futebol/mercados", label: "Futebol: Mercados", icon: Layers });
    items.push({ href: "/admin/futebol/limites", label: "Futebol: Limites", icon: ShieldCheck });
    items.push({ href: "/admin/futebol/risco", label: "Futebol: Risco", icon: TrendingUp });
    items.push({ href: "/admin/futebol/apostas", label: "Futebol: Auditoria", icon: FileBarChart });
  }
  
  if (modules?.sinucaAoVivo) items.push({ href: "/admin/sinuca", label: "Sinuca ao Vivo", icon: Video });

  if (context?.mode === 'GLOBAL') {
    items.push({ href: "/admin/bancas", label: "Gerenciar Bancas", icon: Building2 });
    items.push({ href: "/admin/descargas", label: "Descarga Global", icon: ArrowDownToLine });
  } else {
    items.push({ href: "/admin/descarga", label: "Configurar Descarga", icon: ArrowDownToLine });
  }

  items.push(
    { href: "/admin/imagens", label: "Imagens & Banners", icon: ImageIcon },
    { href: "/admin/noticias", label: "Notícias (Ticker)", icon: Newspaper },
    { href: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
    { href: "/admin/configuracoes", label: "Configurações", icon: Settings }
  );

  return items;
}
