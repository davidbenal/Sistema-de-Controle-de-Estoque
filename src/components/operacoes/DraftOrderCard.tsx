import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Separator } from '../ui/separator';
import { Check, MoreVertical } from 'lucide-react';

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
  created_at: any;
  items: DraftOrderItem[];
  total_value?: number;
  notes?: string;
}

interface DraftOrderCardProps {
  draft: DraftOrder;
  onEdit: (draftId: string) => void;
  onFinalize: (draft: DraftOrder) => void;
  onDelete: (draftId: string) => void;
}

export function DraftOrderCard({
  draft,
  onEdit,
  onFinalize,
  onDelete,
}: DraftOrderCardProps) {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
      const date = timestamp.seconds
        ? new Date(timestamp.seconds * 1000)
        : new Date(timestamp);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  return (
    <Card className="border-orange-300 bg-orange-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Badge variant="outline" className="bg-orange-200 text-orange-700 mb-2 border-orange-400">
              RASCUNHO
            </Badge>
            <CardTitle className="text-lg">{draft.supplier_name}</CardTitle>
            <CardDescription>
              {draft.items.length} {draft.items.length === 1 ? 'item' : 'itens'} •
              Criado em {formatDate(draft.created_at)}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(draft.id)}>
                Editar Itens
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFinalize(draft)}>
                Finalizar Pedido
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(draft.id)}
                className="text-red-600"
              >
                Excluir Rascunho
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {draft.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-900">{item.ingredient_name}</span>
              <span className="text-gray-600">
                {item.quantity} {item.unit}
                {item.unit_price && ` × R$ ${item.unit_price.toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>

        {draft.total_value && draft.total_value > 0 ? (
          <>
            <Separator className="my-4" />
            <div className="flex justify-between font-semibold">
              <span>Total Estimado:</span>
              <span>R$ {draft.total_value.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="mt-4 text-xs text-gray-600 italic">
            Adicione preços unitários para calcular o total
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => onFinalize(draft)}
        >
          <Check className="h-4 w-4 mr-2" />
          Finalizar e Enviar Pedido
        </Button>
      </CardFooter>
    </Card>
  );
}
