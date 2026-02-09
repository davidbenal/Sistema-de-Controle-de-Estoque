import { useState } from 'react';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Phone, Truck, CreditCard, Package, Search, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { config } from '../../config';

interface SupplierDetailsProps {
  data: any;
  suppliedIngredients?: any[];
  allIngredients?: any[];
  onEdit: () => void;
  onIngredientsUpdated?: () => void;
}

export function SupplierDetails({ data, suppliedIngredients = [], allIngredients = [], onEdit, onIngredientsUpdated }: SupplierDetailsProps) {
  const [isEditingIngredients, setIsEditingIngredients] = useState(false);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!data) return null;

  const startEditingIngredients = () => {
    const currentIds = new Set(suppliedIngredients.map(i => i.id));
    setSelectedIngredientIds(currentIds);
    setIsEditingIngredients(true);
    setIngredientSearch('');
  };

  const cancelEditingIngredients = () => {
    setIsEditingIngredients(false);
    setIngredientSearch('');
  };

  const toggleIngredient = (ingredientId: string) => {
    setSelectedIngredientIds(prev => {
      const next = new Set(prev);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  };

  const handleSaveIngredients = async () => {
    setIsSaving(true);
    try {
      const currentSuppliedIds = new Set(suppliedIngredients.map(i => i.id));
      const promises: Promise<any>[] = [];

      // Ingredientes adicionados: adicionar este fornecedor ao array supplier_ids
      for (const id of selectedIngredientIds) {
        if (!currentSuppliedIds.has(id)) {
          const ingredient = allIngredients.find(i => i.id === id);
          const currentIds: string[] = ingredient?.supplier_ids || (ingredient?.supplier_id ? [ingredient.supplier_id] : []);
          const newIds = [...new Set([...currentIds, data.id])];
          promises.push(
            fetch(config.endpoints.cadastros.ingrediente(id), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ supplierIds: newIds }),
            })
          );
        }
      }

      // Ingredientes removidos: remover este fornecedor do array supplier_ids
      for (const id of currentSuppliedIds) {
        if (!selectedIngredientIds.has(id)) {
          const ingredient = allIngredients.find(i => i.id === id);
          const currentIds: string[] = ingredient?.supplier_ids || (ingredient?.supplier_id ? [ingredient.supplier_id] : []);
          const newIds = currentIds.filter((sid: string) => sid !== data.id);
          promises.push(
            fetch(config.endpoints.cadastros.ingrediente(id), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ supplierIds: newIds }),
            })
          );
        }
      }

      if (promises.length === 0) {
        setIsEditingIngredients(false);
        return;
      }

      const results = await Promise.all(promises);
      const allOk = results.every(r => r.ok);

      if (allOk) {
        toast.success('Insumos atualizados com sucesso');
        setIsEditingIngredients(false);
        onIngredientsUpdated?.();
      } else {
        toast.error('Erro ao atualizar alguns insumos');
      }
    } catch (error) {
      console.error('Erro ao salvar insumos:', error);
      toast.error('Erro de conexao');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAllIngredients = allIngredients.filter(i =>
    i.name?.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{data.name}</h2>
          <p className="text-gray-500 mt-1">ID: {data.id}</p>
        </div>
        <Button onClick={onEdit}>Editar Fornecedor</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Phone className="h-8 w-8 text-blue-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Contato</h3>
            <p className="text-gray-500 text-sm mt-1">{data.contact || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Truck className="h-8 w-8 text-green-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Prazo de Entrega</h3>
            <p className="text-gray-500 text-sm mt-1">
              {(data.deliveryTime ?? data.delivery_time) != null
                ? `${data.deliveryTime ?? data.delivery_time} ${(data.deliveryTime ?? data.delivery_time) === 1 ? 'dia' : 'dias'}`
                : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <CreditCard className="h-8 w-8 text-purple-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Pagamento</h3>
            <p className="text-gray-500 text-sm mt-1">{data.paymentTerms || data.payment_terms || '-'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            Produtos Fornecidos ({isEditingIngredients ? selectedIngredientIds.size : suppliedIngredients.length})
          </h3>
          {!isEditingIngredients ? (
            <Button variant="outline" size="sm" onClick={startEditingIngredients}>
              Editar Insumos
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancelEditingIngredients} disabled={isSaving}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveIngredients} disabled={isSaving}>
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          )}
        </div>

        {isEditingIngredients ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar insumo..."
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {filteredAllIngredients.length === 0 ? (
                <p className="p-4 text-gray-500 text-sm text-center">Nenhum insumo encontrado</p>
              ) : (
                filteredAllIngredients.map(ingredient => (
                  <label
                    key={ingredient.id}
                    className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIngredientIds.has(ingredient.id)}
                      onCheckedChange={() => toggleIngredient(ingredient.id)}
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm">{ingredient.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({ingredient.unit})</span>
                    </div>
                    {ingredient.price != null && (
                      <span className="text-xs text-gray-500">R$ {Number(ingredient.price || 0).toFixed(2)}</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
        ) : suppliedIngredients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suppliedIngredients.map(item => {
              const purchaseDate = item.purchase_date || item.lastPurchaseDate;
              return (
                <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Unidade: {item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">R$ {Number(item.price || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Ultima compra: {purchaseDate ? new Date(purchaseDate).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 italic">Nenhum produto associado a este fornecedor.</p>
        )}
      </div>
    </div>
  );
}
