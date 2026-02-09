import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Package,
  CalendarDays,
  AlertOctagon,
  ClipboardList,
  Truck,
  CheckCircle2,
  Clock,
  RefreshCw,
  User,
} from 'lucide-react';
import { Link } from 'react-router';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { config } from '../config';
import { toast } from 'sonner';

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val._seconds) return new Date(val._seconds * 1000);
  if (val.seconds) return new Date(val.seconds * 1000);
  if (typeof val === 'string') return new Date(val);
  if (val instanceof Date) return val;
  return null;
}

function ManagerDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [percentChange, setPercentChange] = useState(0);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [pedidosPendentes, setPedidosPendentes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const safeFetch = async (url: string) => {
    try {
      const res = await apiFetch(url);
      return await res.json();
    } catch (e) {
      console.error('Fetch failed:', url, e);
      return { success: false };
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [receitaData, alertasData, pedidosData, activityData] = await Promise.all([
        safeFetch(config.endpoints.dashboard.receitaDiaria),
        safeFetch(config.endpoints.alertas.list + '?status=pending'),
        safeFetch(config.endpoints.operacoes.purchases + '?status=pending'),
        safeFetch(config.endpoints.activity.list + '?limit=10'),
      ]);

      if (receitaData.success) {
        setChartData((receitaData.data || []).map((d: any) => ({
          date: d.dateLabel || d.date,
          revenue: d.revenue,
          quantity: d.quantity,
        })));
        setTotalRevenue(receitaData.totalRevenue || 0);
        setPercentChange(receitaData.percentChange || 0);
      }
      if (alertasData.success) setAlertas(alertasData.alertas || []);
      if (pedidosData.success) setPedidosPendentes(pedidosData.purchases || []);
      if (activityData?.success) setActivities(activityData.activities || []);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Gerencial</h1>
          <p className="text-gray-500 mt-1">Carregando dados...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const highPriorityAlerts = alertas.filter(a => a.priority === 'high');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Gerencial</h1>
          <p className="text-gray-500 mt-1">Visao geral de desempenho e alertas operacionais</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-md border shadow-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Receita (7 dias)</p>
                <p className="text-2xl font-bold mt-1">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {percentChange !== 0 ? (
                <span className={percentChange > 0 ? 'text-green-600 flex items-center' : 'text-red-600 flex items-center'}>
                  {percentChange > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                  {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}% vs. semana anterior
                </span>
              ) : (
                <span className="text-gray-500">Sem dados da semana anterior</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Pedidos Pendentes</p>
                <p className="text-2xl font-bold mt-1 text-orange-600">{pedidosPendentes.length}</p>
              </div>
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Aguardando entrega de fornecedores
            </div>
          </CardContent>
        </Card>

        <Link to="/operacoes?tab=estoque&action=inventory">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Inventario</p>
                  <p className="text-2xl font-bold mt-1 text-purple-600">Conferir</p>
                </div>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <ClipboardList className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-sm text-purple-600">
                Iniciar contagem fisica
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Alertas Ativos</p>
                <p className="text-2xl font-bold mt-1 text-indigo-600">{alertas.length}</p>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <AlertOctagon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-indigo-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span>{highPriorityAlerts.length} de alta prioridade</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Receita de Vendas</CardTitle>
            <CardDescription>Desempenho diario dos ultimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                    <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']} cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p>Sem dados de vendas no periodo</p>
                    <p className="text-xs mt-1">Faca upload de vendas na aba Vendas</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertas Operacionais</CardTitle>
              <CardDescription>Itens que precisam de atencao imediata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {alertas.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhum alerta pendente</p>
                ) : (
                  alertas.slice(0, 5).map((alert: any) => (
                    <div key={alert.id} className="flex gap-3 items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className={`p-2 rounded-full shrink-0 ${alert.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {parseDate(alert.createdAt)?.toLocaleDateString('pt-BR') || ''}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pedidos em Aberto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pedidosPendentes.slice(0, 3).map((order: any) => {
                  const deliveryDate = parseDate(order.expected_delivery);
                  return (
                    <div key={order.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm">{order.supplier_name || 'Fornecedor'}</p>
                        <p className="text-xs text-gray-500">
                          Entrega: {deliveryDate?.toLocaleDateString('pt-BR') || '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">R$ {(order.total_value || 0).toFixed(2)}</p>
                        <Link to="/operacoes?tab=pedidos" className="text-xs text-blue-600 hover:underline">Ver</Link>
                      </div>
                    </div>
                  );
                })}
                {pedidosPendentes.length > 3 && (
                  <div className="pt-2 text-center">
                    <Link to="/operacoes?tab=pedidos" className="text-sm text-gray-500 hover:text-gray-900">
                      Ver mais {pedidosPendentes.length - 3} pedidos
                    </Link>
                  </div>
                )}
                {pedidosPendentes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">Nenhum pedido pendente</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                Atividade Recente
              </CardTitle>
              <CardDescription>Ultimas acoes da equipe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {activities.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhuma atividade registrada</p>
                ) : (
                  activities.map((act: any) => (
                    <div key={act.id} className="flex gap-3 items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="p-2 rounded-full bg-gray-100 text-gray-500 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{act.summary}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {parseDate(act.created_at)?.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) || ''}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OperationsDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const safeFetch = async (url: string) => {
    try {
      const res = await apiFetch(url);
      return await res.json();
    } catch (e) {
      console.error('Fetch failed:', url, e);
      return { success: false };
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [alertasData, pedidosData, tasksData] = await Promise.all([
        safeFetch(config.endpoints.alertas.list + '?status=pending'),
        safeFetch(config.endpoints.operacoes.purchases + '?status=pending'),
        safeFetch(config.endpoints.checklists.tasks + '?assignedTo=' + (user?.id || '') + '&completed=false'),
      ]);

      if (alertasData.success) setAlertas(alertasData.alertas || []);
      if (pedidosData.success) setDeliveries(pedidosData.purchases || []);
      if (tasksData.success) setTaskCount((tasksData.tasks || []).length);
    } catch (error) {
      console.error('Erro ao carregar painel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel Operacional</h1>
          <p className="text-gray-500 mt-1">Carregando...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel Operacional</h1>
          <p className="text-gray-500 mt-1">Bem-vindo(a), {user?.name}. Aqui estao suas prioridades para hoje.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-md border shadow-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-blue-700">Tarefas Pendentes</p>
                <p className="text-3xl font-bold mt-1 text-blue-900">{taskCount}</p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <ClipboardList className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <Link to="/checklists">
                <Button variant="outline" size="sm" className="w-full bg-white hover:bg-blue-50 text-blue-700 border-blue-200">
                  Ver Lista
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-orange-700">Entregas Previstas</p>
                <p className="text-3xl font-bold mt-1 text-orange-900">{deliveries.length}</p>
              </div>
              <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                <Truck className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <Link to="/operacoes?tab=recebimentos">
                <Button variant="outline" size="sm" className="w-full bg-white hover:bg-orange-50 text-orange-700 border-orange-200">
                  Receber Itens
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br border ${alertas.length > 0 ? 'from-red-50 to-white border-red-100' : 'from-green-50 to-white border-green-100'}`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-sm font-medium ${alertas.length > 0 ? 'text-red-700' : 'text-green-700'}`}>Alertas Criticos</p>
                <p className={`text-3xl font-bold mt-1 ${alertas.length > 0 ? 'text-red-900' : 'text-green-900'}`}>{alertas.length}</p>
              </div>
              <div className={`p-3 rounded-xl ${alertas.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className={`w-full bg-white ${alertas.length > 0 ? 'hover:bg-red-50 text-red-700 border-red-200' : 'hover:bg-green-50 text-green-700 border-green-200'}`}>
                  Ver Detalhes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-purple-700">Inventario</p>
                <p className="text-3xl font-bold mt-1 text-purple-900">Conferir</p>
              </div>
              <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                <ClipboardList className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <Link to="/operacoes?tab=estoque&action=inventory">
                <Button variant="outline" size="sm" className="w-full bg-white hover:bg-purple-50 text-purple-700 border-purple-200">
                  Contagem Fisica
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              Atencao Necessaria
            </CardTitle>
            <CardDescription>Estoque baixo e itens que precisam de atencao</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alertas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-2" />
                  <p>Tudo certo! Sem alertas no momento.</p>
                </div>
              ) : (
                alertas.slice(0, 5).map((alert: any) => (
                  <div key={alert.id} className="flex items-start gap-4 p-4 rounded-lg border bg-gray-50">
                    <div className={`mt-1 p-1.5 rounded-full ${alert.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {alert.type === 'stock_low' || alert.type === 'stock_critical' ? 'Estoque Baixo' : alert.title || 'Alerta'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Entregas Previstas
            </CardTitle>
            <CardDescription>Pedidos agendados para os proximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deliveries.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Nenhuma entrega prevista.</p>
              ) : (
                deliveries.slice(0, 5).map((order: any) => {
                  const deliveryDate = parseDate(order.expected_delivery);
                  const isToday = deliveryDate?.toDateString() === new Date().toDateString();

                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {(order.supplier_name || '??').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{order.supplier_name || 'Fornecedor'}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Pedido #{order.order_number || order.id?.slice(0, 6)}</span>
                            <span>-</span>
                            <Badge variant={isToday ? 'default' : 'secondary'} className="text-[10px] h-5">
                              {isToday ? 'Hoje' : deliveryDate?.toLocaleDateString('pt-BR') || '-'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">R$ {(order.total_value || 0).toFixed(2)}</p>
                        <Link to="/operacoes?tab=recebimentos" className="text-xs text-blue-600 hover:underline">
                          Receber
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'operacao') {
    return <OperationsDashboard />;
  }

  return <ManagerDashboard />;
}
