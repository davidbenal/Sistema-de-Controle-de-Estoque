import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Calendar, CheckCircle2, Truck, DollarSign, FileText } from 'lucide-react';

interface PurchaseOrderDetailsProps {
  data: any;
  onClose: () => void;
}

export function PurchaseOrderDetails({ data, onClose }: PurchaseOrderDetailsProps) {
  if (!data) return null;

  const supplierName = data.supplier_name || data.supplierName || 'Fornecedor';
  const supplierContact = data.supplier_contact || data.supplierContact || '';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-700';
      case 'aprovado': return 'bg-green-100 text-green-700';
      case 'recebido': return 'bg-blue-100 text-blue-700';
      case 'cancelado': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Pedido #{data.id}</h2>
            <Badge className={getStatusColor(data.status)}>{data.status}</Badge>
          </div>
          <p className="text-gray-500 mt-1">Criado em {new Date(data.date).toLocaleDateString('pt-BR')}</p>
        </div>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Truck className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">Fornecedor</h3>
            </div>
            <p className="text-lg font-medium">{supplierName}</p>
            <p className="text-sm text-gray-500">{supplierContact}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">Previsão de Entrega</h3>
            </div>
            <p className="text-lg font-medium">{new Date(data.expectedDelivery).toLocaleDateString('pt-BR')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">Total do Pedido</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">R$ {data.total.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500" />
          Itens do Pedido
        </h3>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Insumo</th>
                <th className="px-4 py-3 text-right">Quantidade</th>
                <th className="px-4 py-3 text-right">Preço Unit.</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((item: any, idx: number) => {
                const name = item.ingredient_name || item.ingredientName || 'Item desconhecido';
                const unit = item.unit || '';
                return (
                  <tr key={idx} className="bg-white">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 text-right">{item.quantity} {unit}</td>
                    <td className="px-4 py-3 text-right">R$ {item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium">R$ {(item.quantity * item.unitPrice).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                <td className="px-4 py-3 text-right text-green-600">R$ {data.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {data.notes && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-1">Observações</h4>
          <p className="text-yellow-700 text-sm">{data.notes}</p>
        </div>
      )}
    </div>
  );
}