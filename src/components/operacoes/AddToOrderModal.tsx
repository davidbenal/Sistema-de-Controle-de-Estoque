import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2 } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  supplier_id?: string;
  supplier_name?: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface AddToOrderModalProps {
  ingredient: Ingredient | null;
  suppliers: Supplier[];
  isLoadingSuppliers?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddToOrderData) => Promise<void>;
}

export interface AddToOrderData {
  ingredientId: string;
  ingredientName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  notes?: string;
}

export function AddToOrderModal({
  ingredient,
  suppliers,
  isLoadingSuppliers = false,
  isOpen,
  onClose,
  onSave,
}: AddToOrderModalProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (ingredient && isOpen) {
      // Reset form
      setQuantity('');
      setUnitPrice('');
      setNotes('');

      // Set default supplier if available
      if (ingredient.supplier_id) {
        setSelectedSupplierId(ingredient.supplier_id);
      } else {
        setSelectedSupplierId('');
      }
    }
  }, [ingredient, isOpen]);

  // Debug: Log suppliers when they change
  useEffect(() => {
    if (isOpen) {
      console.log('AddToOrderModal - Suppliers:', suppliers.length, suppliers);
      console.log('AddToOrderModal - isLoadingSuppliers:', isLoadingSuppliers);
    }
  }, [suppliers, isLoadingSuppliers, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ingredient || !selectedSupplierId || !quantity) {
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!selectedSupplier) return;

    const data: AddToOrderData = {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      supplierId: selectedSupplierId,
      supplierName: selectedSupplier.name,
      quantity: parseFloat(quantity),
      unit: ingredient.unit,
      unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
      notes: notes || undefined,
    };

    try {
      setIsLoading(true);
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar ao rascunho:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!ingredient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar a Pedido</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ingrediente (read-only) */}
          <div className="space-y-2">
            <Label>Ingrediente</Label>
            <Input value={ingredient.name} disabled className="bg-gray-50" />
          </div>

          {/* Fornecedor */}
          <div className="space-y-2">
            <Label htmlFor="supplier">
              Fornecedor <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
              disabled={isLoadingSuppliers}
              required
            >
              <SelectTrigger id="supplier">
                <SelectValue placeholder={
                  isLoadingSuppliers
                    ? "Carregando fornecedores..."
                    : suppliers.length === 0
                    ? "Nenhum fornecedor cadastrado"
                    : "Selecione o fornecedor"
                } />
              </SelectTrigger>
              <SelectContent>
                {isLoadingSuppliers ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-gray-500">
                    Nenhum fornecedor cadastrado
                  </div>
                ) : (
                  suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {isLoadingSuppliers && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Carregando lista de fornecedores...
              </p>
            )}
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantidade ({ingredient.unit}) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Preço Unitário */}
          <div className="space-y-2">
            <Label htmlFor="unitPrice">Preço Unitário (R$)</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500">Opcional - pode preencher depois</p>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!selectedSupplierId || !quantity || isLoading || isLoadingSuppliers}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                'Adicionar ao Rascunho'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
