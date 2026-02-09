import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Check, X, AlertCircle } from 'lucide-react';
import { useStorageCenters } from '../../hooks/useStorageCenters';

interface ChecklistItem {
  ingredient_id: string;
  ingredient_name: string;
  ordered_qty: number;
  received_qty: number;
  unit: string;
  unit_price: number;
  is_checked: boolean;
  is_received: boolean;
  missing_reason?: string;
  notes?: string;
  expiry_date?: string;
  batch_number?: string;
  storage_center?: string;
  checked_at?: string;
  checked_by?: string;
}

interface ReceivingChecklistProps {
  receivingId: string;
  checklist: ChecklistItem[];
  orderedTotalValue: number;
  receivedTotalValue: number;
  adjustmentValue: number;
  onItemUpdate: (itemIndex: number, data: any) => Promise<void>;
  readonly?: boolean;
}

export function ReceivingChecklist({
  receivingId,
  checklist,
  orderedTotalValue,
  receivedTotalValue,
  adjustmentValue,
  onItemUpdate,
  readonly = false,
}: ReceivingChecklistProps) {
  const { centers } = useStorageCenters();
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    isReceived: boolean;
    receivedQty: number;
    missingReason: string;
    notes: string;
    expiryDate: Date | undefined;
    batchNumber: string;
    storageCenter: string;
  }>({
    isReceived: true,
    receivedQty: 0,
    missingReason: '',
    notes: '',
    expiryDate: undefined,
    batchNumber: '',
    storageCenter: '',
  });

  const parseFirestoreDate = (val: any): Date | undefined => {
    if (!val) return undefined;
    // Firestore Timestamp object
    if (val.seconds || val._seconds) {
      return new Date((val.seconds || val._seconds) * 1000);
    }
    // Already a Date or ISO string
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const handleExpandItem = (index: number, item: ChecklistItem) => {
    setExpandedItem(index);
    // Pre-populate form with current values
    // Default to "received" for unchecked items (most common case)
    setFormData({
      isReceived: item.is_checked ? item.is_received : true,
      receivedQty: item.received_qty || item.ordered_qty,
      missingReason: item.missing_reason || '',
      notes: item.notes || '',
      expiryDate: parseFirestoreDate(item.expiry_date),
      batchNumber: item.batch_number || '',
      storageCenter: item.storage_center || '',
    });
  };

  const handleConfirm = async (itemIndex: number) => {
    const updateData = {
      receivedQty: formData.isReceived ? formData.receivedQty : 0,
      isReceived: formData.isReceived,
      missingReason: !formData.isReceived ? formData.missingReason : undefined,
      notes: formData.notes || undefined,
      expiryDate: formData.expiryDate ? formData.expiryDate.toISOString() : undefined,
      batchNumber: formData.batchNumber || undefined,
      storageCenter: formData.storageCenter,
    };

    await onItemUpdate(itemIndex, updateData);
    setExpandedItem(null);
  };

  const handleCancel = () => {
    setExpandedItem(null);
    setFormData({
      isReceived: true,
      receivedQty: 0,
      missingReason: '',
      notes: '',
      expiryDate: undefined,
      batchNumber: '',
      storageCenter: '',
    });
  };

  const getProgressStats = () => {
    const total = checklist.length;
    const checked = checklist.filter(item => item.is_checked).length;
    const received = checklist.filter(item => item.is_received).length;
    const missing = checklist.filter(item => item.is_checked && !item.is_received).length;

    return { total, checked, received, missing };
  };

  const stats = getProgressStats();

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-gray-600">Progresso</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.checked}/{stats.total}
            </p>
          </div>
          <div className="h-10 w-px bg-gray-300" />
          <div>
            <p className="text-sm text-gray-600">Recebidos</p>
            <p className="text-2xl font-bold text-green-600">{stats.received}</p>
          </div>
          <div className="h-10 w-px bg-gray-300" />
          <div>
            <p className="text-sm text-gray-600">Faltantes</p>
            <p className="text-2xl font-bold text-red-600">{stats.missing}</p>
          </div>
        </div>

        {stats.checked === stats.total && (
          <Badge className="bg-green-100 text-green-700">
            <Check className="h-3 w-3 mr-1" />
            Todos conferidos
          </Badge>
        )}
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklist.map((item, index) => (
          <Card
            key={index}
            className={`${
              item.is_checked
                ? item.is_received
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : 'hover:border-orange-300'
            } transition-all`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox checked={item.is_checked} disabled className="h-5 w-5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.ingredient_name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-gray-500">
                        Pedido: {item.ordered_qty} {item.unit}
                      </p>
                      <p className="text-sm text-gray-500">
                        R$ {(item.unit_price ?? 0).toFixed(2)}/{item.unit}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {item.is_checked ? (
                    <>
                      {item.is_received ? (
                        <Badge variant="default" className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Recebido: {item.received_qty} {item.unit}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          Não entregue
                        </Badge>
                      )}
                      <span className="text-sm font-semibold text-gray-900">
                        R$ {((item.received_qty ?? 0) * (item.unit_price ?? 0)).toFixed(2)}
                      </span>
                      {!readonly && expandedItem !== index && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExpandItem(index, item)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Editar
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExpandItem(index, item)}
                      disabled={readonly}
                      className="border-orange-300 hover:bg-orange-50"
                    >
                      Conferir
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded form for checking item */}
              {expandedItem === index && !readonly && (
                <div className="mt-4 p-4 border-t space-y-4 bg-white rounded">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Foi entregue? */}
                    <div className="space-y-2">
                      <Label>Foi entregue?</Label>
                      <Select
                        value={formData.isReceived ? 'true' : 'false'}
                        onValueChange={(val) =>
                          setFormData({ ...formData, isReceived: val === 'true' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Sim</SelectItem>
                          <SelectItem value="false">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantidade recebida (se foi entregue) */}
                    {formData.isReceived && (
                      <div className="space-y-2">
                        <Label>Quantidade Recebida ({item.unit})</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.receivedQty}
                          onChange={(e) =>
                            setFormData({ ...formData, receivedQty: parseFloat(e.target.value) })
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Motivo da falta (se não foi entregue) */}
                  {!formData.isReceived && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Motivo da Falta
                      </Label>
                      <Input
                        placeholder="Ex: Produto em falta no fornecedor"
                        value={formData.missingReason}
                        onChange={(e) =>
                          setFormData({ ...formData, missingReason: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {/* Detalhes adicionais (se foi entregue) */}
                  {formData.isReceived && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Lote */}
                        <div className="space-y-2">
                          <Label>Lote</Label>
                          <Input
                            placeholder="Número do lote"
                            value={formData.batchNumber}
                            onChange={(e) =>
                              setFormData({ ...formData, batchNumber: e.target.value })
                            }
                          />
                        </div>

                        {/* Validade */}
                        <div className="space-y-2">
                          <Label>Validade</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.expiryDate ? (
                                  format(formData.expiryDate, 'PPP', { locale: ptBR })
                                ) : (
                                  <span>Selecione a data</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 pointer-events-auto"
                              align="start"
                              side="bottom"
                              sideOffset={4}
                            >
                              <div className="p-3 bg-white rounded-lg shadow-lg border">
                                <Calendar
                                  mode="single"
                                  selected={formData.expiryDate}
                                  onSelect={(date) =>
                                    setFormData({ ...formData, expiryDate: date })
                                  }
                                  initialFocus
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Centro de armazenamento */}
                      <div className="space-y-2">
                        <Label>Centro de Armazenamento</Label>
                        <Select
                          value={formData.storageCenter}
                          onValueChange={(val) =>
                            setFormData({ ...formData, storageCenter: val })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {centers.map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Observações */}
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      placeholder="Comentários sobre este item..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleConfirm(index)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={formData.isReceived && !formData.storageCenter}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="flex-1">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Resumo Financeiro</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Valor Pedido</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {orderedTotalValue.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Valor Recebido</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {receivedTotalValue.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Ajuste (Desconto)</p>
              <p className="text-2xl font-bold text-red-600">
                -R$ {adjustmentValue.toFixed(2)}
              </p>
            </div>
          </div>

          {adjustmentValue > 0 && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-700 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">
                  Valor ajustado devido a produtos faltantes
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  O valor do recebimento foi recalculado automaticamente baseado nos produtos
                  efetivamente recebidos.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
