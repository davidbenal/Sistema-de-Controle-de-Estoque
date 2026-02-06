import { ShoppingCart } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface DraftCartWidgetProps {
  draftCount: number;
  onClick: () => void;
}

export function DraftCartWidget({ draftCount, onClick }: DraftCartWidgetProps) {
  if (draftCount === 0) {
    return null; // Don't show widget if no drafts
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        className="rounded-full shadow-lg h-14 px-6 bg-orange-600 hover:bg-orange-700"
        onClick={onClick}
      >
        <ShoppingCart className="h-5 w-5 mr-2" />
        <span className="font-semibold">Rascunhos</span>
        <Badge className="ml-2 bg-white text-orange-600 hover:bg-white">
          {draftCount}
        </Badge>
      </Button>
    </div>
  );
}
