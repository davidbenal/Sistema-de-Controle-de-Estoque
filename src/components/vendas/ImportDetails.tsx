import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { FileText, Calendar, CheckCircle2, XCircle, AlertTriangle, Clock, Package } from 'lucide-react';

interface ImportDetailsProps {
  data: any;
  onClose: () => void;
}

function parseUploadDate(data: any): string {
  if (data.uploadedAt?.seconds) {
    return new Date(data.uploadedAt.seconds * 1000).toLocaleString('pt-BR');
  }
  if (data.uploadedAt?._seconds) {
    return new Date(data.uploadedAt._seconds * 1000).toLocaleString('pt-BR');
  }
  if (typeof data.uploadedAt === 'string') {
    return new Date(data.uploadedAt).toLocaleString('pt-BR');
  }
  return data.date || 'N/A';
}

function getStatusInfo(status: string): { label: string; variant: 'default' | 'destructive' | 'secondary'; className: string } {
  switch (status) {
    case 'completed':
    case 'success':
      return { label: 'Sucesso', variant: 'default', className: 'bg-green-600' };
    case 'failed':
    case 'error':
      return { label: 'Erro', variant: 'destructive', className: '' };
    case 'processing':
      return { label: 'Processando', variant: 'secondary', className: 'bg-yellow-500 text-white' };
    default:
      return { label: status || 'Desconhecido', variant: 'secondary', className: '' };
  }
}

export function ImportDetails({ data, onClose }: ImportDetailsProps) {
  if (!data) return null;

  const dateStr = parseUploadDate(data);
  const statusInfo = getStatusInfo(data.status);

  const salesCreated = data.salesCreated ?? 0;
  const processingTimeMs = data.processingTimeMs ?? 0;
  const processingResults = data.processingResults || {};
  const totalRows = processingResults.totalRows ?? 0;
  const validRows = processingResults.validRows ?? 0;
  const invalidRows = processingResults.invalidRows ?? 0;
  const skippedRows = processingResults.skippedRows ?? 0;
  const ingredientsUpdated = data.ingredientsUpdated ?? 0;

  const errors = data.errors || [];
  const warnings = data.warnings || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Detalhes da Importação</h2>
            <Badge variant={statusInfo.variant} className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {dateStr}
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
            <p className="text-sm font-medium break-all">{data.filename || 'N/A'}</p>
            {totalRows > 0 && (
              <p className="text-xs text-gray-500 mt-1">{totalRows} linhas no arquivo</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Vendas Registradas</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">{salesCreated}</p>
            {ingredientsUpdated > 0 && (
              <p className="text-xs text-gray-500 mt-1">{ingredientsUpdated} ingredientes atualizados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Tempo de Processamento</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {processingTimeMs > 0 ? `${(processingTimeMs / 1000).toFixed(1)}s` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumo do processamento */}
      {totalRows > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Resumo do Processamento</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{totalRows}</p>
              <p className="text-xs text-gray-500">Linhas no arquivo</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{validRows}</p>
              <p className="text-xs text-green-600">Válidas</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${invalidRows > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <p className={`text-2xl font-bold ${invalidRows > 0 ? 'text-red-700' : ''}`}>{invalidRows}</p>
              <p className={`text-xs ${invalidRows > 0 ? 'text-red-600' : 'text-gray-500'}`}>Inválidas</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${skippedRows > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
              <p className={`text-2xl font-bold ${skippedRows > 0 ? 'text-yellow-700' : ''}`}>{skippedRows}</p>
              <p className={`text-xs ${skippedRows > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>Ignoradas</p>
            </div>
          </div>
        </div>
      )}

      {/* Erros */}
      {errors.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Erros ({errors.length})
          </h3>
          <div className="space-y-2">
            {errors.map((error: any, idx: number) => (
              <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-medium">
                  {error.step && <span className="text-red-500">[{error.step}] </span>}
                  {error.message || JSON.stringify(error)}
                </p>
                {error.details && Array.isArray(error.details) && error.details.length > 0 && (
                  <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                    {error.details.slice(0, 5).map((d: any, i: number) => (
                      <li key={i}>{d.error || JSON.stringify(d)}</li>
                    ))}
                    {error.details.length > 5 && (
                      <li>... e mais {error.details.length - 5} erros</li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Avisos ({warnings.length})
          </h3>
          <div className="space-y-2">
            {warnings.map((warning: any, idx: number) => (
              <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  {warning.message || JSON.stringify(warning)}
                </p>
                {warning.skus && Array.isArray(warning.skus) && (
                  <p className="text-xs text-yellow-600 mt-1">
                    SKUs: {warning.skus.join(', ')}
                  </p>
                )}
                {warning.ingredientName && (
                  <p className="text-xs text-yellow-600 mt-1">
                    <Package className="w-3 h-3 inline mr-1" />
                    {warning.ingredientName}: {(warning.newStock ?? 0).toFixed(2)} {warning.unit || ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {errors.length === 0 && warnings.length === 0 && totalRows === 0 && salesCreated === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum detalhe disponível para esta importação</p>
        </div>
      )}
    </div>
  );
}
