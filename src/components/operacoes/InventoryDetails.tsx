import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ingredients } from '../../data/mockData';
import { Calendar, User, Package, AlertOctagon } from 'lucide-react';

interface InventoryDetailsProps {
  data: any;
  onClose: () => void;
}

export function InventoryDetails({ data, onClose }: InventoryDetailsProps) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Contagem #{data.id}</h2>
            <Badge variant="outline" className="capitalize">{data.storageCenter}</Badge>
          </div>
          <p className="text-gray-500 mt-1">Realizada em {new Date(data.date).toLocaleDateString('pt-BR')}</p>
        </div>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>

      <div className="flex gap-4">
         <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            <User className="h-4 w-4" />
            Responsável: <span className="font-medium text-gray-900">{data.performedBy}</span>
         </div>
         <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            <Package className="h-4 w-4" />
            Itens Contados: <span className="font-medium text-gray-900">{data.items.length}</span>
         </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          Resultado da Contagem
        </h3>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Insumo</th>
                <th className="px-4 py-3 text-right">Sistema</th>
                <th className="px-4 py-3 text-right">Contagem Física</th>
                <th className="px-4 py-3 text-right">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((item: any, idx: number) => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                const diff = item.measuredQty - item.systemQty;
                const hasDiff = Math.abs(diff) > 0.01;
                
                return (
                  <tr key={idx} className={hasDiff ? 'bg-red-50' : 'bg-white'}>
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      {ing?.name || 'Item desconhecido'}
                      {hasDiff && <AlertOctagon className="h-4 w-4 text-red-500" />}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{item.systemQty} {ing?.unit}</td>
                    <td className="px-4 py-3 text-right font-bold">{item.measuredQty} {ing?.unit}</td>
                    <td className={`px-4 py-3 text-right font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                       {diff > 0 ? '+' : ''}{diff.toFixed(2)} {ing?.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {data.notes && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-1">Observações do Responsável</h4>
          <p className="text-blue-700 text-sm">{data.notes}</p>
        </div>
      )}
    </div>
  );
}