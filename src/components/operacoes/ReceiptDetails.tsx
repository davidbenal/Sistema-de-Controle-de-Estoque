import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ingredients, suppliers } from '../../data/mockData';
import { Calendar, User, Truck, ClipboardCheck, AlertTriangle } from 'lucide-react';

interface ReceiptDetailsProps {
  data: any;
  onClose: () => void;
}

export function ReceiptDetails({ data, onClose }: ReceiptDetailsProps) {
  if (!data) return null;

  const supplier = suppliers.find(s => s.id === data.supplierId);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-700';
      case 'validado': return 'bg-green-100 text-green-700';
      case 'rejeitado': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Recebimento #{data.id}</h2>
            <Badge className={getStatusColor(data.status)}>{data.status}</Badge>
          </div>
          <p className="text-gray-500 mt-1">Registrado em {new Date(data.date).toLocaleDateString('pt-BR')}</p>
        </div>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Truck className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">Fornecedor</h3>
            </div>
            <p className="text-lg font-medium">{supplier?.name}</p>
            <p className="text-sm text-gray-500">{supplier?.contact}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">Responsáveis</h3>
            </div>
            <p className="text-sm"><span className="font-medium">Recebido por:</span> {data.registeredBy}</p>
            {data.validatedBy && (
              <p className="text-sm mt-1"><span className="font-medium">Validado por:</span> {data.validatedBy}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-gray-500" />
          Conferência de Itens
        </h3>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Insumo</th>
                <th className="px-4 py-3 text-right">Qtd. Recebida</th>
                <th className="px-4 py-3 text-center">Condição</th>
                <th className="px-4 py-3 text-center">Validade</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((item: any, idx: number) => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                const isIssue = item.condition !== 'ok';
                return (
                  <tr key={idx} className={isIssue ? 'bg-red-50' : 'bg-white'}>
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      {ing?.name || 'Item desconhecido'}
                      {isIssue && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity} {ing?.unit}</td>
                    <td className="px-4 py-3 text-center uppercase text-xs font-bold">
                       <span className={isIssue ? 'text-red-600' : 'text-green-600'}>{item.condition}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {data.notes && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-1">Notas do Recebimento</h4>
          <p className="text-gray-700 text-sm">{data.notes}</p>
        </div>
      )}
    </div>
  );
}