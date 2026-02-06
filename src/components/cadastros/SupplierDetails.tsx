import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Phone, Truck, CreditCard, Package } from 'lucide-react';

interface SupplierDetailsProps {
  data: any;
  suppliedIngredients?: any[];
  onEdit: () => void;
}

export function SupplierDetails({ data, suppliedIngredients = [], onEdit }: SupplierDetailsProps) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{data.name}</h2>
          <p className="text-gray-500 mt-1">ID: {data.id}</p>
        </div>
        <Button onClick={onEdit}>Editar Fornecedor</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Phone className="h-8 w-8 text-blue-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Contato</h3>
            <p className="text-gray-500 text-sm mt-1">{data.contact}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Truck className="h-8 w-8 text-green-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Prazo de Entrega</h3>
            <p className="text-gray-500 text-sm mt-1">{data.deliveryTime} {data.deliveryTime === 1 ? 'dia' : 'dias'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <CreditCard className="h-8 w-8 text-purple-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Pagamento</h3>
            <p className="text-gray-500 text-sm mt-1">{data.paymentTerms}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-500" />
          Produtos Fornecidos ({suppliedIngredients.length})
        </h3>
        
        {suppliedIngredients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suppliedIngredients.map(item => {
              const purchaseDate = item.purchase_date || item.lastPurchaseDate;
              return (
                <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Unidade: {item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">R$ {item.price?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-gray-500">Última compra: {purchaseDate ? new Date(purchaseDate).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 italic">Nenhum produto associado a este fornecedor.</p>
        )}
      </div>
    </div>
  );
}