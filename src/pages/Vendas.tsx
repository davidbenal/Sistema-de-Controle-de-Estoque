import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { ImportDetails } from '../components/vendas/ImportDetails';
import { config } from '../config';

interface SalesUpload {
  id: string;
  filename: string;
  uploadedAt: { seconds: number };
  status: 'processing' | 'completed' | 'failed';
  salesCreated?: number;
  processingTimeMs?: number;
  errors?: any[];
  warnings?: any[];
}

export function Vendas() {
  const [isUploading, setIsUploading] = useState(false);
  const [viewingImport, setViewingImport] = useState<any>(null);
  const [importHistory, setImportHistory] = useState<SalesUpload[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Carregar histórico ao montar componente
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(config.endpoints.vendas.historico);
      const data = await response.json();

      if (data.success) {
        setImportHistory(data.uploads || []);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de uploads');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      toast.error('Formato de arquivo inválido. Use XLSX, XLS ou CSV.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(config.endpoints.vendas.upload, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(
          `Upload concluído! ${result.processingResults?.update_stock?.salesCreated || 0} vendas registradas em ${(result.processingTimeMs / 1000).toFixed(1)}s`,
          { duration: 5000 }
        );

        // Mostrar warnings se houver
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.slice(0, 3).forEach((warning: any) => {
            toast.warning(warning.message || JSON.stringify(warning), { duration: 8000 });
          });
        }

        // Recarregar histórico
        await loadHistory();
      } else {
        toast.error(result.error || result.message || 'Erro ao processar arquivo');

        // Mostrar detalhes do erro
        if (result.errors && result.errors.length > 0) {
          result.errors.slice(0, 3).forEach((error: any) => {
            toast.error(error.message || JSON.stringify(error), { duration: 10000 });
          });
        }
      }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setIsUploading(false);
      // Limpar input para permitir reupload do mesmo arquivo
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integração de Vendas</h1>
        <p className="text-gray-500 mt-1">Importe e gerencie dados de vendas do sistema Zig</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card de Importação */}
        <Card>
          <CardHeader>
            <CardTitle>Importar Relatório Zig</CardTitle>
            <CardDescription>
              Faça upload do arquivo CSV ou Excel exportado do Zig
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-orange-100 rounded-full text-orange-600">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-lg mt-2">Arraste ou clique para selecionar</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  Suportamos arquivos .csv, .xls e .xlsx exportados diretamente do painel Zig
                </p>
                
                <div className="mt-4">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                      Selecionar Arquivo
                    </div>
                    <Input 
                      id="file-upload" 
                      type="file" 
                      className="hidden" 
                      accept=".csv,.xlsx,.xls" 
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </Label>
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processando vendas e atualizando estoque...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status da Integração */}
        <Card>
          <CardHeader>
            <CardTitle>Status da Integração</CardTitle>
            <CardDescription>Resumo da sincronização de dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900">Sistema Operacional</h4>
                <p className="text-sm text-green-700 mt-1">
                  A última sincronização foi realizada com sucesso. Todos os produtos foram mapeados corretamente.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Produtos Mapeados</span>
                  <span className="font-medium">98%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[98%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Confiabilidade dos Dados</span>
                  <span className="font-medium">100%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-full"></div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full justify-between" onClick={() => toast.info('Configurações de mapeamento em breve')}>
                <span>Configurar Mapeamento de Produtos</span>
                <AlertCircle className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Importações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Importações</CardTitle>
          <CardDescription>Registro de arquivos processados recentemente</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingHistory ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Carregando histórico...
                    </div>
                  </TableCell>
                </TableRow>
              ) : importHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhum upload realizado ainda
                  </TableCell>
                </TableRow>
              ) : (
                importHistory.map((item) => {
                  const date = item.uploadedAt?.seconds
                    ? new Date(item.uploadedAt.seconds * 1000).toLocaleString('pt-BR')
                    : 'N/A';

                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setViewingImport(item)}
                    >
                      <TableCell>{date}</TableCell>
                      <TableCell className="font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        {item.filename}
                      </TableCell>
                      <TableCell>Sistema</TableCell>
                      <TableCell>{item.salesCreated || 0}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.status === 'completed' ? 'Sucesso' : item.status === 'failed' ? 'Erro' : 'Processando'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          setViewingImport(item);
                        }}>
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Import Details Dialog */}
      <Dialog open={!!viewingImport} onOpenChange={(open) => !open && setViewingImport(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalhes da Importação</DialogTitle>
          </DialogHeader>
          <ImportDetails 
            data={viewingImport} 
            onClose={() => setViewingImport(null)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}