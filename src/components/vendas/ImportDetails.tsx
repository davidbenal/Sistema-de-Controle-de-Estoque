import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { FileText, Calendar, User, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ImportDetailsProps {
  data: any;
  onClose: () => void;
}

export function ImportDetails({ data, onClose }: ImportDetailsProps) {
  if (!data) return null;

  // Mock items data based on the import record
  const mockItems = Array.from({ length: 5 }).map((_, i) => ({
    product: `Produto Exemplo ${i + 1}`,
    quantity: Math.floor(Math.random() * 20) + 1,
    value: (Math.random() * 50 + 10).toFixed(2),
    category: ['Bebidas', 'Comida', 'Sobremesa'][Math.floor(Math.random() * 3)]
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Importação #{data.id}</h2>
            <Badge variant={data.status === 'success' ? 'default' : 'destructive'} className={data.status === 'success' ? 'bg-green-600' : ''}>
              {data.status === 'success' ? 'Sucesso' : 'Erro'}
            </Badge>
          </div>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Processado em {data.date}
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">Arquivo</h3>
            </div>
            <p className="text-sm font-medium break-all">{data.filename}</p>
            <p className="text-xs text-gray-500 mt-1">{data.records} registros processados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">Responsável</h3>
            </div>
            <p className="text-lg font-medium">{data.user}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Total Processado</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">Falha no Processamento</h4>
            <p className="text-sm text-red-700 mt-1">
              O arquivo contém colunas inválidas ou dados corrompidos na linha 45. Verifique a formatação e tente novamente.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Resumo dos Itens (Amostra)</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Qtd.</th>
                <th className="px-4 py-3 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockItems.map((item, idx) => (
                <tr key={idx} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.product}</td>
                  <td className="px-4 py-3 text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">R$ {item.value}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-center text-xs text-gray-500">
                  ... e mais {data.records > 5 ? data.records - 5 : 0} itens
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}