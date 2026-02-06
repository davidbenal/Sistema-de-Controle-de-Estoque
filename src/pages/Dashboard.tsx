import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Alert as AlertComponent, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { config } from '../config';
import { toast } from 'sonner';

interface DashboardResumo {
  ingredientes: {
    total: number;
    abaixoMinimo: number;
    percentualAbaixoMinimo: number;
  };
  alertas: {
    total: number;
    criticos: number;
  };
  vendas: {
    ultimos7Dias: number;
    ultimoUpload: {
      filename: string;
      uploadedAt: any;
      salesCreated: number;
    } | null;
  };
  mapeamentos: {
    total: number;
    mapeados: number;
    percentual: number;
  };
  statusSistema: {
    operacional: boolean;
    ultimaSincronizacao: any;
  };
}

interface Alert {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
  title: string;
  message: string;
  ingredientName?: string;
  currentStock?: number;
  minStock?: number;
}

interface Ingrediente {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
}

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [resumo, setResumo] = useState<DashboardResumo | null>(null);
  const [alertas, setAlertas] = useState<Alert[]>([]);
  const [ingredientesAbaixoMinimo, setIngredientesAbaixoMinimo] = useState<Ingrediente[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Carregar dados em paralelo
      const [resumoRes, alertasRes, ingredientesRes] = await Promise.all([
        fetch(config.endpoints.dashboard.resumo),
        fetch(config.endpoints.alertas.list + '?status=pending'),
        fetch(config.endpoints.dashboard.ingredientesAbaixoMinimo),
      ]);

      const [resumoData, alertasData, ingredientesData] = await Promise.all([
        resumoRes.json(),
        alertasRes.json(),
        ingredientesRes.json(),
      ]);

      if (resumoData.success) {
        setResumo(resumoData.resumo);
      }

      if (alertasData.success) {
        setAlertas(alertasData.alertas || []);
      }

      if (ingredientesData.success) {
        setIngredientesAbaixoMinimo(ingredientesData.ingredientes || []);
      }
    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'stock_low':
      case 'stock_critical':
        return Package;
      case 'product_unmapped':
        return AlertCircle;
      default:
        return AlertTriangle;
    }
  };

  const getSeverityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const criticalAlerts = alertas.filter(a => a.priority === 'high');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 mt-1">Carregando dados...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 mt-1">Visão geral das operações do restaurante</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDashboardData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Status do Sistema */}
      {resumo?.statusSistema.operacional && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900">Sistema Operacional</h4>
                <p className="text-sm text-green-700 mt-1">
                  Última sincronização: {resumo.vendas.ultimoUpload?.filename || 'Nenhuma sincronização ainda'}
                </p>
                <p className="text-sm text-green-700">
                  Produtos mapeados: {resumo.mapeamentos.percentual}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalAlerts.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {resumo?.alertas.total || 0} alertas no total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas (7 dias)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.vendas.ultimos7Dias || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {resumo?.vendas.ultimoUpload ? `Último upload: ${resumo.vendas.ultimoUpload.salesCreated} vendas` : 'Nenhum upload ainda'}
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CMV Semanal</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-gray-500 mt-1">
              Em breve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Abaixo do Mínimo</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.ingredientes.abaixoMinimo || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              de {resumo?.ingredientes.total || 0} insumos ({resumo?.ingredientes.percentualAbaixoMinimo || 0}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas e Notificações</CardTitle>
          <CardDescription>Itens que requerem atenção imediata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertas.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span>Nenhum alerta pendente</span>
            </div>
          ) : (
            alertas.slice(0, 5).map((alert) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <AlertComponent key={alert.id} variant={alert.priority === 'high' ? 'destructive' : 'default'}>
                  <Icon className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{alert.message}</span>
                    <Badge variant={getSeverityColor(alert.priority) as any}>
                      {getSeverityLabel(alert.priority)}
                    </Badge>
                  </AlertDescription>
                </AlertComponent>
              );
            })
          )}
          {alertas.length > 5 && (
            <Button variant="outline" className="w-full">
              Ver todos os alertas ({alertas.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Estoque em baixa */}
      <Card>
        <CardHeader>
          <CardTitle>Insumos com Estoque Crítico</CardTitle>
          <CardDescription>Itens que precisam ser repostos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ingredientesAbaixoMinimo.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <span>Todos os estoques estão adequados</span>
              </div>
            ) : (
              ingredientesAbaixoMinimo.slice(0, 10).map((item) => {
                const percentage = item.maxStock > 0
                  ? (item.currentStock / item.maxStock) * 100
                  : 0;
                const isZero = item.currentStock === 0;
                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <span className="font-medium">{item.name}</span>
                        <p className="text-xs text-gray-500">
                          Atual: {item.currentStock} {item.unit} | Mínimo: {item.minStock} {item.unit}
                        </p>
                      </div>
                      <Badge variant={isZero ? 'destructive' : 'default'} className="ml-2">
                        {isZero ? 'Esgotado' : 'Baixo'}
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo de operações recentes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle>Pratos Mais Vendidos (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Clock className="w-5 h-5 mr-2" />
              <span>Análise em desenvolvimento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-60">
          <CardHeader>
            <CardTitle>Desperdício Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Clock className="w-5 h-5 mr-2" />
              <span>Análise em desenvolvimento</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
