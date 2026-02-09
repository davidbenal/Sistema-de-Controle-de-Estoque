import { useState, useRef } from 'react';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Camera, Truck, Calendar, Package, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ReceivingChecklist } from './ReceivingChecklist';

interface ReceiptDetailsProps {
  data: any;
  onClose: () => void;
  onChecklistItemUpdate: (receivingId: string, itemIndex: number, data: any) => Promise<void>;
  onUploadPhoto: (receivingId: string, file: File) => Promise<string | null>;
  onComplete: (receivingId: string, generalNotes?: string) => Promise<void>;
}

export function ReceiptDetails({
  data,
  onClose,
  onChecklistItemUpdate,
  onUploadPhoto,
  onComplete,
}: ReceiptDetailsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!data) return null;

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Por favor, envie uma imagem JPG, PNG ou WebP');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo é muito grande. Tamanho máximo: 10MB');
      return;
    }

    try {
      setIsUploading(true);
      await onUploadPhoto(data.id, file);
    } catch (error) {
      console.error('Erro no upload:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleChecklistUpdate = async (itemIndex: number, itemData: any) => {
    await onChecklistItemUpdate(data.id, itemIndex, itemData);
  };

  const handleComplete = async () => {
    const allChecked = data.checklist?.every((item: any) => item.is_checked);
    if (!allChecked) {
      toast.error('Por favor, confira todos os itens antes de completar o recebimento');
      return;
    }

    if (!data.invoice_photo_url) {
      toast('Recebimento será completado sem foto da nota fiscal. Um alerta será criado para o gerente.', {
        duration: 4000,
      });
    }

    try {
      setIsCompleting(true);
      await onComplete(data.id, generalNotes || undefined);
    } catch (error) {
      console.error('Erro ao completar:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'awaiting_delivery':
        return 'bg-yellow-100 text-yellow-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      awaiting_delivery: 'Aguardando Entrega',
      in_progress: 'Em Progresso',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const isReadOnly = data.status === 'completed' || data.status === 'cancelled';
  const receivingDate = data.receiving_date?.seconds
    ? new Date(data.receiving_date.seconds * 1000)
    : new Date(data.receiving_date);

  // Check if all items are checked
  const allItemsChecked = data.checklist?.every((item: any) => item.is_checked) || false;
  const canComplete = !isCompleting && allItemsChecked;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Recebimento
            </h2>
            <Badge className={getStatusColor(data.status)}>
              {getStatusLabel(data.status)}
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">
            Pedido: {data.purchase_id} •{' '}
            {receivingDate.toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>

      {/* Supplier and Order Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Truck className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">Fornecedor</h3>
            </div>
            <p className="text-lg font-medium">{data.supplier_name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Package className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">Pedido Original</h3>
            </div>
            <p className="text-sm text-gray-600">ID: {data.purchase_id}</p>
            <p className="text-sm text-gray-600">
              Valor Pedido: R$ {data.ordered_total_value?.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Photo Upload Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-gray-500" />
              Foto da Nota Fiscal
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Recomendado (opcional para completar o recebimento)
            </p>
          </div>
          {!isReadOnly && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    {data.invoice_photo_url ? 'Alterar Foto' : 'Fazer Upload'}
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {data.invoice_photo_url ? (
          <div className="relative group">
            <img
              src={data.invoice_photo_url}
              alt="Nota Fiscal"
              className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(data.invoice_photo_url, '_blank')}
            />
            <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Enviada
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 text-sm">
              Nenhuma foto enviada ainda
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Checklist Section */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            Checklist de Conferência
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Confira cada item recebido individualmente
          </p>
        </div>

        {data.checklist && data.checklist.length > 0 ? (
          <ReceivingChecklist
            receivingId={data.id}
            checklist={data.checklist}
            orderedTotalValue={data.ordered_total_value || 0}
            receivedTotalValue={data.received_total_value || 0}
            adjustmentValue={data.adjustment_value || 0}
            onItemUpdate={handleChecklistUpdate}
            readonly={isReadOnly}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum item no checklist</p>
          </div>
        )}
      </div>

      {/* General Notes */}
      {!isReadOnly && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="generalNotes">Observações Gerais do Recebimento</Label>
            <Textarea
              id="generalNotes"
              placeholder="Adicione observações sobre o recebimento completo..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              rows={3}
            />
          </div>
        </>
      )}

      {/* Existing Notes */}
      {data.general_notes && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-1">Observações do Recebimento</h4>
          <p className="text-gray-700 text-sm">{data.general_notes}</p>
        </div>
      )}

      {/* Completion Info */}
      {data.status === 'completed' && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-green-800">Recebimento Completado</h4>
          </div>
          <p className="text-sm text-green-700">
            Concluído por: {data.completed_by} •{' '}
            {data.completed_at?.seconds
              ? new Date(data.completed_at.seconds * 1000).toLocaleString('pt-BR')
              : '-'}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {!isReadOnly && (
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleComplete}
            disabled={!canComplete}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Completando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Completar Recebimento
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
}
