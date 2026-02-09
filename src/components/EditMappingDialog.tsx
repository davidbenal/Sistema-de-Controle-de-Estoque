import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Loader2, Plus } from 'lucide-react';
import { config } from '../config';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

interface Recipe {
  id: string;
  name: string;
  category: string;
}

interface EditMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: {
    sku: string;
    productNameZig: string;
    recipeId?: string;
    recipeName?: string;
    confidence: string;
    needsReview: boolean;
  };
  onSave: () => void;
}

export function EditMappingDialog({
  open,
  onOpenChange,
  mapping,
  onSave,
}: EditMappingDialogProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(
    mapping.recipeId || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');

  useEffect(() => {
    if (open) {
      loadRecipes();
      setSelectedRecipeId(mapping.recipeId || null);
      setIsCreatingNew(false);
      setNewRecipeName('');
    }
  }, [open, mapping.recipeId]);

  const loadRecipes = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(config.endpoints.cadastros.fichas);
      const data = await response.json();
      if (data.success) {
        setRecipes(data.fichas || []);
      }
    } catch (error) {
      toast.error('Erro ao carregar receitas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndMap = async () => {
    if (!newRecipeName.trim()) {
      toast.error('Digite o nome da receita');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Criar receita
      const createRecipeRes = await apiFetch(config.endpoints.cadastros.createFicha, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRecipeName,
          createdFrom: `Mapeamento de SKU ${mapping.sku} - ${mapping.productNameZig}`
        }),
      });

      const recipeData = await createRecipeRes.json();

      if (!recipeData.success) {
        toast.error(recipeData.error || 'Erro ao criar receita');
        return;
      }

      const newRecipeId = recipeData.ficha.id;

      // 2. Criar alerta para completar ficha técnica
      await apiFetch(config.endpoints.alertas.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'incomplete_recipe',
          priority: 'medium',
          title: `Completar ficha técnica: ${newRecipeName}`,
          message: `A ficha técnica "${newRecipeName}" foi criada a partir de um mapeamento mas está incompleta. Preencha os ingredientes, porções e preços.`,
          relatedId: newRecipeId
        }),
      });

      // 3. Atualizar mapeamento
      const updateMappingRes = await fetch(
        config.endpoints.mapeamentos.update(mapping.sku),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipeId: newRecipeId,
            confidence: 'manual-confirmed',
            needsReview: false,
          }),
        }
      );

      const mappingData = await updateMappingRes.json();

      if (mappingData.success) {
        toast.success('Receita criada e mapeada com sucesso');
        onSave();
        onOpenChange(false);
      } else {
        toast.error(mappingData.error || 'Erro ao atualizar mapeamento');
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveExisting = async () => {
    if (!selectedRecipeId) {
      toast.error('Selecione uma receita');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        config.endpoints.mapeamentos.update(mapping.sku),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipeId: selectedRecipeId === 'not_controlled' ? null : selectedRecipeId,
            confidence: 'manual-confirmed',
            needsReview: false,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Mapeamento atualizado com sucesso');
        onSave();
        onOpenChange(false);
      } else {
        toast.error(data.error || 'Erro ao atualizar mapeamento');
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Revisar Mapeamento</DialogTitle>
          <DialogDescription>
            {isCreatingNew
              ? 'Digite o nome da nova receita'
              : 'Selecione a ficha técnica correspondente ao produto'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Produto do Zig */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Produto do Zig</div>
              <div className="font-medium mt-1">
                <Badge variant="outline" className="mr-2">
                  {mapping.sku}
                </Badge>
                {mapping.productNameZig}
              </div>
            </CardContent>
          </Card>

          {/* Mapeamento Atual */}
          {mapping.recipeName && !isCreatingNew && (
            <div>
              <div className="text-sm text-muted-foreground mb-2">
                Mapeamento Atual
              </div>
              <div className="flex items-center gap-2">
                <span>{mapping.recipeName}</span>
                <Badge
                  variant={mapping.needsReview ? 'destructive' : 'default'}
                  className={!mapping.needsReview ? 'bg-green-600' : ''}
                >
                  {mapping.needsReview ? 'Precisa Revisão' : 'Alta Confiança'}
                </Badge>
              </div>
            </div>
          )}

          {/* Modo: Criar Nova */}
          {isCreatingNew ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Nome da Receita
                </label>
                <Input
                  placeholder="Ex: Ceviche Jipijapa"
                  value={newRecipeName}
                  onChange={(e) => setNewRecipeName(e.target.value)}
                  disabled={isSaving}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Um alerta será criado para completar a ficha técnica depois
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingNew(false)}
                disabled={isSaving}
              >
                ← Voltar para seleção
              </Button>
            </div>
          ) : (
            /* Modo: Selecionar Existente */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Alterar para
                </label>
                <Select
                  value={selectedRecipeId || undefined}
                  onValueChange={setSelectedRecipeId}
                  disabled={isLoading || isSaving}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione uma receita..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {recipes.map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            {recipe.name}
                            {recipe.category && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({recipe.category})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                        <SelectItem value="not_controlled">
                          🚫 Não Controlado (bebida industrial)
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsCreatingNew(true)}
                disabled={isLoading || isSaving}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Nova Receita
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          {isCreatingNew ? (
            <Button onClick={handleCreateAndMap} disabled={isSaving || !newRecipeName.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar e Mapear
            </Button>
          ) : (
            <Button onClick={handleSaveExisting} disabled={isSaving || !selectedRecipeId}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
