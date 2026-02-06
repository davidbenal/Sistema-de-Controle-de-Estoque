import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { DialogFooter } from '../ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface RecipeFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  ingredients: any[];
}

export function RecipeForm({ initialData, onSave, onCancel, ingredients }: RecipeFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    portions: '',
    suggestedPrice: '',
    instructions: '',
    laborCost: '',
    equipmentCost: ''
  });

  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientQty, setIngredientQty] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || '',
        portions: initialData.portions?.toString() || '',
        suggestedPrice: initialData.suggested_price?.toString() || '',
        instructions: initialData.instructions || '',
        laborCost: initialData.labor_cost?.toString() || '',
        equipmentCost: initialData.equipment_cost?.toString() || ''
      });

      // Map existing ingredients if any
      if (initialData.ingredients && Array.isArray(initialData.ingredients)) {
        setRecipeIngredients(initialData.ingredients.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit
        })));
      }
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addIngredient = () => {
    if (!selectedIngredient || !ingredientQty) {
      toast.error('Selecione um ingrediente e a quantidade');
      return;
    }

    const qty = parseFloat(ingredientQty);
    if (qty <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    const ingDetail = ingredients.find(i => i.id === selectedIngredient);
    if (!ingDetail) return;

    const newItem = {
      id: ingDetail.id,
      name: ingDetail.name,
      quantity: qty,
      unit: ingDetail.unit
    };

    setRecipeIngredients([...recipeIngredients, newItem]);
    setSelectedIngredient('');
    setIngredientQty('');
  };

  const removeIngredient = (index: number) => {
    const newDocs = [...recipeIngredients];
    newDocs.splice(index, 1);
    setRecipeIngredients(newDocs);
  };

  const handleSubmit = () => {
    // Validação de campos obrigatórios
    if (!formData.name || !formData.category || !formData.portions || !formData.suggestedPrice) {
      toast.error('Preencha os campos obrigatórios (nome, categoria, porções, preço)');
      return;
    }

    if (recipeIngredients.length === 0) {
      toast.error('Adicione pelo menos um ingrediente');
      return;
    }

    // Validar valores numéricos
    const portions = parseInt(formData.portions);
    const suggestedPrice = parseFloat(formData.suggestedPrice);
    const laborCost = formData.laborCost ? parseFloat(formData.laborCost) : 0;
    const equipmentCost = formData.equipmentCost ? parseFloat(formData.equipmentCost) : 0;

    if (portions <= 0 || suggestedPrice <= 0) {
      toast.error('Porções e preço devem ser maiores que zero');
      return;
    }

    if (laborCost < 0 || equipmentCost < 0) {
      toast.error('Custos não podem ser negativos');
      return;
    }

    // Preparar dados para envio
    const submitData = {
      name: formData.name,
      category: formData.category,
      portions,
      ingredients: recipeIngredients.map(item => ({
        id: item.id,
        quantity: item.quantity
      })),
      suggestedPrice,
      laborCost,
      equipmentCost,
      instructions: formData.instructions || '',
    };

    onSave(submitData);
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recipeName">Nome do Prato *</Label>
          <Input 
            id="recipeName" 
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ex: Filé ao Molho Madeira" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipeCategory">Categoria *</Label>
          <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
            <SelectTrigger id="recipeCategory">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Entradas">Entradas</SelectItem>
              <SelectItem value="Pratos Principais">Pratos Principais</SelectItem>
              <SelectItem value="Acompanhamentos">Acompanhamentos</SelectItem>
              <SelectItem value="Sobremesas">Sobremesas</SelectItem>
              <SelectItem value="Bebidas">Bebidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="portions">Número de Porções *</Label>
        <Input 
          id="portions" 
          type="number" 
          value={formData.portions}
          onChange={(e) => handleChange('portions', e.target.value)}
          placeholder="1" 
        />
      </div>

      <div className="space-y-2">
        <Label>Ingredientes *</Label>
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ingrediente" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Input 
                type="number" 
                step="0.01" 
                value={ingredientQty}
                onChange={(e) => setIngredientQty(e.target.value)}
                placeholder="Qtd" 
              />
            </div>
            <div className="col-span-2">
              <Input 
                placeholder="Unid" 
                disabled 
                className="bg-gray-50"
                value={ingredients.find(i => i.id === selectedIngredient)?.unit || ''}
              />
            </div>
            <div className="col-span-1">
              <Button variant="outline" size="icon" className="w-full" onClick={addIngredient}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {recipeIngredients.length > 0 && (
            <div className="mt-2 space-y-1">
              {recipeIngredients.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                  <span>{item.name} - {item.quantity} {item.unit}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeIngredient(idx)} className="h-6 w-6 p-0 text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="laborCost">Custo de Mão de Obra (R$)</Label>
          <Input 
            id="laborCost" 
            type="number" 
            step="0.01" 
            value={formData.laborCost}
            onChange={(e) => handleChange('laborCost', e.target.value)}
            placeholder="0.00" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="equipmentCost">Custo de Equipamentos (R$)</Label>
          <Input
            id="equipmentCost"
            type="number"
            step="0.01"
            value={formData.equipmentCost}
            onChange={(e) => handleChange('equipmentCost', e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="suggestedPrice">Preço de Venda Sugerido (R$) *</Label>
        <Input 
          id="suggestedPrice" 
          type="number" 
          step="0.01" 
          value={formData.suggestedPrice}
          onChange={(e) => handleChange('suggestedPrice', e.target.value)}
          placeholder="0.00" 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instruções de Preparo</Label>
        <Textarea
          id="instructions"
          value={formData.instructions}
          onChange={(e) => handleChange('instructions', e.target.value)}
          placeholder="Descreva o modo de preparo..."
          rows={4}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit}>
          {initialData ? 'Salvar Ficha Técnica' : 'Salvar Ficha Técnica'}
        </Button>
      </DialogFooter>
    </div>
  );
}