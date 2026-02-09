import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DialogFooter } from '../ui/dialog';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { useStorageCenters } from '../../hooks/useStorageCenters';

interface IngredientFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  suppliers: any[];
}

export function IngredientForm({ initialData, onSave, onCancel, suppliers }: IngredientFormProps) {
  const { centers } = useStorageCenters();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: '',
    supplierIds: [] as string[],
    grossQty: '',
    netQty: '',
    price: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    minStock: '',
    maxStock: '',
    storageCenter: '',
    expiryDate: ''
  });

  const [showSupplierList, setShowSupplierList] = useState(false);

  useEffect(() => {
    if (initialData) {
      // Normalizar: aceitar supplier_ids (array) ou supplier_id (string legado)
      const ids = initialData.supplier_ids || (initialData.supplier_id ? [initialData.supplier_id] : []);
      setFormData({
        name: initialData.name || '',
        category: initialData.category || '',
        unit: initialData.unit || '',
        supplierIds: ids,
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

  const toggleSupplier = (supplierId: string) => {
    setFormData(prev => {
      const ids = prev.supplierIds.includes(supplierId)
        ? prev.supplierIds.filter(id => id !== supplierId)
        : [...prev.supplierIds, supplierId];
      return { ...prev, supplierIds: ids };
    });
  };

  const calculateYield = () => {
    const gross = parseFloat(formData.grossQty);
    const net = parseFloat(formData.netQty);
    if (gross > 0 && net > 0) {
      return (net / gross).toFixed(2);
    }
    return '\u2014';
  };

  const getSelectedSupplierNames = () => {
    if (formData.supplierIds.length === 0) return 'Selecione fornecedores';
    const names = formData.supplierIds
      .map(id => suppliers.find(s => s.id === id)?.name)
      .filter(Boolean);
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  };

  const handleSubmit = () => {
    const requiredFields = [
      { field: 'name', label: 'Nome' },
      { field: 'category', label: 'Categoria' },
      { field: 'unit', label: 'Unidade' },
      { field: 'grossQty', label: 'Quantidade Bruta' },
      { field: 'netQty', label: 'Quantidade Liquida' },
      { field: 'price', label: 'Preco' },
      { field: 'purchaseDate', label: 'Data de Compra' },
      { field: 'minStock', label: 'Estoque Minimo' },
      { field: 'maxStock', label: 'Estoque Maximo' },
      { field: 'storageCenter', label: 'Centro de Estoque' },
    ];

    for (const { field, label } of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast.error(`Campo obrigatorio nao preenchido: ${label}`);
        return;
      }
    }

    if (formData.supplierIds.length === 0) {
      toast.error('Selecione ao menos um fornecedor');
      return;
    }

    const grossQty = parseFloat(formData.grossQty);
    const netQty = parseFloat(formData.netQty);
    const price = parseFloat(formData.price);
    const minStock = parseFloat(formData.minStock);
    const maxStock = parseFloat(formData.maxStock);

    if (grossQty <= 0 || netQty <= 0 || price <= 0 || minStock < 0 || maxStock < 0) {
      toast.error('Valores numericos invalidos');
      return;
    }

    if (netQty > grossQty) {
      toast.error('Quantidade liquida nao pode ser maior que quantidade bruta');
      return;
    }

    if (maxStock < minStock) {
      toast.error('Estoque maximo nao pode ser menor que estoque minimo');
      return;
    }

    const submitData = {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      supplierIds: formData.supplierIds,
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
              <SelectItem value="perecivel">Perecivel</SelectItem>
              <SelectItem value="nao-perecivel">Nao Perecivel</SelectItem>
              <SelectItem value="bebida">Bebida</SelectItem>
              <SelectItem value="limpeza">Limpeza</SelectItem>
              <SelectItem value="descartavel">Descartavel</SelectItem>
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
          <Label>Fornecedores *</Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSupplierList(!showSupplierList)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs hover:bg-gray-50"
            >
              <span className={formData.supplierIds.length === 0 ? 'text-muted-foreground' : ''}>
                {getSelectedSupplierNames()}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
            {showSupplierList && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-md max-h-48 overflow-y-auto">
                {suppliers.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500">Nenhum fornecedor cadastrado</p>
                ) : (
                  suppliers.map(sup => (
                    <label
                      key={sup.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={formData.supplierIds.includes(sup.id)}
                        onCheckedChange={() => toggleSupplier(sup.id)}
                      />
                      {sup.name}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
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
          <Label htmlFor="netQty">Qtd. Liquida *</Label>
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
          <Label htmlFor="price">Preco Total (R$) *</Label>
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
          <Label htmlFor="minStock">Estoque Minimo *</Label>
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
          <Label htmlFor="maxStock">Estoque Maximo *</Label>
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
              {centers.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
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
          {initialData ? 'Salvar Alteracoes' : 'Cadastrar Insumo'}
        </Button>
      </DialogFooter>
    </div>
  );
}
