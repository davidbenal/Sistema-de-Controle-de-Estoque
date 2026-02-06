import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Loader2, Copy, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DraftOrderItem {
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  notes?: string;
}

interface DraftOrder {
  id: string;
  supplier_id: string;
  supplier_name: string;
  items: DraftOrderItem[];
  notes?: string;
}

interface Supplier {
  id: string;
  name: string;
  delivery_time?: number;
}

interface FinalizeDraftModalProps {
  draft: DraftOrder | null;
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: FinalizationData) => Promise<void>;
}

export interface FinalizationData {
  draftId: string;
  orderDate: string;
  expectedDelivery: string;
  notes?: string;
  items: DraftOrderItem[];
}

export function FinalizeDraftModal({
  draft,
  supplier,
  isOpen,
  onClose,
  onConfirm,
}: FinalizeDraftModalProps) {
  const [items, setItems] = useState<DraftOrderItem[]>([]);
  const [orderDate, setOrderDate] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [supplierMessage, setSupplierMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (draft && isOpen) {
      setItems([...draft.items]);
      setNotes(draft.notes || '');
      setConfirmed(false);
      setSupplierMessage('');

      // Set default dates
      const today = new Date().toISOString().split('T')[0];
      setOrderDate(today);

      // Calculate expected delivery based on supplier delivery time
      const deliveryDays = supplier?.delivery_time || 7;
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
      setExpectedDelivery(deliveryDate.toISOString().split('T')[0]);
    }
  }, [draft, supplier, isOpen]);

  const handleItemPriceChange = (index: number, newPrice: string) => {
    const updatedItems = [...items];
    updatedItems[index].unit_price = newPrice ? parseFloat(newPrice) : undefined;
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      if (item.unit_price) {
        return sum + item.quantity * item.unit_price;
      }
      return sum;
    }, 0);
  };

  const hasAllPrices = () => {
    return items.every(item => item.unit_price && item.unit_price > 0);
  };

  const generateSupplierMessage = () => {
    if (!draft || !hasAllPrices()) {
      toast.error('Todos os preços devem estar preenchidos para gerar o texto');
      return;
    }

    const total = calculateTotal();
    const formattedOrderDate = new Date(orderDate).toLocaleDateString('pt-BR');
    const formattedDeliveryDate = new Date(expectedDelivery).toLocaleDateString('pt-BR');

    let message = `Pedido Restaurante Montuvia\n`;
    message += `Data: ${formattedOrderDate}\n\n`;
    message += `Fornecedor: ${draft.supplier_name}\n`;
    message += `Prazo de Entrega: ${formattedDeliveryDate}\n\n`;
    message += `ITENS SOLICITADOS:\n`;

    items.forEach((item) => {
      const subtotal = item.quantity * (item.unit_price || 0);
      message += `• ${item.ingredient_name} - ${item.quantity} ${item.unit} × R$ ${(item.unit_price || 0).toFixed(2)} = R$ ${subtotal.toFixed(2)}\n`;
    });

    message += `\nVALOR TOTAL: R$ ${total.toFixed(2)}\n\n`;

    if (notes) {
      message += `Observações: ${notes}\n\n`;
    }

    message += `Aguardamos confirmação.\n`;
    message += `Att,\nEquipe Montuvia`;

    setSupplierMessage(message);
    toast.success('Texto gerado com sucesso!');
  };

  const handleCopyMessage = () => {
    if (supplierMessage) {
      navigator.clipboard.writeText(supplierMessage);
      toast.success('Texto copiado para a área de transferência!');
    }
  };

  const handleSubmit = async () => {
    if (!draft) return;

    if (!hasAllPrices()) {
      toast.error('Todos os preços devem estar preenchidos');
      return;
    }

    if (!confirmed) {
      toast.error('Você deve confirmar que revisou os itens e preços');
      return;
    }

    try {
      setIsLoading(true);
      await onConfirm({
        draftId: draft.id,
        orderDate,
        expectedDelivery,
        notes,
        items,
      });
      toast.success('Pedido criado com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao finalizar rascunho:', error);
      toast.error('Erro ao criar pedido');
    } finally {
      setIsLoading(false);
    }
  };

  if (!draft) return null;

  const total = calculateTotal();
  const missingPrices = items.filter(item => !item.unit_price || item.unit_price === 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Pedido - {draft.supplier_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Revisão de Itens */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Revisão de Itens</h3>
            {missingPrices.length > 0 && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> {missingPrices.length} {missingPrices.length === 1 ? 'item precisa' : 'itens precisam'} de preço unitário
                </div>
              </div>
            )}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Ingrediente</th>
                    <th className="px-3 py-2 text-right font-medium">Quantidade</th>
                    <th className="px-3 py-2 text-right font-medium">Preço Unit. (R$)</th>
                    <th className="px-3 py-2 text-right font-medium">Subtotal (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{item.ingredient_name}</td>
                      <td className="px-3 py-2 text-right">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price || ''}
                          onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                          className="w-24 text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {item.unit_price
                          ? (item.quantity * item.unit_price).toFixed(2)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-gray-50 font-semibold">
                    <td className="px-3 py-3" colSpan={3}>
                      TOTAL
                    </td>
                    <td className="px-3 py-3 text-right">R$ {total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderDate">Data do Pedido</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Data de Entrega Esperada</Label>
              <Input
                id="expectedDelivery"
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observações adicionais para o pedido..."
            />
          </div>

          <Separator />

          {/* Geração de Texto */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Texto para Fornecedor</h3>
              <Button
                onClick={generateSupplierMessage}
                disabled={!hasAllPrices()}
                variant="outline"
                size="sm"
              >
                Gerar Texto
              </Button>
            </div>

            {supplierMessage ? (
              <div className="space-y-2">
                <div className="p-4 bg-gray-50 border rounded-lg">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {supplierMessage}
                  </pre>
                </div>
                <Button
                  onClick={handleCopyMessage}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Texto
                </Button>
              </div>
            ) : (
              <div className="p-4 border border-dashed rounded-lg text-center text-sm text-gray-500">
                Clique em "Gerar Texto" após preencher todos os preços
              </div>
            )}
          </div>

          <Separator />

          {/* Confirmação */}
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              />
              <Label
                htmlFor="confirm"
                className="text-sm font-normal leading-relaxed cursor-pointer"
              >
                Confirmo que revisamos os itens, preços e datas do pedido
              </Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!hasAllPrices() || !confirmed || isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando Pedido...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar e Criar Pedido
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
