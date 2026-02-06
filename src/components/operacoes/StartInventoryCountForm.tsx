import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { DialogFooter } from '../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StartInventoryCountFormProps {
  ingredients: any[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface InventoryItem {
  ingredientId: string;
  ingredientName: string;
  systemQty: number;
  countedQty: number;
  unit: string;
  difference: number;
  notes?: string;
}

export function StartInventoryCountForm({
  ingredients,
  onSave,
  onCancel,
  isLoading = false,
}: StartInventoryCountFormProps) {
  const { user } = useAuth();
  const [countType, setCountType] = useState<'full' | 'partial' | 'spot'>('full');
  const [storageCenter, setStorageCenter] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (storageCenter) {
      loadIngredientsForCenter();
    } else {
      setItems([]);
    }
  }, [storageCenter, ingredients]);

  const loadIngredientsForCenter = () => {
    const filtered = ingredients.filter(
      ing => (ing.storageCenter || ing.storage_center) === storageCenter
    );

    if (filtered.length === 0) {
      toast.info('Nenhum ingrediente encontrado neste centro de armazenamento');
      setItems([]);
      return;
    }

    const inventoryItems = filtered.map(ing => ({
      ingredientId: ing.id,
      ingredientName: ing.name,
      systemQty: ing.currentStock || ing.current_stock || 0,
      countedQty: 0,
      unit: ing.unit,
      difference: 0,
      notes: '',
    }));

    setItems(inventoryItems);
  };

  const handleCountedQtyChange = (index: number, value: string) => {
    const newItems = [...items];
    const counted = parseFloat(value) || 0;
    newItems[index].countedQty = counted;
    newItems[index].difference = counted - newItems[index].systemQty;
    setItems(newItems);
  };

  const handleItemNotesChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].notes = value;
    setItems(newItems);
  };

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
      countType,
      storageCenter,
      countedBy: user?.id || 'anonymous',
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

  return (
    <div className="space-y-6">
      {/* Count Type and Storage Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label>Tipo de Contagem *</Label>
          <RadioGroup value={countType} onValueChange={(v: any) => setCountType(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full" className="font-normal cursor-pointer">
                Contagem Completa
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="partial" id="partial" />
              <Label htmlFor="partial" className="font-normal cursor-pointer">
                Contagem Parcial
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="spot" id="spot" />
              <Label htmlFor="spot" className="font-normal cursor-pointer">
                Contagem Pontual
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="storageCenter">Centro de Armazenamento *</Label>
          <Select value={storageCenter} onValueChange={setStorageCenter}>
            <SelectTrigger id="storageCenter">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cozinha">Cozinha</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
              <SelectItem value="estoque-geral">Estoque Geral</SelectItem>
              <SelectItem value="refrigerado">Refrigerado</SelectItem>
              <SelectItem value="congelado">Congelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                    {items.map((item, index) => (
                      <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
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
                            onChange={(e) => handleCountedQtyChange(index, e.target.value)}
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
