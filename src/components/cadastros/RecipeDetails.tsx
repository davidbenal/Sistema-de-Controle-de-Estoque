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

  const recipe = {
    ...data,
    costPerPortion: data.cost_per_portion ?? data.costPerPortion ?? 0,
    suggestedPrice: data.suggested_price ?? data.suggestedPrice ?? 0,
    totalCost: data.total_cost ?? data.totalCost ?? 0,
    laborCost: data.labor_cost ?? data.laborCost ?? 0,
    equipmentCost: data.equipment_cost ?? data.equipmentCost ?? 0,
    ingredientsCost: data.ingredients_cost ?? data.ingredientsCost ?? 0,
  };

  const margin = recipe.suggestedPrice
    ? ((recipe.suggestedPrice - recipe.costPerPortion) / recipe.suggestedPrice) * 100
    : 0;
  const cmv = recipe.suggestedPrice
    ? ((recipe.costPerPortion ?? 0) / recipe.suggestedPrice) * 100
    : 0;
  const lucro = (recipe.suggestedPrice ?? 0) - (recipe.costPerPortion ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{recipe.name}</h2>
            {recipe.category && (
              <Badge variant="outline" className="shrink-0">{recipe.category}</Badge>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">ID: {recipe.id}</p>
        </div>
        <Button onClick={onEdit} className="shrink-0">Editar Ficha</Button>
      </div>

      {/* Stats bar - 2x2 grid on small, 4 cols on wide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-orange-50 p-4 rounded-xl border border-orange-100">
        <div className="flex flex-col items-center p-3 text-center">
          <Users className="h-5 w-5 text-orange-600 mb-1" />
          <span className="text-[11px] text-orange-600 uppercase tracking-wide font-medium">Rendimento</span>
          <span className="text-lg font-bold text-gray-900">{recipe.portions}</span>
          <span className="text-xs text-gray-500">Porcoes</span>
        </div>
        <div className="flex flex-col items-center p-3 text-center md:border-l border-orange-200">
          <DollarSign className="h-5 w-5 text-green-600 mb-1" />
          <span className="text-[11px] text-green-600 uppercase tracking-wide font-medium">Custo Total</span>
          <span className="text-lg font-bold text-gray-900">R$ {(recipe.totalCost ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex flex-col items-center p-3 text-center md:border-l border-orange-200">
          <PieChart className="h-5 w-5 text-blue-600 mb-1" />
          <span className="text-[11px] text-blue-600 uppercase tracking-wide font-medium">Custo/Porcao</span>
          <span className="text-lg font-bold text-gray-900">R$ {(recipe.costPerPortion ?? 0).toFixed(2)}</span>
        </div>
        <div className="flex flex-col items-center p-3 text-center md:border-l border-orange-200">
          <ChefHat className="h-5 w-5 text-purple-600 mb-1" />
          <span className="text-[11px] text-purple-600 uppercase tracking-wide font-medium">Preco Sugerido</span>
          <span className="text-lg font-bold text-gray-900">R$ {(recipe.suggestedPrice ?? 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Main content - side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Ingredients + Instructions (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          <div>
            <h3 className="text-base font-bold border-b pb-2 mb-3">Ingredientes</h3>
            {recipe.ingredients?.length > 0 ? (
              <div className="space-y-1">
                {recipe.ingredients.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-dashed border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-700">{item.name || 'Item desconhecido'}</span>
                    <span className="text-sm text-gray-900 font-semibold bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap ml-4">
                      {item.quantity} {item.unit || 'un'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Nenhum ingrediente cadastrado.</p>
            )}
          </div>

          <div>
            <h3 className="text-base font-bold border-b pb-2 mb-3">Modo de Preparo</h3>
            <div className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-lg">
              {recipe.instructions || 'Nenhuma instrucao cadastrada.'}
            </div>
          </div>
        </div>

        {/* Right: Financial analysis (2/5) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-900 text-white px-4 py-3">
              <h3 className="font-semibold text-sm">Analise Financeira</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">CMV Teorico</span>
                <span className="font-semibold text-sm">{cmv.toFixed(1)}%</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Margem Bruta</span>
                <span className={`font-bold text-sm ${margin > 50 ? 'text-green-600' : margin > 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Lucro Bruto / Prato</span>
                <span className="text-sm font-medium">R$ {lucro.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-yellow-800 mb-2">Custos Adicionais</h4>
            <div className="space-y-1 text-sm text-yellow-700">
              <div className="flex justify-between">
                <span>Mao de Obra:</span>
                <span>R$ {(recipe.laborCost ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Equipamentos:</span>
                <span>R$ {(recipe.equipmentCost ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
