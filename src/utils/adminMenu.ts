import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  Star, 
  Gem, 
  PawPrint, 
  Clover, 
  Goal, 
  Video, 
  ImageIcon, 
  Newspaper, 
  FileBarChart, 
  Settings, 
  Building2,
  Trophy,
  ArrowDownToLine,
  Layers
} from 'lucide-react';
import { BancaContext } from './bancasStorage';

export interface AdminMenuItem {
  href: string;
  label: string;
  icon: any;
  enabled: boolean;
  superOnly?: boolean;
}

export const getAdminMenuItems = (user: any, context: BancaContext | null, modules: any): AdminMenuItem[] => {
  const isSuper = user?.tipoUsuario === 'SUPER_ADMIN';
  
  const items: AdminMenuItem[] = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, enabled: true },
    { href: "/admin/usuarios", label: "Usuários", icon: Users, enabled: true },
    { 
      href: "/admin/loterias", 
      label: "Loterias", 
      icon: Ticket, 
      enabled: !!(modules.jogoDoBicho || modules.seninha || modules.quininha || modules.lotinha || modules.loteriaUruguai) 
    },
    { href: "/admin/bingo", label: "Bingo", icon: Star, enabled: !!modules.bingo },
    { href: "/admin/cassino", label: "Cassino", icon: Gem, enabled: !!modules.cassino },
    { href: "/admin/futebol", label: "Futebol", icon: Goal, enabled: !!modules.futebol },
    { href: "/admin/sinuca", label: "Sinuca ao Vivo", icon: Video, enabled: !!modules.sinucaAoVivo },
    { href: "/admin/imagens", label: "Imagens & Banners", icon: ImageIcon, enabled: true },
    { href: "/admin/noticias", label: "Notícias (Ticker)", icon: Newspaper, enabled: true },
    { href: "/admin/relatorios", label: "Relatórios", icon: FileBarChart, enabled: true },
    
    // Menu de Descarga para Banca (Somente quando em contexto de banca)
    { 
      href: "/admin/descarga", 
      label: "Descarga", 
      icon: ArrowDownToLine, 
      enabled: !!context?.bancaId 
    },

    // Menu de Descarga Master (Somente para SuperAdmin no Global)
    { 
      href: "/admin/descargas", 
      label: "Descarga das Bancas", 
      icon: Layers, 
      enabled: isSuper && context?.mode === 'GLOBAL',
      superOnly: true 
    },

    { href: "/admin/configuracoes", label: "Configurações", icon: Settings, enabled: true },
    { 
      href: "/admin/bancas", 
      label: "Gerenciar Bancas", 
      icon: Building2, 
      enabled: isSuper,
      superOnly: true 
    },
  ];

  return items.filter(i => i.enabled);
};