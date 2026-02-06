import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DialogFooter } from '../ui/dialog';
import { toast } from 'sonner';

interface IngredientFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  suppliers: any[];
}

export function IngredientForm({ initialData, onSave, onCancel, suppliers }: IngredientFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: '',
    supplierId: '',
    grossQty: '',
    netQty: '',
    price: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    minStock: '',
    maxStock: '',
    storageCenter: '',
    expiryDate: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || '',
        unit: initialData.unit || '',
        supplierId: initialData.supplier_id || '',
        grossQty: initialData.gross_qty?.toString() || '',
        netQty: initialData.net_qty?.toString() || '',
        price: initialData.price?.toString() || '',
        purchaseDate: initialData.purchase_date || new Date().toISOString().split('T')[0],
        minStock: initialData.min_stock?.toString() || '',
        maxStock: initialData.max_stock?.toString() || '',
        storageCenter: initialData.storage_center || '',
        expiryDate: initialData.expiry_date || ''
      });
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateYield = () => {
    const gross = parseFloat(formData.grossQty);
    const net = parseFloat(formData.netQty);
    if (gross > 0 && net > 0) {
      return (net / gross).toFixed(2);
    }
    return '—';
  };

  const handleSubmit = () => {
    // Validação de campos obrigatórios
    const requiredFields = [
      { field: 'name', label: 'Nome' },
      { field: 'category', label: 'Categoria' },
      { field: 'unit', label: 'Unidade' },
      { field: 'supplierId', label: 'Fornecedor' },
      { field: 'grossQty', label: 'Quantidade Bruta' },
      { field: 'netQty', label: 'Quantidade Líquida' },
      { field: 'price', label: 'Preço' },
      { field: 'purchaseDate', label: 'Data de Compra' },
      { field: 'minStock', label: 'Estoque Mínimo' },
      { field: 'maxStock', label: 'Estoque Máximo' },
      { field: 'storageCenter', label: 'Centro de Estoque' },
    ];

    for (const { field, label } of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast.error(`Campo obrigatório não preenchido: ${label}`);
        return;
      }
    }

    // Validar valores numéricos
    const grossQty = parseFloat(formData.grossQty);
    const netQty = parseFloat(formData.netQty);
    const price = parseFloat(formData.price);
    const minStock = parseFloat(formData.minStock);
    const maxStock = parseFloat(formData.maxStock);

    if (grossQty <= 0 || netQty <= 0 || price <= 0 || minStock < 0 || maxStock < 0) {
      toast.error('Valores numéricos inválidos');
      return;
    }

    if (netQty > grossQty) {
      toast.error('Quantidade líquida não pode ser maior que quantidade bruta');
      return;
    }

    if (maxStock < minStock) {
      toast.error('Estoque máximo não pode ser menor que estoque mínimo');
      return;
    }

    // Preparar dados para envio
    const submitData = {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      supplierId: formData.supplierId,
      grossQty,
      netQty,
      price,
      purchaseDate: formData.purchaseDate,
      minStock,
      maxStock,
      storageCenter: formData.storageCenter,
      expiryDate: formData.expiryDate || null,
    };

    onSave(submitData);
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Insumo *</Label>
          <Input 
            id="name" 
            value={formData.name} 
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ex: Tomate" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria *</Label>
          <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="perecivel">Perecível</SelectItem>
              <SelectItem value="nao-perecivel">Não Perecível</SelectItem>
              <SelectItem value="bebida">Bebida</SelectItem>
              <SelectItem value="limpeza">Limpeza</SelectItem>
              <SelectItem value="descartavel">Descartável</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit">Unidade de Medida *</Label>
          <Select value={formData.unit} onValueChange={(v) => handleChange('unit', v)}>
            <SelectTrigger id="unit">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Quilograma (kg)</SelectItem>
              <SelectItem value="g">Grama (g)</SelectItem>
              <SelectItem value="litro">Litro (L)</SelectItem>
              <SelectItem value="ml">Mililitro (ml)</SelectItem>
              <SelectItem value="unidade">Unidade</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier">Fornecedor *</Label>
          <Select value={formData.supplierId} onValueChange={(v) => handleChange('supplierId', v)}>
            <SelectTrigger id="supplier">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((sup) => (
                <SelectItem key={sup.id} value={sup.id}>
                  {sup.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="grossQty">Qtd. Bruta *</Label>
          <Input 
            id="grossQty" 
            type="number" 
            step="0.01" 
            value={formData.grossQty}
            onChange={(e) => handleChange('grossQty', e.target.value)}
            placeholder="0.00" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="netQty">Qtd. Líquida *</Label>
          <Input 
            id="netQty" 
            type="number" 
            step="0.01" 
            value={formData.netQty}
            onChange={(e) => handleChange('netQty', e.target.value)}
            placeholder="0.00" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yieldFactor">Rendimento</Label>
          <Input
            id="yieldFactor"
            value={calculateYield()}
            disabled
            className="bg-gray-50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Preço Total (R$) *</Label>
          <Input 
            id="price" 
            type="number" 
            step="0.01" 
            value={formData.price}
            onChange={(e) => handleChange('price', e.target.value)}
            placeholder="0.00" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaseDate">Data de Compra *</Label>
          <Input 
            id="purchaseDate" 
            type="date" 
            value={formData.purchaseDate}
            onChange={(e) => handleChange('purchaseDate', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minStock">Estoque Mínimo *</Label>
          <Input 
            id="minStock" 
            type="number" 
            step="0.01" 
            value={formData.minStock}
            onChange={(e) => handleChange('minStock', e.target.value)}
            placeholder="0.00" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxStock">Estoque Máximo *</Label>
          <Input 
            id="maxStock" 
            type="number" 
            step="0.01" 
            value={formData.maxStock}
            onChange={(e) => handleChange('maxStock', e.target.value)}
            placeholder="0.00" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="storageCenter">Centro de Estoque *</Label>
          <Select value={formData.storageCenter} onValueChange={(v) => handleChange('storageCenter', v)}>
            <SelectTrigger id="storageCenter">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cozinha">Cozinha</SelectItem>
              <SelectItem value="cozinha-fria">Cozinha Fria</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
              <SelectItem value="despensa">Despensa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiryDate">Data de Validade (opcional)</Label>
        <Input 
          id="expiryDate" 
          type="date" 
          value={formData.expiryDate}
          onChange={(e) => handleChange('expiryDate', e.target.value)}
        />
      </div>

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          {initialData ? 'Salvar Alterações' : 'Cadastrar Insumo'}
        </Button>
      </DialogFooter>
    </div>
  );
}