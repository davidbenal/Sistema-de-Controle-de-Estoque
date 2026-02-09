import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, User, Package, AlertOctagon, AlertTriangle } from 'lucide-react';
import { useStorageCenters } from '../../hooks/useStorageCenters';

interface InventoryDetailsProps {
  data: any;
  onClose: () => void;
}

export function InventoryDetails({ data, onClose }: InventoryDetailsProps) {
  const { getLabel } = useStorageCenters();
  if (!data) return null;

  const countDate = data.count_date?._seconds
    ? new Date(data.count_date._seconds * 1000)
    : data.count_date?.toDate
      ? data.count_date.toDate()
      : data.count_date
        ? new Date(data.count_date)
        : new Date();

  const itemsWithDiff = (data.items || []).filter((i: any) => {
    const diff = i.difference ?? ((i.counted_qty ?? i.countedQty ?? 0) - (i.system_qty ?? i.systemQty ?? 0));
    return Math.abs(diff) > 0.01;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Contagem #{data.id?.slice(0, 6)}</h2>
            <Badge variant="outline">{getLabel(data.storage_center || data.storageCenter)}</Badge>
            <Badge variant="default">Concluída</Badge>
          </div>
          <p className="text-gray-500 mt-1">
            Realizada em {countDate.toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          <User className="h-4 w-4" />
          Responsável: <span className="font-medium text-gray-900">{data.counted_by || data.countedBy || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          <Package className="h-4 w-4" />
          Itens Contados: <span className="font-medium text-gray-900">{data.items?.length || 0}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          <Calendar className="h-4 w-4" />
          Tipo: <span className="font-medium text-gray-900 capitalize">{data.count_type || data.countType}</span>
        </div>
        {itemsWithDiff.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
            <AlertTriangle className="h-4 w-4" />
            {itemsWithDiff.length} divergência(s) detectada(s)
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Resultado da Contagem</h3>

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
              {(data.items || []).map((item: any, idx: number) => {
                const systemQty = item.system_qty ?? item.systemQty ?? 0;
                const countedQty = item.counted_qty ?? item.countedQty ?? 0;
                const diff = item.difference ?? (countedQty - systemQty);
                const hasDiff = Math.abs(diff) > 0.01;
                const name = item.ingredient_name || item.ingredientName || 'Item desconhecido';
                const unit = item.unit || '';

                return (
                  <tr key={idx} className={hasDiff ? 'bg-red-50' : 'bg-white'}>
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      {name}
                      {hasDiff && <AlertOctagon className="h-4 w-4 text-red-500" />}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{systemQty} {unit}</td>
                    <td className="px-4 py-3 text-right font-bold">{countedQty} {unit}</td>
                    <td className={`px-4 py-3 text-right font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {diff > 0 ? '+' : ''}{Number(diff).toFixed(2)} {unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(data.notes) && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-1">Observações</h4>
          <p className="text-blue-700 text-sm">{data.notes}</p>
        </div>
      )}
    </div>
  );
}
