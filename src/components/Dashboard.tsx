import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  CalendarDays,
  UtensilsCrossed,
  AlertOctagon,
  ClipboardList,
  Truck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  alerts,
  salesData,
  recipes,
  wasteData,
  ingredients,
  purchaseOrders,
  suppliers,
  tasks
} from '../data/mockData';
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

function ManagerDashboard() {
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const pendingOrders = purchaseOrders.filter((o) => o.status === 'pendente');

  // Calcular Vendas Diárias (Receita)
  const salesByDate = salesData.reduce((acc, curr) => {
    const recipe = recipes.find((r) => r.id === curr.recipeId);
    if (!recipe) return acc;
    
    const date = new Date(curr.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const revenue = curr.quantity * recipe.suggestedPrice;
    
    if (!acc[date]) {
      acc[date] = { date, revenue: 0, quantity: 0 };
    }
    acc[date].revenue += revenue;
    acc[date].quantity += curr.quantity;
    return acc;
  }, {} as Record<string, { date: string; revenue: number; quantity: number }>);

  const chartData = Object.values(salesByDate).sort((a, b) => {
     const [dayA, monthA] = a.date.split('/').map(Number);
     const [dayB, monthB] = b.date.split('/').map(Number);
     return (monthA * 31 + dayA) - (monthB * 31 + dayB);
  });

  const totalRevenue = Object.values(salesByDate).reduce((sum, day) => sum + day.revenue, 0);

  const totalWasteCost = wasteData.reduce((sum, item) => {
    const ingredient = ingredients.find((i) => i.id === item.ingredientId);
    if (!ingredient) return sum;
    const unitPrice = ingredient.price / ingredient.grossQuantity;
    return sum + (item.quantity * unitPrice);
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Gerencial</h1>
          <p className="text-gray-500 mt-1">Visão geral de desempenho e alertas operacionais</p>
        </div>
        <div className="flex items-center gap-2">
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
              <div className="mt-4 flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+12.5% vs. semana anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pedidos Pendentes</p>
                    <p className="text-2xl font-bold mt-1 text-orange-600">{pendingOrders.length}</p>
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

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Desperdício (Est.)</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">R$ {totalWasteCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                {wasteData.length} ocorrências registradas recentemente
              </div>
            </CardContent>
          </Card>
          
          <Card>
             <CardContent className="p-6">
              <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Alertas Ativos</p>
                    <p className="text-2xl font-bold mt-1 text-indigo-600">{unresolvedAlerts.length}</p>
                  </div>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <AlertOctagon className="w-5 h-5" />
                  </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-indigo-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span>{unresolvedAlerts.filter(a => a.severity === 'alta').length} de alta prioridade</span>
              </div>
            </CardContent>
          </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
         <Card className="md:col-span-4">
             <CardHeader>
                 <CardTitle>Receita de Vendas</CardTitle>
                 <CardDescription>Desempenho diário dos últimos 7 dias</CardDescription>
             </CardHeader>
             <CardContent className="pl-0">
                 <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis 
                                dataKey="date" 
                                stroke="#888888" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                             />
                             <YAxis 
                                stroke="#888888" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(value) => `R$${value}`} 
                             />
                             <Tooltip 
                                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                                cursor={{ fill: '#f3f4f6' }}
                             />
                             <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
             </CardContent>
         </Card>
         
         <div className="md:col-span-3 space-y-6">
             <Card>
                 <CardHeader>
                     <CardTitle>Alertas Operacionais</CardTitle>
                     <CardDescription>Itens que precisam de atenção imediata</CardDescription>
                 </CardHeader>
                 <CardContent>
                     <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                         {unresolvedAlerts.length === 0 ? (
                             <p className="text-sm text-gray-500 text-center py-4">Nenhum alerta pendente</p>
                         ) : (
                             unresolvedAlerts.map(alert => (
                                 <div key={alert.id} className="flex gap-3 items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                     <div className={`p-2 rounded-full shrink-0 ${alert.severity === 'alta' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                         <AlertTriangle className="w-4 h-4" />
                                     </div>
                                     <div>
                                         <p className="font-medium text-sm text-gray-900">{alert.message}</p>
                                         <p className="text-xs text-gray-500 mt-1">
                                            {new Date(alert.date).toLocaleDateString()}
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
                        {pendingOrders.slice(0, 3).map(order => {
                            const supplier = suppliers.find(s => s.id === order.supplierId);
                            return (
                                <div key={order.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-sm">{supplier?.name}</p>
                                        <p className="text-xs text-gray-500">Entrega: {new Date(order.expectedDelivery).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-sm">R$ {order.total.toFixed(2)}</p>
                                        <Link to="/operacoes?tab=pedidos" className="text-xs text-blue-600 hover:underline">Ver</Link>
                                    </div>
                                </div>
                            );
                        })}
                        {pendingOrders.length > 3 && (
                            <div className="pt-2 text-center">
                                <Link to="/operacoes?tab=pedidos" className="text-sm text-gray-500 hover:text-gray-900">
                                    Ver mais {pendingOrders.length - 3} pedidos
                                </Link>
                            </div>
                        )}
                        {pendingOrders.length === 0 && (
                            <p className="text-sm text-gray-500 text-center">Nenhum pedido pendente</p>
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
  
  // Dados filtrados para operação
  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const myTasks = tasks.filter(t => !t.completed); // Na prática filtraria por usuário/setor
  const today = new Date().toISOString().split('T')[0];
  const incomingDeliveries = purchaseOrders.filter(o => 
    o.status === 'pendente'
  ).sort((a, b) => new Date(a.expectedDelivery).getTime() - new Date(b.expectedDelivery).getTime());

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel Operacional</h1>
          <p className="text-gray-500 mt-1">Bem-vindo(a), {user?.name}. Aqui estão suas prioridades para hoje.</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-md border shadow-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Tarefas Pendentes</p>
                    <p className="text-3xl font-bold mt-1 text-blue-900">{myTasks.length}</p>
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
                    <p className="text-3xl font-bold mt-1 text-orange-900">{incomingDeliveries.length}</p>
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

          <Card className={`bg-gradient-to-br border ${unresolvedAlerts.length > 0 ? 'from-red-50 to-white border-red-100' : 'from-green-50 to-white border-green-100'}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-sm font-medium ${unresolvedAlerts.length > 0 ? 'text-red-700' : 'text-green-700'}`}>Alertas Críticos</p>
                    <p className={`text-3xl font-bold mt-1 ${unresolvedAlerts.length > 0 ? 'text-red-900' : 'text-green-900'}`}>{unresolvedAlerts.length}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${unresolvedAlerts.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
              </div>
              <div className="mt-4">
                 <Button variant="outline" size="sm" className={`w-full bg-white ${unresolvedAlerts.length > 0 ? 'hover:bg-red-50 text-red-700 border-red-200' : 'hover:bg-green-50 text-green-700 border-green-200'}`}>
                     Ver Detalhes
                 </Button>
              </div>
            </CardContent>
          </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         {/* Lista de Alertas */}
         <Card className="h-full">
             <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-red-500" />
                    Atenção Necessária
                 </CardTitle>
                 <CardDescription>Estoque baixo e itens próximos do vencimento</CardDescription>
             </CardHeader>
             <CardContent>
                 <div className="space-y-4">
                     {unresolvedAlerts.length === 0 ? (
                         <div className="text-center py-8 text-gray-500">
                             <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-2" />
                             <p>Tudo certo! Sem alertas no momento.</p>
                         </div>
                     ) : (
                         unresolvedAlerts.map(alert => (
                             <div key={alert.id} className="flex items-start gap-4 p-4 rounded-lg border bg-gray-50">
                                 <div className={`mt-1 p-1.5 rounded-full ${alert.severity === 'alta' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                     <AlertTriangle className="w-4 h-4" />
                                 </div>
                                 <div className="flex-1">
                                     <p className="font-semibold text-gray-900">{alert.type === 'estoque-minimo' ? 'Estoque Baixo' : 'Validade Próxima'}</p>
                                     <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                                 </div>
                                 <Button size="sm" variant="ghost">Resolver</Button>
                             </div>
                         ))
                     )}
                 </div>
             </CardContent>
         </Card>

         {/* Próximas Entregas */}
         <Card className="h-full">
             <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    Entregas Previstas
                 </CardTitle>
                 <CardDescription>Pedidos agendados para os próximos dias</CardDescription>
             </CardHeader>
             <CardContent>
                 <div className="space-y-4">
                    {incomingDeliveries.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">Nenhuma entrega prevista.</p>
                    ) : (
                        incomingDeliveries.map(order => {
                            const supplier = suppliers.find(s => s.id === order.supplierId);
                            const isToday = order.expectedDelivery === today;
                            
                            return (
                                <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {supplier?.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium">{supplier?.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>Pedido #{order.id}</span>
                                                <span>•</span>
                                                <Badge variant={isToday ? "default" : "secondary"} className="text-[10px] h-5">
                                                    {isToday ? 'Hoje' : new Date(order.expectedDelivery).toLocaleDateString('pt-BR')}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-sm">R$ {order.total.toFixed(2)}</p>
                                        <Link to={`/operacoes?tab=recebimentos&order=${order.id}`} className="text-xs text-blue-600 hover:underline">
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
