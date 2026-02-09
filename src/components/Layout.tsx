import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  FileText,
  BarChart3,
  LogOut,
  ChefHat,
  Menu,
  Bell,
  Home,
  ShoppingBag,
  UserCircle,
  Link2,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { config } from '../config';
import { apiFetch } from '../lib/api';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from './ui/sheet';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Início', href: '/', icon: Home, roles: ['administrador', 'gerencia', 'operacao'] },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['administrador', 'gerencia', 'operacao'] },
  { name: 'Vendas', href: '/vendas', icon: ShoppingBag, roles: ['administrador', 'gerencia'] },
  { name: 'Mapeamentos', href: '/mapeamentos', icon: Link2, roles: ['administrador', 'gerencia'] },
  { name: 'Cadastros', href: '/cadastros', icon: Package, roles: ['administrador', 'gerencia'] },
  { name: 'Operações', href: '/operacoes', icon: ClipboardList, roles: ['administrador', 'gerencia', 'operacao'] },
  { name: 'Checklists', href: '/checklists', icon: FileText, roles: ['administrador', 'gerencia', 'operacao'] },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3, roles: ['administrador', 'gerencia'] },
  { name: 'Minha Conta', href: '/perfil', icon: UserCircle, roles: ['administrador', 'gerencia', 'operacao'] },
];

interface NavigationContentProps {
  onNavigate?: () => void;
  unresolvedAlerts: number;
}

function NavigationContent({ onNavigate, unresolvedAlerts }: NavigationContentProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role || 'operacao')
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold">Controle de Estoque</h1>
            <p className="text-sm text-gray-500">{user?.name}</p>
          </div>
        </div>
        <div className="mt-3">
          <Badge variant="outline" className="text-xs">
            {user?.role === 'administrador' && 'Administrador'}
            {user?.role === 'gerencia' && 'Gerência'}
            {user?.role === 'operacao' && 'Operação'}
          </Badge>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
              {item.name === 'Dashboard' && unresolvedAlerts > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {unresolvedAlerts}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={logout}>
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unresolvedAlerts, setUnresolvedAlerts] = useState(0);

  useEffect(() => {
    async function fetchAlertCount() {
      try {
        const response = await apiFetch(config.endpoints.alertas.stats);
        const result = await response.json();
        if (result.success) {
          setUnresolvedAlerts(result.stats?.byStatus?.pending || 0);
        }
      } catch {
        // Silently fail - badge just won't show
      }
    }
    fetchAlertCount();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col border-r bg-white">
        <NavigationContent unresolvedAlerts={unresolvedAlerts} />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-10 flex items-center px-4">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
            <NavigationContent onNavigate={() => setIsMobileMenuOpen(false)} unresolvedAlerts={unresolvedAlerts} />
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex items-center justify-center gap-2">
          <ChefHat className="w-5 h-5 text-orange-500" />
          <span className="font-semibold">Controle de Estoque</span>
        </div>

        {unresolvedAlerts > 0 && (
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
          </Link>
        )}
      </div>

      {/* Main Content */}
      <main className="md:pl-64 pt-16 md:pt-0">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
