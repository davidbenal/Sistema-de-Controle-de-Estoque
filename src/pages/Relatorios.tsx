import { useState, useEffect } from 'react';
import { config } from '../config';
import { apiFetch } from '../lib/api';
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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  Loader2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface SalesProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface StockCategory {
  name: string;
  value: number;
}

interface InventoryVariance {
  name: string;
  divergencia: number;
  tipo: string;
}

export function Relatorios() {
  const [period, setPeriod] = useState('7days');
  const [loading, setLoading] = useState(true);

  // Data states
  const [salesProducts, setSalesProducts] = useState<SalesProduct[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [stockCategories, setStockCategories] = useState<StockCategory[]>([]);
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [totalIngredients, setTotalIngredients] = useState(0);
  const [inventoryVariances, setInventoryVariances] = useState<InventoryVariance[]>([]);

  const periodDays = period === '7days' ? 7 : period === '30days' ? 30 : period === '90days' ? 90 : 7;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [salesRes, stockRes, invRes] = await Promise.all([
          apiFetch(`${config.endpoints.relatorios.vendasPorProduto}?days=${periodDays}`).then(r => r.json()).catch(() => null),
          apiFetch(config.endpoints.relatorios.estoqueValor).then(r => r.json()).catch(() => null),
          apiFetch(config.endpoints.operacoes.inventoryCounts).then(r => r.json()).catch(() => null),
        ]);

        if (salesRes?.success) {
          setSalesProducts(salesRes.products || []);
          setTotalRevenue(salesRes.totalRevenue || 0);
          setTotalQuantity(salesRes.totalQuantity || 0);
        }

        if (stockRes?.success) {
          setStockCategories(stockRes.categories || []);
          setTotalStockValue(stockRes.totalValue || 0);
          setTotalIngredients(stockRes.totalIngredients || 0);
        }

        if (invRes?.success) {
          const counts = invRes.inventoryCounts || invRes.counts || [];
          const variances: InventoryVariance[] = [];
          for (const count of counts) {
            const items = count.items || [];
            for (const item of items) {
              const name = item.ingredient_name || item.ingredientName || 'Desconhecido';
              const variance = item.variance || 0;
              const variancePct = item.variance_percentage || item.variancePercentage || 0;
              variances.push({
                name,
                divergencia: Math.abs(variancePct),
                tipo: variance < 0 ? 'Falta' : 'Sobra',
              });
            }
          }
          setInventoryVariances(
            variances.sort((a, b) => b.divergencia - a.divergencia).slice(0, 10)
          );
        }
      } catch (err) {
        console.error('Erro ao carregar relatorios:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [periodDays]);

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  const topProducts = salesProducts.slice(0, 5).map(p => ({
    name: p.name,
    vendas: p.quantity,
    receita: p.revenue,
  }));

  const topVariances = inventoryVariances.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatorios</h1>
        <p className="text-gray-500 mt-1">Analises e insights sobre as operacoes</p>
      </div>

      {/* Filters */}
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
                  <SelectItem value="7days">Ultimos 7 dias</SelectItem>
                  <SelectItem value="30days">Ultimos 30 dias</SelectItem>
                  <SelectItem value="90days">Ultimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => toast.info('Exportacao em desenvolvimento')}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Relatorio
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CMV Total</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">--</div>
            <p className="text-xs text-gray-400 mt-1">Requer fichas tecnicas vinculadas</p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">--</div>
            <p className="text-xs text-gray-400 mt-1">Requer fichas tecnicas vinculadas</p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desperdicio</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">--</div>
            <p className="text-xs text-gray-400 mt-1">Modulo em implementacao</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">{totalIngredients} ingredientes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="cmv" disabled className="opacity-50">CMV</TabsTrigger>
          <TabsTrigger value="desperdicio" disabled className="opacity-50">Desperdicio</TabsTrigger>
        </TabsList>

        {/* Vendas */}
        <TabsContent value="vendas" className="space-y-4">
          {salesProducts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-600">Sem dados de vendas</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Importe vendas em Vendas &gt; Upload para ver este relatorio.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Produtos Mais Vendidos</CardTitle>
                  <CardDescription>Top 5 por volume de vendas ({periodDays} dias)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProducts}>
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
                  <CardTitle>Detalhamento por Produto</CardTitle>
                  <CardDescription>Receita e quantidade vendida</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {salesProducts.map((product, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {product.quantity} unidades vendidas
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Analise Automatica */}
              <Card>
                <CardHeader>
                  <CardTitle>Analise Automatica</CardTitle>
                  <CardDescription>Insights baseados em dados reais</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">Receita do periodo</p>
                        <p className="text-blue-700">
                          Receita total de R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com {totalQuantity} unidades vendidas nos ultimos {periodDays} dias.
                        </p>
                      </div>
                    </div>
                    {salesProducts.length > 0 && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-green-900">Produto destaque</p>
                          <p className="text-green-700">
                            "{salesProducts[0].name}" lidera com {salesProducts[0].quantity} vendas e R$ {salesProducts[0].revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de receita.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Estoque */}
        <TabsContent value="estoque" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuicao por Categoria</CardTitle>
                <CardDescription>Valor em estoque por tipo de insumo</CardDescription>
              </CardHeader>
              <CardContent>
                {stockCategories.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Sem dados de estoque</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stockCategories}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={entry => `${entry.name}: R$ ${entry.value.toFixed(0)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stockCategories.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Divergencias de Inventario</CardTitle>
                <CardDescription>Maiores diferencas entre teorico e real</CardDescription>
              </CardHeader>
              <CardContent>
                {topVariances.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhuma contagem de inventario realizada</p>
                    <p className="text-xs mt-1">Inicie uma contagem em Operacoes</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topVariances}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Bar dataKey="divergencia" fill="#f97316" name="Divergencia %" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {topVariances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Analise de Divergencias</CardTitle>
                <CardDescription>Comparacao entre estoque teorico e real</CardDescription>
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
                        <Badge variant={item.divergencia > 10 ? 'destructive' : 'secondary'}>
                          {item.divergencia.toFixed(1)}%
                        </Badge>
                        {item.divergencia > 10 && (
                          <p className="text-xs text-red-600 mt-1">
                            <TrendingDown className="w-3 h-3 inline mr-1" />
                            Acima do aceitavel
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CMV - Disabled */}
        <TabsContent value="cmv">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-600">CMV em desenvolvimento</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Este relatorio requer fichas tecnicas vinculadas as vendas para calcular o custo real.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Desperdicio - Disabled */}
        <TabsContent value="desperdicio">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-600">Modulo de Desperdicio</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Em implementacao. Registros de desperdicio serao adicionados em uma proxima versao.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
