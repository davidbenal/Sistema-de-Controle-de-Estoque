import { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { DialogFooter } from '../ui/dialog';
import { Loader2, AlertCircle, Search, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useStorageCenters } from '../../hooks/useStorageCenters';

interface StartInventoryCountFormProps {
  ingredients: any[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface InventoryItem {
  ingredientId: string;
  ingredientName: string;
  category: string;
  systemQty: number;
  countedQty: number;
  unit: string;
  difference: number;
  notes?: string;
}

type DivergenceFilter = 'all' | 'falta' | 'sobra' | 'sem';
type SortOption = 'name-asc' | 'name-desc' | 'system-qty' | 'diff-desc' | 'diff-asc';

export function StartInventoryCountForm({
  ingredients,
  onSave,
  onCancel,
  isLoading = false,
}: StartInventoryCountFormProps) {
  const { centers: storageCentersList, getLabel: getStorageCenterLabel } = useStorageCenters();
  const [storageCenter, setStorageCenter] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);

  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [divergenceFilter, setDivergenceFilter] = useState<DivergenceFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');

  // Use all registered centers from Firestore (not derived from ingredient data)
  const availableStorageCenters = useMemo(() => {
    return storageCentersList.map(c => c.value);
  }, [storageCentersList]);

  useEffect(() => {
    if (storageCenter) {
      loadIngredientsForCenter();
    } else {
      setItems([]);
    }
  }, [storageCenter, ingredients]);

  const loadIngredientsForCenter = () => {
    const filtered = ingredients.filter(
      ing => (ing.storage_center || ing.storageCenter) === storageCenter
    );

    if (filtered.length === 0) {
      toast.info('Nenhum ingrediente encontrado neste centro de armazenamento');
      setItems([]);
      return;
    }

    const inventoryItems = filtered.map(ing => ({
      ingredientId: ing.id,
      ingredientName: ing.name,
      category: ing.category || '',
      systemQty: ing.currentStock || ing.current_stock || 0,
      countedQty: 0,
      unit: ing.unit,
      difference: 0,
      notes: '',
    }));

    setItems(inventoryItems);
  };

  const handleCountedQtyChange = (ingredientId: string, value: string) => {
    const newItems = [...items];
    const idx = newItems.findIndex(i => i.ingredientId === ingredientId);
    if (idx === -1) return;
    const counted = parseFloat(value) || 0;
    newItems[idx].countedQty = counted;
    newItems[idx].difference = counted - newItems[idx].systemQty;
    setItems(newItems);
  };

  const handleItemNotesChange = (ingredientId: string, value: string) => {
    const newItems = [...items];
    const idx = newItems.findIndex(i => i.ingredientId === ingredientId);
    if (idx === -1) return;
    newItems[idx].notes = value;
    setItems(newItems);
  };

  // Derive unique categories from loaded items
  const availableCategories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [items]);

  // Filtered + sorted view of items
  const displayItems = useMemo(() => {
    let result = items;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => item.ingredientName.toLowerCase().includes(q));
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter);
    }

    // Divergence filter
    if (divergenceFilter === 'falta') {
      result = result.filter(item => item.difference < 0);
    } else if (divergenceFilter === 'sobra') {
      result = result.filter(item => item.difference > 0);
    } else if (divergenceFilter === 'sem') {
      result = result.filter(item => item.difference === 0);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc': return a.ingredientName.localeCompare(b.ingredientName);
        case 'name-desc': return b.ingredientName.localeCompare(a.ingredientName);
        case 'system-qty': return b.systemQty - a.systemQty;
        case 'diff-desc': return Math.abs(b.difference) - Math.abs(a.difference);
        case 'diff-asc': return Math.abs(a.difference) - Math.abs(b.difference);
        default: return 0;
      }
    });

    return result;
  }, [items, searchQuery, categoryFilter, divergenceFilter, sortOption]);

  const getStats = () => {
    const totalItems = items.length;
    const counted = items.filter(item => item.countedQty > 0).length;
    const withNegativeDiff = items.filter(item => item.difference < 0).length;
    const withPositiveDiff = items.filter(item => item.difference > 0).length;
    const totalDifference = items.reduce((sum, item) => sum + Math.abs(item.difference), 0);

    return {
      totalItems,
      counted,
      withNegativeDiff,
      withPositiveDiff,
      totalDifference,
    };
  };

  const validateForm = () => {
    if (!storageCenter) {
      toast.error('Selecione um centro de armazenamento');
      return false;
    }

    const itemsCounted = items.filter(item => item.countedQty > 0);
    if (itemsCounted.length === 0) {
      toast.error('Preencha pelo menos uma contagem');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const data = {
      countType: 'full',
      storageCenter,
      notes: notes || undefined,
      items: items.map(item => ({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        systemQty: item.systemQty,
        countedQty: item.countedQty,
        unit: item.unit,
        notes: item.notes,
      })),
    };

    await onSave(data);
  };

  const stats = getStats();

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      'perecivel': 'Perecíveis',
      'nao-perecivel': 'Não Perecíveis',
      'bebida': 'Bebidas',
      'limpeza': 'Limpeza',
      'descartavel': 'Descartáveis',
    };
    return labels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Storage Center */}
      <div className="space-y-2">
        <Label htmlFor="storageCenter">Centro de Armazenamento *</Label>
        <Select value={storageCenter} onValueChange={setStorageCenter}>
          <SelectTrigger id="storageCenter" className="w-full md:w-[300px]">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {availableStorageCenters.map(center => (
              <SelectItem key={center} value={center}>
                {getStorageCenterLabel(center)}
              </SelectItem>
            ))}
            {availableStorageCenters.length === 0 && (
              <SelectItem value="_empty" disabled>Nenhum centro encontrado</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Ingredients Table */}
      {storageCenter && (
        <>
          {items.length === 0 ? (
            <div className="border rounded-lg p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">
                Nenhum ingrediente cadastrado neste centro de armazenamento
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Ingredientes ({items.length} itens)</Label>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar ingrediente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters + Sort toolbar */}
              <div className="flex flex-wrap gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {availableCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={divergenceFilter} onValueChange={(v: any) => setDivergenceFilter(v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Divergência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="falta">Com falta</SelectItem>
                    <SelectItem value="sobra">Com sobra</SelectItem>
                    <SelectItem value="sem">Sem divergência</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOption} onValueChange={(v: any) => setSortOption(v)}>
                  <SelectTrigger className="w-[170px]">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Nome A-Z</SelectItem>
                    <SelectItem value="name-desc">Nome Z-A</SelectItem>
                    <SelectItem value="system-qty">Qtd. sistema</SelectItem>
                    <SelectItem value="diff-desc">Maior diferença</SelectItem>
                    <SelectItem value="diff-asc">Menor diferença</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Ingrediente</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Estoque Sistema</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-700">Unidade</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Contagem Manual</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((item) => (
                      <tr key={item.ingredientId} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{item.ingredientName}</td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {item.systemQty.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">
                          {item.unit}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.countedQty || ''}
                            onChange={(e) => handleCountedQtyChange(item.ingredientId, e.target.value)}
                            className="text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${
                          item.difference < 0 ? 'text-red-600' :
                          item.difference > 0 ? 'text-green-600' :
                          'text-gray-600'
                        }`}>
                          {item.difference > 0 ? '+' : ''}{item.difference.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {displayItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                          Nenhum item encontrado com os filtros atuais
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-lg border">
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Total de Itens</p>
                  <p className="text-xl font-bold text-gray-900">{stats.totalItems}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Contados</p>
                  <p className="text-xl font-bold text-blue-600">{stats.counted}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Com Falta</p>
                  <p className="text-xl font-bold text-red-600">{stats.withNegativeDiff}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Com Sobra</p>
                  <p className="text-xl font-bold text-green-600">{stats.withPositiveDiff}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Total Diferenças</p>
                  <p className="text-xl font-bold text-orange-600">{stats.totalDifference.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações Gerais</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações sobre a contagem de inventário..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || items.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Iniciar Contagem'
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
