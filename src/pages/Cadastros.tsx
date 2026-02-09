import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Plus, Search, Edit, Trash2, Package, Users, ChefHat, UserPlus, RefreshCw, AlertCircle, LayoutGrid, List, Copy, Send } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';
import { config } from '../config';
import { DeleteConfirmDialog } from '../components/cadastros/DeleteConfirmDialog';
import { SupplierForm } from '../components/cadastros/SupplierForm';
import { TeamForm } from '../components/cadastros/TeamForm';
import { IngredientForm } from '../components/cadastros/IngredientForm';
import { RecipeForm } from '../components/cadastros/RecipeForm';
import { IngredientDetails } from '../components/cadastros/IngredientDetails';
import { SupplierDetails } from '../components/cadastros/SupplierDetails';
import { RecipeDetails } from '../components/cadastros/RecipeDetails';
import { TeamDetails } from '../components/cadastros/TeamDetails';

export function Cadastros() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'insumos');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRecipeCategory, setSelectedRecipeCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');

  // Dados reais da API
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Loading states
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Fornecedores CRUD states
  const [showCreateSupplierDialog, setShowCreateSupplierDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Equipe CRUD states
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<any>(null);
  const [deletingTeamMember, setDeletingTeamMember] = useState<any>(null);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  // Invite dialog state
  const [inviteDialog, setInviteDialog] = useState<{ open: boolean; name: string; link: string }>({
    open: false,
    name: '',
    link: '',
  });

  // Ingredientes CRUD states
  const [showCreateIngredientDialog, setShowCreateIngredientDialog] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [deletingIngredient, setDeletingIngredient] = useState<any>(null);
  const [isDeletingIngredient, setIsDeletingIngredient] = useState(false);

  // Fichas Técnicas CRUD states
  const [showCreateRecipeDialog, setShowCreateRecipeDialog] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<any>(null);
  const [isDeletingRecipe, setIsDeletingRecipe] = useState(false);

  // Detail View states
  const [viewingIngredient, setViewingIngredient] = useState<any>(null);
  const [viewingSupplier, setViewingSupplier] = useState<any>(null);
  const [viewingRecipe, setViewingRecipe] = useState<any>(null);
  const [viewingTeamMember, setViewingTeamMember] = useState<any>(null);

  // Related data for detail views
  const [selectedSuppliers, setSelectedSuppliers] = useState<any[]>([]);
  const [supplierIngredients, setSupplierIngredients] = useState<any[]>([]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    // Carregar dados da tab ativa
    switch (activeTab) {
      case 'insumos':
        loadIngredients();
        loadSuppliers(); // Carregar fornecedores para o formulário de ingredientes
        break;
      case 'fornecedores':
        loadSuppliers();
        loadIngredients(); // Necessario para multi-select de ingredientes no fornecedor
        break;
      case 'fichas':
        loadRecipes();
        break;
      case 'equipe':
        loadTeam();
        break;
    }
  }, [activeTab]);

  const loadIngredients = async () => {
    try {
      setIsLoadingIngredients(true);
      const response = await apiFetch(config.endpoints.cadastros.ingredientes);
      const data = await response.json();

      if (data.success) {
        // Normalize Firestore snake_case to camelCase for consistent access
        const normalized = (data.ingredientes || []).map((i: any) => ({
          ...i,
          currentStock: i.current_stock ?? i.currentStock ?? 0,
          minStock: i.min_stock ?? i.minStock ?? 0,
          maxStock: i.max_stock ?? i.maxStock ?? 0,
          storageCenter: i.storage_center ?? i.storageCenter ?? '',
        }));
        setIngredients(normalized);
      } else {
        toast.error('Erro ao carregar ingredientes');
      }
    } catch (error) {
      console.error('Erro ao carregar ingredientes:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      setIsLoadingSuppliers(true);
      const response = await apiFetch(config.endpoints.cadastros.fornecedores);
      const data = await response.json();

      if (data.success) {
        setSuppliers(data.fornecedores || []);
      } else {
        toast.error('Erro ao carregar fornecedores');
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const loadRecipes = async () => {
    try {
      setIsLoadingRecipes(true);
      const response = await apiFetch(config.endpoints.cadastros.fichas);
      const data = await response.json();

      if (data.success) {
        setRecipes(data.fichas || []);
      } else {
        toast.error('Erro ao carregar fichas técnicas');
      }
    } catch (error) {
      console.error('Erro ao carregar fichas:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const loadTeam = async () => {
    try {
      setIsLoadingTeam(true);
      const response = await apiFetch(config.endpoints.cadastros.equipe);
      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.equipe || []);
      } else {
        toast.error('Erro ao carregar equipe');
      }
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setIsLoadingTeam(false);
    }
  };

  // Fornecedores CRUD handlers
  const handleCreateSupplier = async (data: any) => {
    try {
      const response = await apiFetch(config.endpoints.cadastros.fornecedores, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Fornecedor criado com sucesso');
        loadSuppliers();
        setShowCreateSupplierDialog(false);
      } else {
        toast.error(result.error || 'Erro ao criar fornecedor');
      }
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleUpdateSupplier = async (id: string, data: any) => {
    try {
      const response = await apiFetch(config.endpoints.cadastros.fornecedor(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Fornecedor atualizado');
        loadSuppliers();
        setEditingSupplier(null);
      } else {
        toast.error(result.error || 'Erro ao atualizar fornecedor');
      }
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return;

    setIsDeleting(true);
    try {
      const response = await apiFetch(config.endpoints.cadastros.fornecedor(deletingSupplier.id), {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Fornecedor deletado');
        loadSuppliers();
      } else {
        toast.error(result.error || 'Erro ao deletar fornecedor');
      }
    } catch (error) {
      console.error('Erro ao deletar fornecedor:', error);
      toast.error('Erro de conexão');
    } finally {
      setIsDeleting(false);
      setDeletingSupplier(null);
    }
  };

  // Equipe CRUD handlers
  const handleCreateTeamMember = async (data: any) => {
    try {
      const response = await apiFetch(config.endpoints.cadastros.equipe, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Membro adicionado com sucesso');
        loadTeam();
        setShowCreateTeamDialog(false);

        // Show invite link dialog if available
        if (result.inviteLink) {
          setInviteDialog({
            open: true,
            name: data.name,
            link: result.inviteLink,
          });
        }
      } else {
        toast.error(result.error || 'Erro ao adicionar membro');
      }
    } catch (error) {
      console.error('Erro ao criar membro:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleResendInvite = async (email: string, name: string) => {
    try {
      const response = await apiFetch(config.endpoints.auth.resendInvite, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      if (result.success && result.inviteLink) {
        setInviteDialog({
          open: true,
          name,
          link: result.inviteLink,
        });
      } else {
        toast.error(result.error || 'Erro ao reenviar convite');
      }
    } catch (error) {
      console.error('Erro ao reenviar convite:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleUpdateTeamMember = async (id: string, data: any) => {
    try {
      const response = await apiFetch(config.endpoints.cadastros.membro(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Membro atualizado');
        loadTeam();
        setEditingTeamMember(null);
      } else {
        toast.error(result.error || 'Erro ao atualizar membro');
      }
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleDeleteTeamMember = async () => {
    if (!deletingTeamMember) return;

    setIsDeletingTeam(true);
    try {
      const response = await apiFetch(config.endpoints.cadastros.membro(deletingTeamMember.id), {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Membro removido da equipe');
        loadTeam();
      } else {
        toast.error(result.error || 'Erro ao remover membro');
      }
    } catch (error) {
      console.error('Erro ao deletar membro:', error);
      toast.error('Erro de conexão');
    } finally {
      setIsDeletingTeam(false);
      setDeletingTeamMember(null);
    }
  };

  // Ingredientes CRUD handlers
  const handleCreateIngredient = async (data: any) => {
    try {
      const response = await apiFetch(config.endpoints.cadastros.ingredientes, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Ingrediente criado com sucesso');
        loadIngredients();
        setShowCreateIngredientDialog(false);
      } else {
        toast.error(result.error || 'Erro ao criar ingrediente');
      }
    } catch (error) {
      console.error('Erro ao criar ingrediente:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleUpdateIngredient = async (id: string, data: any) => {
    try {
      const response = await apiFetch(config.endpoints.cadastros.ingrediente(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Ingrediente atualizado');
        loadIngredients();
        setEditingIngredient(null);
      } else {
        toast.error(result.error || 'Erro ao atualizar ingrediente');
      }
    } catch (error) {
      console.error('Erro ao atualizar ingrediente:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleDeleteIngredient = async () => {
    if (!deletingIngredient) return;

    setIsDeletingIngredient(true);
    try {
      const response = await apiFetch(config.endpoints.cadastros.ingrediente(deletingIngredient.id), {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Ingrediente removido');
        loadIngredients();
      } else {
        toast.error(result.error || 'Erro ao remover ingrediente');
      }
    } catch (error) {
      console.error('Erro ao deletar ingrediente:', error);
      toast.error('Erro de conexão');
    } finally {
      setIsDeletingIngredient(false);
      setDeletingIngredient(null);
    }
  };

  // Fichas Técnicas CRUD handlers
  const handleCreateRecipe = async (data: any) => {
    try {
      const response = await apiFetch(config.endpoints.cadastros.fichasTecnicas, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Ficha técnica criada com sucesso');
        loadRecipes();
        setShowCreateRecipeDialog(false);
      } else {
        toast.error(result.error || 'Erro ao criar ficha técnica');
      }
    } catch (error) {
      console.error('Erro ao criar ficha técnica:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleUpdateRecipe = async (id: string, data: any) => {
    try {
      const response = await apiFetch(config.endpoints.cadastros.fichaTecnica(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Ficha técnica atualizada');
        loadRecipes();
        setEditingRecipe(null);
      } else {
        toast.error(result.error || 'Erro ao atualizar ficha técnica');
      }
    } catch (error) {
      console.error('Erro ao atualizar ficha técnica:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleDeleteRecipe = async () => {
    if (!deletingRecipe) return;

    setIsDeletingRecipe(true);
    try {
      const response = await apiFetch(config.endpoints.cadastros.fichaTecnica(deletingRecipe.id), {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Ficha técnica removida');
        loadRecipes();
      } else {
        toast.error(result.error || 'Erro ao remover ficha técnica');
      }
    } catch (error) {
      console.error('Erro ao deletar ficha técnica:', error);
      toast.error('Erro de conexão');
    } finally {
      setIsDeletingRecipe(false);
      setDeletingRecipe(null);
    }
  };

  // View Detail handlers
  const handleViewIngredient = async (ingredient: any) => {
    setViewingIngredient(ingredient);

    // Carregar fornecedores relacionados (supplier_ids array ou supplier_id legado)
    const supplierIds: string[] = ingredient.supplier_ids || (ingredient.supplier_id ? [ingredient.supplier_id] : []);
    if (supplierIds.length > 0) {
      try {
        const results = await Promise.all(
          supplierIds.map(id => apiFetch(config.endpoints.cadastros.fornecedor(id)).then(r => r.json()))
        );
        const loaded = results
          .filter(r => r.success && r.fornecedor)
          .map(r => r.fornecedor);
        setSelectedSuppliers(loaded);
      } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        setSelectedSuppliers([]);
      }
    } else {
      setSelectedSuppliers([]);
    }
  };

  const handleViewSupplier = (supplier: any) => {
    const supplied = ingredients.filter(i =>
      i.supplier_ids?.includes(supplier.id) || i.supplier_id === supplier.id
    );
    setSupplierIngredients(supplied);
    setViewingSupplier(supplier);
  };

  const handleViewRecipe = (recipe: any) => {
    setViewingRecipe(recipe);
  };

  const handleViewTeamMember = (member: any) => {
    setViewingTeamMember(member);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
    setSearchTerm(''); // Limpar busca ao trocar de tab
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'perecivel':
      case 'perecíveis':
      case 'pereciveis':
        return 'bg-red-100 text-red-700';
      case 'nao-perecivel':
      case 'não-perecível':
      case 'não perecível':
        return 'bg-green-100 text-green-700';
      case 'bebida':
      case 'bebidas':
        return 'bg-blue-100 text-blue-700';
      case 'limpeza':
        return 'bg-purple-100 text-purple-700';
      case 'descartavel':
      case 'descartável':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryLabel = (category: string) => {
    if (!category) return 'Sem categoria';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === 'all' || ing.category === selectedCategory)
  );

  const filteredSuppliers = suppliers.filter((sup) =>
    sup.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecipes = recipes.filter((rec) =>
    rec.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedRecipeCategory === 'all' || rec.category === selectedRecipeCategory)
  );

  const filteredTeam = teamMembers.filter((member) =>
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cadastros</h1>
        <p className="text-gray-500 mt-1">Gerencie insumos, fornecedores, fichas técnicas e equipe</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insumos">
            <Package className="w-4 h-4 mr-2" />
            Insumos
          </TabsTrigger>
          <TabsTrigger value="fornecedores">
            <Users className="w-4 h-4 mr-2" />
            Fornecedores
          </TabsTrigger>
          <TabsTrigger value="fichas">
            <ChefHat className="w-4 h-4 mr-2" />
            Fichas Técnicas
          </TabsTrigger>
          <TabsTrigger value="equipe">
            <UserPlus className="w-4 h-4 mr-2" />
            Equipe
          </TabsTrigger>
        </TabsList>

        {/* TAB: INSUMOS */}
        <TabsContent value="insumos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Insumos</CardTitle>
                  <CardDescription>
                    {isLoadingIngredients ? 'Carregando...' : `${filteredIngredients.length} insumos cadastrados`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadIngredients}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button size="sm" onClick={() => setShowCreateIngredientDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Insumo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nome..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    <SelectItem value="perecivel">Perecíveis</SelectItem>
                    <SelectItem value="nao-perecivel">Não Perecíveis</SelectItem>
                    <SelectItem value="bebida">Bebidas</SelectItem>
                    <SelectItem value="limpeza">Limpeza</SelectItem>
                    <SelectItem value="descartavel">Descartáveis</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Ingredientes */}
              {isLoadingIngredients ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : filteredIngredients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
                  <p>Nenhum insumo encontrado</p>
                  {searchTerm && <p className="text-sm">Tente ajustar os filtros de busca</p>}
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredIngredients.map((ingredient) => (
                    <Card
                      key={ingredient.id}
                      className="hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handleViewIngredient(ingredient)}
                    >
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{ingredient.name}</h3>
                              <Badge className={`mt-2 ${getCategoryColor(ingredient.category)}`}>
                                {getCategoryLabel(ingredient.category)}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Estoque Atual:</span>
                              <span className="font-medium">{(ingredient.currentStock ?? ingredient.current_stock ?? 0)} {ingredient.unit}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Estoque Mínimo:</span>
                              <span className="font-medium">{(ingredient.minStock ?? ingredient.min_stock ?? 0)} {ingredient.unit}</span>
                            </div>
                            {ingredient.price && (
                              <div className="flex justify-between">
                                <span>Preço:</span>
                                <span className="font-medium">R$ {Number(ingredient.price || 0).toFixed(2)}</span>
                              </div>
                            )}
                          </div>

                          {(ingredient.currentStock ?? ingredient.current_stock ?? 0) < (ingredient.minStock ?? ingredient.min_stock ?? 0) && (
                            <Badge variant="destructive" className="w-full justify-center">
                              Estoque Baixo
                            </Badge>
                          )}

                          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setEditingIngredient(ingredient)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingIngredient(ingredient)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-semibold text-sm">Nome</th>
                        <th className="text-left p-4 font-semibold text-sm">Categoria</th>
                        <th className="text-left p-4 font-semibold text-sm">Estoque Atual</th>
                        <th className="text-left p-4 font-semibold text-sm">Estoque Mínimo</th>
                        <th className="text-left p-4 font-semibold text-sm">Preço</th>
                        <th className="text-left p-4 font-semibold text-sm">Status</th>
                        <th className="text-left p-4 font-semibold text-sm">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIngredients.map((ingredient) => (
                        <tr key={ingredient.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleViewIngredient(ingredient)}>
                          <td className="p-4 font-medium">{ingredient.name}</td>
                          <td className="p-4">
                            <Badge className={getCategoryColor(ingredient.category)}>
                              {getCategoryLabel(ingredient.category)}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {(ingredient.currentStock ?? ingredient.current_stock ?? 0)} {ingredient.unit}
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {(ingredient.minStock ?? ingredient.min_stock ?? 0)} {ingredient.unit}
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {ingredient.price ? `R$ ${ingredient.price.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-4">
                            {(ingredient.currentStock ?? ingredient.current_stock ?? 0) < (ingredient.minStock ?? ingredient.min_stock ?? 0) ? (
                              <Badge variant="destructive">Estoque Baixo</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700">OK</Badge>
                            )}
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingIngredient(ingredient)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingIngredient(ingredient)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog Criar Ingrediente */}
          <Dialog open={showCreateIngredientDialog} onOpenChange={setShowCreateIngredientDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Ingrediente</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar um novo ingrediente
                </DialogDescription>
              </DialogHeader>
              <IngredientForm
                suppliers={suppliers}
                onSave={handleCreateIngredient}
                onCancel={() => setShowCreateIngredientDialog(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Dialog Editar Ingrediente */}
          <Dialog open={!!editingIngredient} onOpenChange={(open) => !open && setEditingIngredient(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Ingrediente</DialogTitle>
                <DialogDescription>
                  Atualize os dados do ingrediente
                </DialogDescription>
              </DialogHeader>
              <IngredientForm
                initialData={editingIngredient}
                suppliers={suppliers}
                onSave={(data) => handleUpdateIngredient(editingIngredient.id, data)}
                onCancel={() => setEditingIngredient(null)}
              />
            </DialogContent>
          </Dialog>

          {/* Dialog Deletar Ingrediente */}
          <DeleteConfirmDialog
            open={!!deletingIngredient}
            onOpenChange={(open) => !open && setDeletingIngredient(null)}
            onConfirm={handleDeleteIngredient}
            title="Remover Ingrediente"
            description={`Tem certeza que deseja remover o ingrediente "${deletingIngredient?.name}"? Esta ação não pode ser desfeita.`}
            isDeleting={isDeletingIngredient}
          />
        </TabsContent>

        {/* TAB: FORNECEDORES */}
        <TabsContent value="fornecedores" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fornecedores</CardTitle>
                  <CardDescription>
                    {isLoadingSuppliers ? 'Carregando...' : `${filteredSuppliers.length} fornecedores cadastrados`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadSuppliers}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button size="sm" onClick={() => setShowCreateSupplierDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Fornecedor
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar fornecedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isLoadingSuppliers ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
                  <p>Nenhum fornecedor encontrado</p>
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredSuppliers.map((supplier) => (
                    <Card
                      key={supplier.id}
                      className="hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handleViewSupplier(supplier)}
                    >
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <h3 className="font-semibold text-lg">{supplier.name}</h3>
                          <div className="space-y-2 text-sm text-gray-600">
                            {supplier.contact && (
                              <div className="flex justify-between">
                                <span>Contato:</span>
                                <span className="font-medium">{supplier.contact}</span>
                              </div>
                            )}
                            {supplier.delivery_time !== undefined && (
                              <div className="flex justify-between">
                                <span>Tempo de Entrega:</span>
                                <span className="font-medium">{supplier.delivery_time} dias</span>
                              </div>
                            )}
                            {supplier.payment_terms && (
                              <div className="flex justify-between">
                                <span>Pagamento:</span>
                                <span className="font-medium">{supplier.payment_terms}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setEditingSupplier(supplier)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeletingSupplier(supplier)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-semibold text-sm">Nome</th>
                        <th className="text-left p-4 font-semibold text-sm">Contato</th>
                        <th className="text-left p-4 font-semibold text-sm">Tempo de Entrega</th>
                        <th className="text-left p-4 font-semibold text-sm">Pagamento</th>
                        <th className="text-right p-4 font-semibold text-sm">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuppliers.map((supplier) => (
                        <tr key={supplier.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleViewSupplier(supplier)}>
                          <td className="p-4 font-medium">{supplier.name}</td>
                          <td className="p-4 text-sm text-gray-600">{supplier.contact || '-'}</td>
                          <td className="p-4 text-sm text-gray-600">
                            {supplier.delivery_time !== undefined ? `${supplier.delivery_time} dias` : '-'}
                          </td>
                          <td className="p-4 text-sm text-gray-600">{supplier.payment_terms || '-'}</td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingSupplier(supplier)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeletingSupplier(supplier)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog Criar Fornecedor */}
          <Dialog open={showCreateSupplierDialog} onOpenChange={setShowCreateSupplierDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Fornecedor</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo fornecedor
                </DialogDescription>
              </DialogHeader>
              <SupplierForm
                onSave={(data) => handleCreateSupplier(data)}
                onCancel={() => setShowCreateSupplierDialog(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Dialog Editar Fornecedor */}
          {editingSupplier && (
            <Dialog open={!!editingSupplier} onOpenChange={() => setEditingSupplier(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Fornecedor</DialogTitle>
                  <DialogDescription>
                    Atualize as informações do fornecedor
                  </DialogDescription>
                </DialogHeader>
                <SupplierForm
                  initialData={{
                    name: editingSupplier.name,
                    contact: editingSupplier.contact,
                    deliveryTime: editingSupplier.delivery_time,
                    paymentTerms: editingSupplier.payment_terms,
                  }}
                  onSave={(data) => handleUpdateSupplier(editingSupplier.id, data)}
                  onCancel={() => setEditingSupplier(null)}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Dialog Deletar Fornecedor */}
          <DeleteConfirmDialog
            open={!!deletingSupplier}
            onOpenChange={() => setDeletingSupplier(null)}
            entityName={deletingSupplier?.name || ''}
            entityType="fornecedor"
            onConfirm={handleDeleteSupplier}
            isLoading={isDeleting}
          />
        </TabsContent>

        {/* TAB: FICHAS TÉCNICAS */}
        <TabsContent value="fichas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fichas Técnicas</CardTitle>
                  <CardDescription>
                    {isLoadingRecipes ? 'Carregando...' : `${filteredRecipes.length} fichas cadastradas`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadRecipes}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button size="sm" onClick={() => setShowCreateRecipeDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Ficha Técnica
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar ficha..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isLoadingRecipes ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
                  <p>Nenhuma ficha técnica encontrada</p>
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredRecipes.map((recipe) => (
                    <Card
                      key={recipe.id}
                      className="hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handleViewRecipe(recipe)}
                    >
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <h3 className="font-semibold text-lg">{recipe.name}</h3>
                          {recipe.category && (
                            <Badge variant="outline">{getCategoryLabel(recipe.category)}</Badge>
                          )}
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Porções: {recipe.portions || 1}</p>
                            {recipe.suggestedPrice && (
                              <p>Preço sugerido: R$ {Number(recipe.suggestedPrice || 0).toFixed(2)}</p>
                            )}
                          </div>
                          {recipe.notes && (
                            <p className="text-xs text-amber-600 italic">{recipe.notes}</p>
                          )}
                          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setEditingRecipe(recipe)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingRecipe(recipe)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-semibold text-sm">Nome</th>
                        <th className="text-left p-4 font-semibold text-sm">Categoria</th>
                        <th className="text-left p-4 font-semibold text-sm">Porções</th>
                        <th className="text-left p-4 font-semibold text-sm">Preço Sugerido</th>
                        <th className="text-left p-4 font-semibold text-sm">Status</th>
                        <th className="text-left p-4 font-semibold text-sm">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecipes.map((recipe) => (
                        <tr key={recipe.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleViewRecipe(recipe)}>
                          <td className="p-4 font-medium">{recipe.name}</td>
                          <td className="p-4">
                            {recipe.category && (
                              <Badge variant="outline">{getCategoryLabel(recipe.category)}</Badge>
                            )}
                          </td>
                          <td className="p-4 text-sm text-gray-600">{recipe.portions || 1}</td>
                          <td className="p-4 text-sm text-gray-600">
                            {recipe.suggestedPrice ? `R$ ${recipe.suggestedPrice.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-4">
                            {recipe.notes ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700">Incompleta</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700">Completa</Badge>
                            )}
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingRecipe(recipe)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingRecipe(recipe)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog Criar Ficha Técnica */}
          <Dialog open={showCreateRecipeDialog} onOpenChange={setShowCreateRecipeDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Ficha Técnica</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar uma nova ficha técnica
                </DialogDescription>
              </DialogHeader>
              <RecipeForm
                ingredients={ingredients}
                onSave={handleCreateRecipe}
                onCancel={() => setShowCreateRecipeDialog(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Dialog Editar Ficha Técnica */}
          <Dialog open={!!editingRecipe} onOpenChange={(open) => !open && setEditingRecipe(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Ficha Técnica</DialogTitle>
                <DialogDescription>
                  Atualize os dados da ficha técnica
                </DialogDescription>
              </DialogHeader>
              <RecipeForm
                initialData={editingRecipe}
                ingredients={ingredients}
                onSave={(data) => handleUpdateRecipe(editingRecipe.id, data)}
                onCancel={() => setEditingRecipe(null)}
              />
            </DialogContent>
          </Dialog>

          {/* Dialog Deletar Ficha Técnica */}
          <DeleteConfirmDialog
            open={!!deletingRecipe}
            onOpenChange={(open) => !open && setDeletingRecipe(null)}
            onConfirm={handleDeleteRecipe}
            title="Remover Ficha Técnica"
            description={`Tem certeza que deseja remover a ficha técnica "${deletingRecipe?.name}"? Esta ação não pode ser desfeita.`}
            isDeleting={isDeletingRecipe}
          />
        </TabsContent>

        {/* TAB: EQUIPE */}
        <TabsContent value="equipe" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Equipe</CardTitle>
                  <CardDescription>
                    {isLoadingTeam ? 'Carregando...' : `${filteredTeam.length} membros cadastrados`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadTeam}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button size="sm" onClick={() => setShowCreateTeamDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Membro
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar membro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isLoadingTeam ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : filteredTeam.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
                  <p>Nenhum membro cadastrado ainda</p>
                  <p className="text-sm mt-2">Clique em "Novo Membro" para adicionar</p>
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredTeam.map((member) => (
                    <Card
                      key={member.id}
                      className="hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handleViewTeamMember(member)}
                    >
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <h3 className="font-semibold text-lg">{member.name}</h3>
                          <div className="space-y-2 text-sm text-gray-600">
                            {member.email && (
                              <div className="flex justify-between">
                                <span>Email:</span>
                                <span className="font-medium">{member.email}</span>
                              </div>
                            )}
                            {member.role && (
                              <div className="flex justify-between">
                                <span>Função:</span>
                                <Badge variant="outline">{member.role}</Badge>
                              </div>
                            )}
                            {member.sector && (
                              <div className="flex justify-between">
                                <span>Setor:</span>
                                <span className="font-medium">{member.sector}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setEditingTeamMember(member)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Re-enviar Convite"
                              onClick={() => handleResendInvite(member.email, member.name)}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeletingTeamMember(member)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-semibold text-sm">Nome</th>
                        <th className="text-left p-4 font-semibold text-sm">Email</th>
                        <th className="text-left p-4 font-semibold text-sm">Função</th>
                        <th className="text-left p-4 font-semibold text-sm">Setor</th>
                        <th className="text-right p-4 font-semibold text-sm">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeam.map((member) => (
                        <tr key={member.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleViewTeamMember(member)}>
                          <td className="p-4 font-medium">{member.name}</td>
                          <td className="p-4 text-sm text-gray-600">{member.email || '-'}</td>
                          <td className="p-4">
                            {member.role && (
                              <Badge variant="outline">{member.role}</Badge>
                            )}
                          </td>
                          <td className="p-4 text-sm text-gray-600">{member.sector || '-'}</td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingTeamMember(member)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Re-enviar Convite"
                                onClick={() => handleResendInvite(member.email, member.name)}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeletingTeamMember(member)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog Criar Membro */}
          <Dialog open={showCreateTeamDialog} onOpenChange={setShowCreateTeamDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Membro da Equipe</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo colaborador
                </DialogDescription>
              </DialogHeader>
              <TeamForm
                onSave={(data) => handleCreateTeamMember(data)}
                onCancel={() => setShowCreateTeamDialog(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Dialog Editar Membro */}
          {editingTeamMember && (
            <Dialog open={!!editingTeamMember} onOpenChange={() => setEditingTeamMember(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Membro da Equipe</DialogTitle>
                  <DialogDescription>
                    Atualize as informações do colaborador
                  </DialogDescription>
                </DialogHeader>
                <TeamForm
                  initialData={editingTeamMember}
                  onSave={(data) => handleUpdateTeamMember(editingTeamMember.id, data)}
                  onCancel={() => setEditingTeamMember(null)}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Dialog Deletar Membro */}
          <DeleteConfirmDialog
            open={!!deletingTeamMember}
            onOpenChange={() => setDeletingTeamMember(null)}
            entityName={deletingTeamMember?.name || ''}
            entityType="membro da equipe"
            onConfirm={handleDeleteTeamMember}
            isLoading={isDeletingTeam}
          />
        </TabsContent>
      </Tabs>

      {/* Detail View Dialogs */}
      {/* Ingrediente Details */}
      <Dialog open={!!viewingIngredient} onOpenChange={(open) => !open && setViewingIngredient(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <IngredientDetails
            data={viewingIngredient}
            suppliers={selectedSuppliers}
            onClose={() => setViewingIngredient(null)}
            onEdit={() => {
              setEditingIngredient(viewingIngredient);
              setViewingIngredient(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Fornecedor Details */}
      <Dialog open={!!viewingSupplier} onOpenChange={(open) => !open && setViewingSupplier(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <SupplierDetails
            data={viewingSupplier}
            suppliedIngredients={supplierIngredients}
            allIngredients={ingredients}
            onEdit={() => {
              setEditingSupplier(viewingSupplier);
              setViewingSupplier(null);
            }}
            onIngredientsUpdated={() => {
              loadIngredients();
              // Refresh supplied ingredients for this supplier
              const refreshSupplied = async () => {
                const res = await apiFetch(config.endpoints.cadastros.ingredientes);
                const data = await res.json();
                if (data.success) {
                  setIngredients(data.ingredientes || []);
                  const supplied = (data.ingredientes || []).filter((i: any) =>
                    i.supplier_ids?.includes(viewingSupplier?.id) || i.supplier_id === viewingSupplier?.id
                  );
                  setSupplierIngredients(supplied);
                }
              };
              refreshSupplied();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Ficha Técnica Details */}
      <Dialog open={!!viewingRecipe} onOpenChange={(open) => !open && setViewingRecipe(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <RecipeDetails
            data={viewingRecipe}
            onEdit={() => {
              setEditingRecipe(viewingRecipe);
              setViewingRecipe(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Equipe Details */}
      <Dialog open={!!viewingTeamMember} onOpenChange={(open) => !open && setViewingTeamMember(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <TeamDetails
            data={viewingTeamMember}
            onEdit={() => {
              setEditingTeamMember(viewingTeamMember);
              setViewingTeamMember(null);
            }}
            onResendInvite={(email: string, name: string) => {
              setViewingTeamMember(null);
              handleResendInvite(email, name);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={inviteDialog.open} onOpenChange={(open) => !open && setInviteDialog({ open: false, name: '', link: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convite Criado!</DialogTitle>
            <DialogDescription>
              Compartilhe este link com {inviteDialog.name} para que possa definir sua senha e acessar o sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              readOnly
              value={inviteDialog.link}
              className="font-mono text-sm"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setInviteDialog({ open: false, name: '', link: '' })}
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(inviteDialog.link);
                  toast.success('Link copiado para a area de transferencia');
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
