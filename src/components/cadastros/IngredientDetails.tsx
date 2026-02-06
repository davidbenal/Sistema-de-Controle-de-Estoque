import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Package, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface IngredientDetailsProps {
  data: any;
  supplier?: any;
  onClose: () => void;
  onEdit: () => void;
}

const mockHistoryData = [
  { name: 'Jan', stock: 40, price: 12.50 },
  { name: 'Fev', stock: 35, price: 12.80 },
  { name: 'Mar', stock: 50, price: 13.00 },
  { name: 'Abr', stock: 45, price: 12.90 },
  { name: 'Mai', stock: 30, price: 13.50 },
  { name: 'Jun', stock: data => data.currentStock, price: data => data.price },
];

export function IngredientDetails({ data, supplier, onClose, onEdit }: IngredientDetailsProps) {
  if (!data) return null;

  // Map snake_case fields from API to camelCase for display
  const ingredient = {
    ...data,
    currentStock: data.current_stock ?? data.currentStock ?? 0,
    minStock: data.min_stock ?? data.minStock ?? 0,
    maxStock: data.max_stock ?? data.maxStock ?? 0,
    expiryDate: data.expiry_date ?? data.expiryDate,
    lastPurchaseDate: data.purchase_date ?? data.lastPurchaseDate,
    storageCenter: data.storage_center ?? data.storageCenter,
  };

  const chartData = mockHistoryData.map(d => ({
    ...d,
    stock: typeof d.stock === 'function' ? d.stock(ingredient) : d.stock,
    price: typeof d.price === 'function' ? d.price(ingredient) : d.price,
  }));

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'perecivel': return 'bg-red-100 text-red-700';
      case 'nao-perecivel': return 'bg-green-100 text-green-700';
      case 'bebida': return 'bg-blue-100 text-blue-700';
      case 'limpeza': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">{ingredient.name}</h2>
            <Badge className={getCategoryColor(ingredient.category)}>
              {ingredient.category}
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">ID: {ingredient.id}</p>
        </div>
        <Button onClick={onEdit}>Editar Insumo</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Atual</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ingredient.currentStock} {ingredient.unit}</div>
            <p className="text-xs text-gray-500">
              Min: {ingredient.minStock} | Max: {ingredient.maxStock}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preço Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {ingredient.price?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-gray-500">
              Preço de compra
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validade</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ingredient.expiryDate ? new Date(ingredient.expiryDate).toLocaleDateString() : '-'}
            </div>
            <p className="text-xs text-gray-500">
              {ingredient.lastPurchaseDate ? `Compra: ${new Date(ingredient.lastPurchaseDate).toLocaleDateString()}` : 'Sem data de compra'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Detalhes do Fornecedor</h3>
          <Card>
            <CardContent className="pt-6">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Nome:</dt>
                  <dd className="font-medium">{supplier?.name || 'Não informado'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Contato:</dt>
                  <dd className="font-medium">{supplier?.contact || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Prazo de Entrega:</dt>
                  <dd className="font-medium">{supplier?.deliveryTime || '-'} dias</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Condições:</dt>
                  <dd className="font-medium">{supplier?.paymentTerms || '-'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <h3 className="font-semibold text-lg mt-4">Armazenamento</h3>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="text-gray-400" />
                <span>Localização: <strong>{ingredient.storageCenter}</strong></span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Histórico de Preço</h3>
          <Card className="h-[250px]">
            <CardContent className="h-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                  <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Preço']} />
                  <Line type="monotone" dataKey="price" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}