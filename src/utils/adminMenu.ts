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
  ArrowDownToLine
} from 'lucide-react';

export const adminMenuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/loterias", label: "Loterias", icon: Ticket },
  { href: "/admin/bingo", label: "Bingo", icon: Star },
  { href: "/admin/cassino", label: "Cassino", icon: Gem },
  { href: "/admin/futebol", label: "Futebol", icon: Goal },
  { href: "/admin/sinuca", label: "Sinuca ao Vivo", icon: Video },
  { href: "/admin/imagens", label: "Imagens & Banners", icon: ImageIcon },
  { href: "/admin/noticias", label: "Notícias (Ticker)", icon: Newspaper },
  { href: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function getAdminMenuItems(user: any, context: any, modules: any) {
  // Itens básicos comuns
  const items = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/usuarios", label: "Usuários", icon: Users },
  ];

  // Itens baseados em módulos ativos
  if (modules && (modules.jogoDoBicho || modules.seninha || modules.quininha || modules.lotinha || modules.loteriaUruguai)) {
    items.push({ href: "/admin/loterias", label: "Loterias", icon: Ticket });
  }

  if (modules?.bingo) items.push({ href: "/admin/bingo", label: "Bingo", icon: Star });
  if (modules?.cassino) items.push({ href: "/admin/cassino", label: "Cassino", icon: Gem });
  if (modules?.futebol) items.push({ href: "/admin/futebol", label: "Futebol", icon: Goal });
  if (modules?.sinucaAoVivo) items.push({ href: "/admin/sinuca", label: "Sinuca ao Vivo", icon: Video });

  // Gestão de Unidades e Descarga (Contexto)
  if (context?.mode === 'GLOBAL') {
    items.push({ href: "/admin/bancas", label: "Gerenciar Bancas", icon: Building2 });
    items.push({ href: "/admin/descargas", label: "Descarga Global", icon: ArrowDownToLine });
  } else {
    items.push({ href: "/admin/descarga", label: "Configurar Descarga", icon: ArrowDownToLine });
  }

  // Ferramentas administrativas comuns
  items.push(
    { href: "/admin/imagens", label: "Imagens & Banners", icon: ImageIcon },
    { href: "/admin/noticias", label: "Notícias (Ticker)", icon: Newspaper },
    { href: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
    { href: "/admin/configuracoes", label: "Configurações", icon: Settings }
  );

  return items;
}
