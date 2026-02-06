import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { DialogFooter } from '../ui/dialog';
import { Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseOrderFormProps {
  suppliers: any[];
  ingredients: any[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface OrderItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export function PurchaseOrderForm({
  suppliers,
  ingredients,
  onSave,
  onCancel,
  isLoading = false,
}: PurchaseOrderFormProps) {
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { ingredientId: '', ingredientName: '', quantity: 0, unit: '', unitPrice: 0 },
  ]);

  const handleSupplierChange = (value: string) => {
    setSupplierId(value);
    const supplier = suppliers.find(s => s.id === value);
    if (supplier) {
      setSupplierName(supplier.name);
    }
  };

  const handleIngredientChange = (index: number, ingredientId: string) => {
    const ingredient = ingredients.find(ing => ing.id === ingredientId);
    if (ingredient) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        ingredientId,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
      };
      setItems(newItems);
    }
  };

  const handleQuantityChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].quantity = parseFloat(value) || 0;
    setItems(newItems);
  };

  const handlePriceChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].unitPrice = parseFloat(value) || 0;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { ingredientId: '', ingredientName: '', quantity: 0, unit: '', unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = (item: OrderItem) => {
    return item.quantity * item.unitPrice;
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateSubtotal(item), 0);
  };

  const validateForm = () => {
    if (!supplierId) {
      toast.error('Selecione um fornecedor');
      return false;
    }

    if (!orderDate) {
      toast.error('Data do pedido é obrigatória');
      return false;
    }

    if (!expectedDelivery) {
      toast.error('Data de entrega prevista é obrigatória');
      return false;
    }

    if (new Date(expectedDelivery) < new Date(orderDate)) {
      toast.error('Data de entrega deve ser igual ou posterior à data do pedido');
      return false;
    }

    const validItems = items.filter(
      item => item.ingredientId && item.quantity > 0 && item.unitPrice > 0
    );

    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um item válido ao pedido');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const validItems = items.filter(
      item => item.ingredientId && item.quantity > 0 && item.unitPrice > 0
    );

    const data = {
      supplierId,
      supplierName,
      orderDate,
      expectedDelivery,
      items: validItems.map(item => ({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
      })),
      notes: notes || undefined,
    };

    await onSave(data);
  };

  return (
    <div className="space-y-6">
      {/* Supplier and Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="supplier">Fornecedor *</Label>
          <Select value={supplierId} onValueChange={handleSupplierChange}>
            <SelectTrigger id="supplier">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(supplier => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="orderDate">Data do Pedido *</Label>
          <Input
            id="orderDate"
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedDelivery">Entrega Prevista *</Label>
          <Input
            id="expectedDelivery"
            type="date"
            value={expectedDelivery}
            onChange={(e) => setExpectedDelivery(e.target.value)}
            min={orderDate}
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Itens do Pedido *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Ingrediente</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Quantidade</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700">Unidade</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Preço Unit.</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700">Subtotal</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <Select
                      value={item.ingredientId}
                      onValueChange={(value) => handleIngredientChange(index, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map(ing => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity || ''}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      className="text-right"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600">
                    {item.unit || '-'}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice || ''}
                      onChange={(e) => handlePriceChange(index, e.target.value)}
                      className="text-right"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    R$ {calculateSubtotal(item).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1 || isLoading}
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex justify-end">
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-6 py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Valor Total:</span>
              <span className="text-2xl font-bold text-gray-900">
                R$ {calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações adicionais sobre o pedido..."
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
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            'Criar Pedido'
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
