import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import {
  ClipboardCheck,
  PackageCheck,
  ShoppingCart,
  BarChart3,
  Users,
  ChefHat,
  Package,
  ArrowRight,
} from 'lucide-react';

export function Launchpad() {
  const { user } = useAuth();

  // Definição dos Apps/Botões
  const apps = [
    {
      title: 'Minhas Tarefas',
      icon: ClipboardCheck,
      href: '/checklists',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Checklist diário e rotinas',
      roles: ['administrador', 'gerencia', 'operacao'],
    },
    {
      title: 'Receber Pedido',
      icon: PackageCheck,
      href: '/operacoes?tab=recebimentos&action=new',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Entrada de notas e insumos',
      roles: ['administrador', 'gerencia', 'operacao'],
    },
    {
      title: 'Inventário',
      icon: ChefHat,
      href: '/operacoes?tab=inventario&action=new',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Contagem de estoque físico',
      roles: ['administrador', 'gerencia', 'operacao'],
    },
    {
      title: 'Novo Pedido',
      icon: ShoppingCart,
      href: '/operacoes?tab=pedidos&action=new',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Comprar insumos',
      roles: ['administrador', 'gerencia'],
    },
    {
      title: 'Cadastros',
      icon: Package,
      href: '/cadastros',
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      description: 'Insumos e Fichas Técnicas',
      roles: ['administrador', 'gerencia'],
    },
    {
      title: 'Equipe',
      icon: Users,
      href: '/cadastros?tab=equipe',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'Gestão de colaboradores',
      roles: ['administrador', 'gerencia'],
    },
    {
      title: 'Relatórios',
      icon: BarChart3,
      href: '/relatorios',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      description: 'CMV e DRE',
      roles: ['administrador', 'gerencia'],
    },
  ];

  const filteredApps = apps.filter((app) =>
    app.roles.includes(user?.role || 'operacao')
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Olá, {user?.name.split(' ')[0]}!</h1>
        <p className="text-gray-500 mt-1">Selecione uma ação rápida para começar.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredApps.map((app) => (
          <Link key={app.title} to={app.href} className="group">
            <Card className="h-full transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-gray-200">
              <CardContent className="p-6 flex flex-col items-start h-full">
                <div className={`p-3 rounded-xl mb-4 ${app.bgColor} ${app.color}`}>
                  <app.icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {app.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4 flex-1">
                  {app.description}
                </p>
                <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-gray-900 transition-colors">
                  Acessar <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
