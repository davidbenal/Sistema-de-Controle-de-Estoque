import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { config } from '../config';
import { toast } from 'sonner';
import { EditMappingDialog } from '../components/EditMappingDialog';

interface Mapeamento {
  id: string;
  sku: string;
  productNameZig: string;
  recipeId?: string;
  recipeName?: string;
  recipeCategory?: string;
  confidence: string;
  needsReview: boolean;
  lastUpdated: any;
}

interface Stats {
  total: number;
  needsReview: number;
  highConfidence: number;
  percentComplete: number;
}

type FilterType = 'all' | 'needs_review' | 'high_confidence';

export function Mapeamentos() {
  const [mappings, setMappings] = useState<Mapeamento[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [editingMapping, setEditingMapping] = useState<Mapeamento | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      setIsLoading(true);
      const [mappingsRes, statsRes] = await Promise.all([
        fetch(config.endpoints.mapeamentos.list),
        fetch(config.endpoints.mapeamentos.stats),
      ]);

      const [mappingsData, statsData] = await Promise.all([
        mappingsRes.json(),
        statsRes.json(),
      ]);

      if (mappingsData.success) {
        // Mapear snake_case para camelCase
        const mappedData = (mappingsData.mapeamentos || []).map((m: any) => ({
          id: m.id,
          sku: m.sku,
          productNameZig: m.product_name_zig,
          recipeId: m.recipe_id,
          recipeName: m.recipe_name,
          recipeCategory: m.recipeCategory,
          confidence: m.confidence,
          needsReview: m.needs_review,
          lastUpdated: m.last_updated,
        }));
        setMappings(mappedData);
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar mapeamentos:', error);
      toast.error('Erro ao carregar mapeamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (mapping: Mapeamento) => {
    setEditingMapping(mapping);
    setIsDialogOpen(true);
  };

  const handleSaveMapping = async () => {
    await loadMappings(); // Recarrega lista + stats
  };

  const filteredMappings = mappings.filter((m) => {
    if (filter === 'needs_review') return m.needsReview;
    if (filter === 'high_confidence') return !m.needsReview;
    return true;
  });

  const getConfidenceBadge = (confidence: string, needsReview: boolean) => {
    if (needsReview) {
      return <Badge variant="destructive">Precisa Revisão</Badge>;
    }
    if (confidence === 'auto-high' || confidence === 'manual-confirmed') {
      return <Badge variant="default" className="bg-green-600">Alta Confiança</Badge>;
    }
    return <Badge variant="secondary">Baixa Confiança</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mapeamentos de Produtos</h1>
          <p className="text-gray-500 mt-1">Carregando...</p>
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
          <h1 className="text-3xl font-bold">Mapeamentos de Produtos</h1>
          <p className="text-gray-500 mt-1">Conexão entre SKUs do Zig e Fichas Técnicas</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadMappings}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Cobertura de Mapeamentos</CardTitle>
            <CardDescription>
              Status da conexão entre produtos vendidos e fichas técnicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progresso Total</span>
                <span className="text-gray-500">
                  {stats.highConfidence} de {stats.total} confirmados ({stats.percentComplete.toFixed(0)}%)
                </span>
              </div>
              <Progress value={stats.percentComplete} className="h-3" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Alta Confiança</p>
                  <p className="text-2xl font-bold">{stats.highConfidence}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">Precisa Revisão</p>
                  <p className="text-2xl font-bold">{stats.needsReview}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total de SKUs</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </div>

            {stats.needsReview > 0 && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">
                    {stats.needsReview} {stats.needsReview === 1 ? 'produto precisa' : 'produtos precisam'} de revisão
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Produtos sem mapeamento ou com baixa confiança não terão estoque decrementado automaticamente.
                    Complete os mapeamentos para controle preciso de estoque.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Todos ({mappings.length})
        </Button>
        <Button
          variant={filter === 'needs_review' ? 'default' : 'outline'}
          onClick={() => setFilter('needs_review')}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Precisa Revisão ({stats?.needsReview || 0})
        </Button>
        <Button
          variant={filter === 'high_confidence' ? 'default' : 'outline'}
          onClick={() => setFilter('high_confidence')}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Alta Confiança ({stats?.highConfidence || 0})
        </Button>
      </div>

      {/* Tabela de Mapeamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Mapeamentos</CardTitle>
          <CardDescription>
            {filteredMappings.length} {filteredMappings.length === 1 ? 'mapeamento' : 'mapeamentos'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">SKU</th>
                  <th className="text-left p-3 font-medium">Nome no Zig</th>
                  <th className="text-left p-3 font-medium">Ficha Técnica</th>
                  <th className="text-left p-3 font-medium">Categoria</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhum mapeamento encontrado
                    </td>
                  </tr>
                ) : (
                  filteredMappings.map((mapping) => (
                    <tr key={mapping.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {mapping.sku}
                        </code>
                      </td>
                      <td className="p-3 font-medium">{mapping.productNameZig}</td>
                      <td className="p-3">
                        {mapping.recipeName ? (
                          <span className="text-gray-900">{mapping.recipeName}</span>
                        ) : (
                          <span className="text-gray-400 italic">Não mapeado</span>
                        )}
                      </td>
                      <td className="p-3">
                        {mapping.recipeCategory ? (
                          <Badge variant="outline">{mapping.recipeCategory}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {getConfidenceBadge(mapping.confidence, mapping.needsReview)}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(mapping)}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Próximos Passos */}
      {stats && stats.needsReview > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Próximos Passos</h4>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Criar fichas técnicas para produtos não mapeados no menu Cadastros → Fichas</li>
                  <li>Revisar e ajustar mapeamentos com baixa confiança (funcionalidade em breve)</li>
                  <li>Marcar bebidas industriais como "não controlado" (funcionalidade em breve)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Edição */}
      {editingMapping && (
        <EditMappingDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          mapping={editingMapping}
          onSave={handleSaveMapping}
        />
      )}
    </div>
  );
}
