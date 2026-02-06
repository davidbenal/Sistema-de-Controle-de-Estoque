import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  Download,
  Calendar,
} from 'lucide-react';
import {
  ingredients,
  recipes,
  salesData,
  wasteData,
  inventoryCounts,
} from '../data/mockData';
import { toast } from 'sonner';

export function Relatorios() {
  const [period, setPeriod] = useState('7days');

  // Preparar dados para gráficos
  const salesByRecipe = salesData.reduce((acc, sale) => {
    const recipe = recipes.find((r) => r.id === sale.recipeId);
    if (recipe) {
      acc[recipe.name] = (acc[recipe.name] || 0) + sale.quantity;
    }
    return acc;
  }, {} as Record<string, number>);

  const topRecipes = Object.entries(salesByRecipe)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, quantity]) => ({ name, vendas: quantity }));

  // CMV por dia
  const cmvByDate = salesData.reduce((acc, sale) => {
    const recipe = recipes.find((r) => r.id === sale.recipeId);
    if (recipe) {
      const date = new Date(sale.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      if (!acc[date]) {
        acc[date] = { date, cmv: 0, receita: 0 };
      }
      acc[date].cmv += recipe.totalCost * sale.quantity;
      acc[date].receita += recipe.suggestedPrice * sale.quantity;
    }
    return acc;
  }, {} as Record<string, { date: string; cmv: number; receita: number }>);

  const cmvData = Object.values(cmvByDate).slice(-7);

  // Desperdício por ingrediente
  const wasteByIngredient = wasteData.reduce((acc, waste) => {
    const ingredient = ingredients.find((i) => i.id === waste.ingredientId);
    if (ingredient) {
      const unitPrice = ingredient.price / ingredient.grossQuantity;
      const wasteValue = unitPrice * waste.quantity;
      acc[ingredient.name] = (acc[ingredient.name] || 0) + wasteValue;
    }
    return acc;
  }, {} as Record<string, number>);

  const wasteChartData = Object.entries(wasteByIngredient)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ name, valor: value }));

  // Divergências de inventário
  const varianceData = inventoryCounts.flatMap((inv) =>
    inv.items.map((item) => {
      const ingredient = ingredients.find((i) => i.id === item.ingredientId);
      return {
        name: ingredient?.name || 'Desconhecido',
        divergencia: Math.abs(item.variancePercentage),
        tipo: item.variance < 0 ? 'Falta' : 'Sobra',
      };
    })
  );

  const topVariances = varianceData
    .sort((a, b) => b.divergencia - a.divergencia)
    .slice(0, 5);

  // Distribuição de estoque por categoria
  const stockByCategory = ingredients.reduce((acc, ing) => {
    const value = ing.currentStock * (ing.price / ing.grossQuantity);
    acc[ing.category] = (acc[ing.category] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(stockByCategory).map(([category, value]) => {
    let label = '';
    switch (category) {
      case 'perecivel':
        label = 'Perecível';
        break;
      case 'nao-perecivel':
        label = 'Não Perecível';
        break;
      case 'bebida':
        label = 'Bebida';
        break;
      case 'limpeza':
        label = 'Limpeza';
        break;
      default:
        label = category;
    }
    return { name: label, value };
  });

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  // Métricas calculadas
  const totalCMV = cmvData.reduce((sum, d) => sum + d.cmv, 0);
  const totalRevenue = cmvData.reduce((sum, d) => sum + d.receita, 0);
  const profitMargin = ((totalRevenue - totalCMV) / totalRevenue) * 100;
  const totalWaste = wasteChartData.reduce((sum, d) => sum + d.valor, 0);
  const wastePercentage = (totalWaste / totalCMV) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-gray-500 mt-1">Análises e insights sobre as operações</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => toast.success('Relatório exportado!')}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CMV Total</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalCMV.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Últimos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitMargin.toFixed(1)}%</div>
            <p className="text-xs text-gray-500 mt-1">Sobre receita total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desperdício</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalWaste.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {wastePercentage.toFixed(1)}% do CMV
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R${' '}
              {Object.values(stockByCategory)
                .reduce((sum, v) => sum + v, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Estoque atual</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cmv" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cmv">CMV</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="desperdicio">Desperdício</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
        </TabsList>

        {/* CMV */}
        <TabsContent value="cmv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução do CMV e Receita</CardTitle>
              <CardDescription>
                Custo de Mercadoria Vendida vs. Receita nos últimos 7 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cmvData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) =>
                      `R$ ${value.toFixed(2)}`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="#10b981"
                    name="Receita"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="cmv"
                    stroke="#f97316"
                    name="CMV"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Margem</CardTitle>
                <CardDescription>Detalhamento por período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cmvData.slice(-3).map((data, idx) => {
                    const margin = ((data.receita - data.cmv) / data.receita) * 100;
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{data.date}</span>
                          <Badge
                            variant={margin > 60 ? 'default' : 'secondary'}
                            className={
                              margin > 60 ? 'bg-green-100 text-green-700' : ''
                            }
                          >
                            {margin.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>Receita: R$ {data.receita.toFixed(2)}</span>
                          <span>CMV: R$ {data.cmv.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insights da IA</CardTitle>
                <CardDescription>Sugestões baseadas em dados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Margem estável</p>
                      <p className="text-blue-700">
                        Sua margem média de {profitMargin.toFixed(1)}% está dentro do
                        recomendado para restaurantes (60-70%)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-900">
                        Oportunidade de redução
                      </p>
                      <p className="text-orange-700">
                        O desperdício de {wastePercentage.toFixed(1)}% pode ser reduzido
                        com melhor gestão de perecíveis
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vendas */}
        <TabsContent value="vendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pratos Mais Vendidos</CardTitle>
              <CardDescription>Top 5 receitas por volume de vendas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topRecipes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="vendas" fill="#f97316" name="Vendas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Análise por Receita</CardTitle>
              <CardDescription>Desempenho detalhado de cada prato</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recipes.map((recipe) => {
                  const sales = salesData
                    .filter((s) => s.recipeId === recipe.id)
                    .reduce((sum, s) => sum + s.quantity, 0);
                  const revenue = sales * recipe.suggestedPrice;
                  const cost = sales * recipe.totalCost;
                  const profit = revenue - cost;
                  const margin = (profit / revenue) * 100;

                  return (
                    <div
                      key={recipe.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{recipe.name}</h4>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                          <span>{sales} vendas</span>
                          <span>Receita: R$ {revenue.toFixed(2)}</span>
                          <span>Custo: R$ {cost.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={margin > 60 ? 'default' : 'secondary'}
                          className={margin > 60 ? 'bg-green-100 text-green-700' : ''}
                        >
                          {margin.toFixed(1)}%
                        </Badge>
                        <p className="text-xs text-gray-600 mt-1">
                          R$ {profit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Desperdício */}
        <TabsContent value="desperdicio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desperdício por Ingrediente</CardTitle>
              <CardDescription>
                Top 5 insumos com maior valor desperdiçado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={wasteChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) =>
                      `R$ ${value.toFixed(2)}`
                    }
                  />
                  <Bar dataKey="valor" fill="#f97316" name="Valor Desperdiçado" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Desperdício</CardTitle>
              <CardDescription>Registros recentes de perda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wasteData.map((waste, idx) => {
                  const ingredient = ingredients.find((i) => i.id === waste.ingredientId);
                  const unitPrice = ingredient
                    ? ingredient.price / ingredient.grossQuantity
                    : 0;
                  const wasteValue = unitPrice * waste.quantity;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{ingredient?.name}</h4>
                        <p className="text-sm text-gray-600">{waste.reason}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(waste.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">
                          R$ {wasteValue.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {waste.quantity} {ingredient?.unit}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estoque */}
        <TabsContent value="estoque" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
                <CardDescription>Valor em estoque por tipo de insumo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: R$ ${entry.value.toFixed(0)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) =>
                        `R$ ${value.toFixed(2)}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Divergências de Inventário</CardTitle>
                <CardDescription>Maiores diferenças entre teórico e real</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topVariances}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="divergencia" fill="#f97316" name="Divergência %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Análise de Divergências</CardTitle>
              <CardDescription>
                Comparação entre estoque teórico e real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topVariances.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.tipo}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={item.divergencia > 10 ? 'destructive' : 'secondary'}
                      >
                        {item.divergencia.toFixed(1)}%
                      </Badge>
                      {item.divergencia > 10 && (
                        <p className="text-xs text-red-600 mt-1">
                          <TrendingDown className="w-3 h-3 inline mr-1" />
                          Acima do aceitável
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
