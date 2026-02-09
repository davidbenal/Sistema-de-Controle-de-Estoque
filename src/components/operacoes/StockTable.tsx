import { useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useStorageCenters } from '../../hooks/useStorageCenters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  MoreVertical,
  ShoppingCart,
  History,
  Edit,
  Package,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '../ui/utils';

interface IngredientWithStockInfo {
  id: string;
  name: string;
  category: string;
  storage_center: string;
  storageCenter?: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  supplier_id: string;
  supplier_name: string;
  last_order_date?: string;
  recommended_reorder_date?: string;
  stock_status: 'ok' | 'low' | 'critical' | 'excess';
}

interface StockTableProps {
  ingredients: IngredientWithStockInfo[];
  isLoading: boolean;
  onAddToOrder?: (ingredient: IngredientWithStockInfo) => void;
  onViewHistory?: (ingredientId: string) => void;
  onAdjustStock?: (ingredient: IngredientWithStockInfo) => void;
  onViewDetails?: (ingredient: IngredientWithStockInfo) => void;
}

export function StockTable({
  ingredients,
  isLoading,
  onAddToOrder,
  onViewHistory,
  onAdjustStock,
  onViewDetails,
}: StockTableProps) {
  const { centers: allCenters, getLabel: getCenterLabel } = useStorageCenters();

  // Agrupar por storage center, incluindo TODOS os centros cadastrados
  const groupedByCenter = useMemo(() => {
    // Inicializar com todos os centros cadastrados (mesmo sem ingredientes)
    const groups: Record<string, IngredientWithStockInfo[]> = {};
    allCenters.forEach(c => {
      groups[c.value] = [];
    });

    ingredients.forEach(ing => {
      const center = ing.storage_center || ing.storageCenter || 'sem-centro';
      if (!groups[center]) {
        groups[center] = [];
      }
      groups[center].push(ing);
    });

    return groups;
  }, [ingredients, allCenters]);

  // Estatísticas por centro
  const getStatsForCenter = (items: IngredientWithStockInfo[]) => {
    return {
      total: items.length,
      ok: items.filter(i => i.stock_status === 'ok').length,
      low: items.filter(i => i.stock_status === 'low').length,
      critical: items.filter(i => i.stock_status === 'critical').length,
      excess: items.filter(i => i.stock_status === 'excess').length,
    };
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ok: 'bg-green-100 text-green-700 border-green-300',
      low: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      critical: 'bg-red-100 text-red-700 border-red-300',
      excess: 'bg-blue-100 text-blue-700 border-blue-300',
    };

    const labels = {
      ok: 'OK',
      low: 'Baixo',
      critical: 'Crítico',
      excess: 'Excesso',
    };

    return (
      <Badge variant="outline" className={cn('border', styles[status as keyof typeof styles])}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'proteina': 'bg-red-100 text-red-700',
      'vegetal': 'bg-green-100 text-green-700',
      'graos': 'bg-yellow-100 text-yellow-700',
      'laticinios': 'bg-blue-100 text-blue-700',
      'bebidas': 'bg-purple-100 text-purple-700',
      'temperos': 'bg-orange-100 text-orange-700',
    };

    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const getDaysUntilReorder = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const reorderDate = new Date(dateString);
      const today = new Date();
      const diffTime = reorderDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const renderReorderDate = (dateString?: string) => {
    const days = getDaysUntilReorder(dateString);
    if (days === null) return <span className="text-gray-400">-</span>;

    if (days < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="font-semibold">Atrasado {Math.abs(days)}d</span>
        </div>
      );
    } else if (days === 0) {
      return (
        <div className="flex items-center gap-1 text-orange-600">
          <AlertCircle className="h-4 w-4" />
          <span className="font-semibold">Hoje</span>
        </div>
      );
    } else if (days <= 7) {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <TrendingDown className="h-4 w-4" />
          <span>Em {days}d</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-gray-600">
          <TrendingUp className="h-4 w-4" />
          <span>Em {days}d</span>
        </div>
      );
    }
  };

  const renderIngredientRow = (ingredient: IngredientWithStockInfo) => (
    <tr key={ingredient.id} className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-2 sm:px-3 py-3">
        <div className="font-medium text-gray-900">{ingredient.name}</div>
        <div className="text-xs text-gray-500 md:hidden mt-0.5">
          {ingredient.unit} · {ingredient.supplier_name || 'Sem fornecedor'}
        </div>
      </td>
      <td className="hidden lg:table-cell px-3 py-3">
        <Badge className={getCategoryColor(ingredient.category)}>{ingredient.category}</Badge>
      </td>
      <td className="px-2 sm:px-3 py-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <span
            className={cn(
              'font-semibold text-sm',
              ingredient.stock_status === 'ok' && 'text-green-600',
              ingredient.stock_status === 'low' && 'text-yellow-600',
              ingredient.stock_status === 'critical' && 'text-red-600',
              ingredient.stock_status === 'excess' && 'text-blue-600'
            )}
          >
            {(ingredient.current_stock || 0).toFixed(2)}
          </span>
          {getStatusBadge(ingredient.stock_status)}
        </div>
      </td>
      <td className="hidden md:table-cell px-3 py-3 text-gray-600">{ingredient.unit || '-'}</td>
      <td className="hidden lg:table-cell px-3 py-3 text-gray-600">{ingredient.supplier_name || '-'}</td>
      <td className="hidden xl:table-cell px-3 py-3 text-gray-600">{(ingredient.min_stock || 0).toFixed(2)}</td>
      <td className="hidden xl:table-cell px-3 py-3 text-gray-600">{formatDate(ingredient.last_order_date)}</td>
      <td className="hidden lg:table-cell px-3 py-3">{renderReorderDate(ingredient.recommended_reorder_date)}</td>
      <td className="px-1 sm:px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onAddToOrder && (
              <DropdownMenuItem onClick={() => onAddToOrder(ingredient)}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Adicionar a Pedido
              </DropdownMenuItem>
            )}
            {onViewHistory && (
              <DropdownMenuItem onClick={() => onViewHistory(ingredient.id)}>
                <History className="h-4 w-4 mr-2" />
                Ver Histórico
              </DropdownMenuItem>
            )}
            {onAdjustStock && (
              <DropdownMenuItem onClick={() => onAdjustStock(ingredient)}>
                <Edit className="h-4 w-4 mr-2" />
                Ajustar Estoque
              </DropdownMenuItem>
            )}
            {onViewDetails && (
              <DropdownMenuItem onClick={() => onViewDetails(ingredient)}>
                <Package className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );

  const renderCenterTable = (items: IngredientWithStockInfo[]) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum ingrediente cadastrado neste centro</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-2 sm:px-3 py-3 text-left font-medium text-gray-700">Ingrediente</th>
              <th className="hidden lg:table-cell px-3 py-3 text-left font-medium text-gray-700">Categoria</th>
              <th className="px-2 sm:px-3 py-3 text-left font-medium text-gray-700">Estoque</th>
              <th className="hidden md:table-cell px-3 py-3 text-left font-medium text-gray-700">Unidade</th>
              <th className="hidden lg:table-cell px-3 py-3 text-left font-medium text-gray-700">Fornecedor</th>
              <th className="hidden xl:table-cell px-3 py-3 text-left font-medium text-gray-700">Mínimo</th>
              <th className="hidden xl:table-cell px-3 py-3 text-left font-medium text-gray-700">Últ. Pedido</th>
              <th className="hidden lg:table-cell px-3 py-3 text-left font-medium text-gray-700">Próx. Pedido</th>
              <th className="px-1 sm:px-3 py-3 text-center font-medium text-gray-700 w-10 sm:w-12">Ações</th>
            </tr>
          </thead>
          <tbody>{items.map(renderIngredientRow)}</tbody>
        </table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="text-gray-500 mt-4">Carregando estoque...</p>
      </div>
    );
  }

  if (ingredients.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">Nenhum ingrediente cadastrado</p>
        <p className="text-sm mt-2">Cadastre ingredientes na aba Cadastros para começar</p>
      </div>
    );
  }

  const centers = Object.keys(groupedByCenter);
  const defaultCenter = centers.find(c => groupedByCenter[c].length > 0) || centers[0];

  return (
    <div className="space-y-4">
      <Tabs defaultValue={defaultCenter} className="w-full">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full h-auto flex-wrap md:flex-nowrap gap-1 p-1">
            {centers.map(center => {
              const stats = getStatsForCenter(groupedByCenter[center]);

              return (
                <TabsTrigger key={center} value={center} className="relative whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5">
                  {center === 'sem-centro' ? 'Sem Centro' : getCenterLabel(center)}
                  <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                    {stats.total}
                  </Badge>
                  {stats.critical > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {centers.map(center => {
          const items = groupedByCenter[center];
          const stats = getStatsForCenter(items);

          return (
            <TabsContent key={center} value={center} className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-5 gap-1 sm:gap-3 bg-gray-50 p-2 sm:p-4 rounded-lg border">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Total</p>
                  <p className="text-base sm:text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">OK</p>
                  <p className="text-base sm:text-xl font-bold text-green-600">{stats.ok}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Baixo</p>
                  <p className="text-base sm:text-xl font-bold text-yellow-600">{stats.low}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Crítico</p>
                  <p className="text-base sm:text-xl font-bold text-red-600">{stats.critical}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Excesso</p>
                  <p className="text-base sm:text-xl font-bold text-blue-600">{stats.excess}</p>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                {renderCenterTable(items)}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
