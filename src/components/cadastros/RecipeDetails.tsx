import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { ChefHat, DollarSign, Users, PieChart } from 'lucide-react';

interface RecipeDetailsProps {
  data: any;
  onEdit: () => void;
}

export function RecipeDetails({ data, onEdit }: RecipeDetailsProps) {
  if (!data) return null;

  // Map snake_case fields from API to camelCase for display
  const recipe = {
    ...data,
    costPerPortion: data.cost_per_portion ?? data.costPerPortion ?? 0,
    suggestedPrice: data.suggested_price ?? data.suggestedPrice ?? 0,
    totalCost: data.total_cost ?? data.totalCost ?? 0,
    laborCost: data.labor_cost ?? data.laborCost ?? 0,
    equipmentCost: data.equipment_cost ?? data.equipmentCost ?? 0,
    ingredientsCost: data.ingredients_cost ?? data.ingredientsCost ?? 0,
  };

  const margin = ((recipe.suggestedPrice - recipe.costPerPortion) / recipe.suggestedPrice) * 100;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-gray-900">{recipe.name}</h2>
            <Badge variant="outline" className="text-base px-3 py-1">{recipe.category}</Badge>
          </div>
          <p className="text-gray-500 mt-2">ID: {recipe.id}</p>
        </div>
        <Button onClick={onEdit}>Editar Ficha</Button>
      </div>

      <div className="grid grid-cols-4 gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <Users className="h-5 w-5 text-orange-600 mb-1" />
          <span className="text-xs text-orange-600 uppercase tracking-wide">Rendimento</span>
          <span className="text-xl font-bold text-gray-900">{recipe.portions} Porções</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 text-center border-l border-orange-200">
          <DollarSign className="h-5 w-5 text-green-600 mb-1" />
          <span className="text-xs text-green-600 uppercase tracking-wide">Custo Total</span>
          <span className="text-xl font-bold text-gray-900">R$ {recipe.totalCost.toFixed(2)}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 text-center border-l border-orange-200">
          <PieChart className="h-5 w-5 text-blue-600 mb-1" />
          <span className="text-xs text-blue-600 uppercase tracking-wide">Custo / Porção</span>
          <span className="text-xl font-bold text-gray-900">R$ {recipe.costPerPortion.toFixed(2)}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-2 text-center border-l border-orange-200">
          <ChefHat className="h-5 w-5 text-purple-600 mb-1" />
          <span className="text-xs text-purple-600 uppercase tracking-wide">Preço Sugerido</span>
          <span className="text-xl font-bold text-gray-900">R$ {recipe.suggestedPrice.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ingredients Column */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Ingredientes</h3>
            <div className="space-y-3">
              {recipe.ingredients?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-200 last:border-0">
                  <span className="font-medium text-gray-700">{item.name || 'Item desconhecido'}</span>
                  <span className="text-gray-900 font-semibold bg-gray-100 px-2 py-1 rounded">
                    {item.quantity} {item.unit || 'un'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Modo de Preparo</h3>
            <div className="prose text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-lg">
              {recipe.instructions || 'Nenhuma instrução cadastrada.'}
            </div>
          </div>
        </div>

        {/* Financial Column */}
        <div className="space-y-6">
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-900 text-white p-4">
              <h3 className="font-bold">Análise Financeira</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">CMV Teórico</span>
                <span className="font-semibold text-gray-900">{(recipe.costPerPortion / recipe.suggestedPrice * 100).toFixed(1)}%</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Margem Bruta</span>
                <span className="font-bold text-green-600">{margin.toFixed(1)}%</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Lucro Bruto / Prato</span>
                <span>R$ {(recipe.suggestedPrice - recipe.costPerPortion).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Observações de Custo</h4>
            <p className="text-sm text-yellow-700">
              Mão de Obra: R$ {recipe.laborCost.toFixed(2)} <br/>
              Equipamentos: R$ {recipe.equipmentCost.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}