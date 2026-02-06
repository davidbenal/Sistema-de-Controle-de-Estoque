import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Plus,
  ShoppingCart,
  PackageCheck,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { config } from '../config';
import { useAuth } from '../context/AuthContext';
import { PurchaseOrderDetails } from '../components/operacoes/PurchaseOrderDetails';
import { ReceiptDetails } from '../components/operacoes/ReceiptDetails';
import { InventoryDetails } from '../components/operacoes/InventoryDetails';
import { PurchaseOrderForm } from '../components/operacoes/PurchaseOrderForm';
import { StartInventoryCountForm } from '../components/operacoes/StartInventoryCountForm';
import { StockTable } from '../components/operacoes/StockTable';
import { StockFiltersComponent, type StockFilters } from '../components/operacoes/StockFilters';
import { AddToOrderModal, AddToOrderData } from '../components/operacoes/AddToOrderModal';
import { DraftCartWidget } from '../components/operacoes/DraftCartWidget';
import { DraftOrderCard } from '../components/operacoes/DraftOrderCard';
import { FinalizeDraftModal, FinalizationData } from '../components/operacoes/FinalizeDraftModal';

export function Operacoes() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCenter, setSelectedCenter] = useState('all');

  // State for Tabs
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pedidos');

  // State for Detail Views
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  const [viewingInventory, setViewingInventory] = useState<any>(null);

  // Data state
  const [purchases, setPurchases] = useState<any[]>([]);
  const [receivings, setReceivings] = useState<any[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Loading states
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
  const [isLoadingReceivings, setIsLoadingReceivings] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);

  // Dialog states
  const [showCreateOrderDialog, setShowCreateOrderDialog] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [showStartInventoryDialog, setShowStartInventoryDialog] = useState(false);
  const [isStartingInventory, setIsStartingInventory] = useState(false);

  // Ingredients data
  const [ingredients, setIngredients] = useState<any[]>([]);

  // Stock data and filters
  const [stockData, setStockData] = useState<any[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [stockFilters, setStockFilters] = useState<StockFilters>({
    search: '',
    status: '',
    category: '',
    supplier: '',
    storageCenter: '',
  });
  const [showStockFilters, setShowStockFilters] = useState(false);

  // Draft orders state
  const [draftOrders, setDraftOrders] = useState<any[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [showAddToOrderModal, setShowAddToOrderModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [showFinalizeDraftModal, setShowFinalizeDraftModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all, draft, pending, received

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    loadSuppliers();
    loadIngredients();
  }, []);

  useEffect(() => {
    if (activeTab === 'pedidos') {
      loadPurchases();
      loadDraftOrders();
    } else if (activeTab === 'recebimentos') {
      loadReceivings();
    } else if (activeTab === 'estoque') {
      loadCurrentStock();
      loadDraftOrders(); // Load drafts to show widget count
    }
  }, [activeTab, stockFilters]);

  const loadSuppliers = async () => {
    try {
      setIsLoadingSuppliers(true);
      const response = await fetch(config.endpoints.cadastros.fornecedores);
      const result = await response.json();
      if (result.success) {
        setSuppliers(result.fornecedores || []); // API retorna "fornecedores", não "data"
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const loadIngredients = async () => {
    try {
      setIsLoadingIngredients(true);
      const response = await fetch(config.endpoints.cadastros.ingredientes);
      const result = await response.json();
      if (result.success) {
        setIngredients(result.ingredientes || []);
      }
    } catch (error) {
      console.error('Erro ao carregar ingredientes:', error);
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  const loadCurrentStock = async () => {
    try {
      setIsLoadingStock(true);
      const params = new URLSearchParams();

      if (stockFilters.storageCenter) params.append('storage_center', stockFilters.storageCenter);
      if (stockFilters.category) params.append('category', stockFilters.category);
      if (stockFilters.status) params.append('status', stockFilters.status);
      if (stockFilters.supplier) params.append('supplier_id', stockFilters.supplier);

      const url = `${config.endpoints.estoque.current}?${params.toString()}`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        let allIngredients = result.data.all_ingredients || [];

        // Client-side filtering for search
        if (stockFilters.search) {
          const searchLower = stockFilters.search.toLowerCase();
          allIngredients = allIngredients.filter((ing: any) =>
            ing.name.toLowerCase().includes(searchLower)
          );
        }

        setStockData(allIngredients);
      }
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      toast.error('Erro ao carregar estoque atual');
    } finally {
      setIsLoadingStock(false);
    }
  };

  const loadPurchases = async () => {
    try {
      setIsLoadingPurchases(true);
      const params = new URLSearchParams();
      if (selectedSupplier !== 'all') params.append('supplierId', selectedSupplier);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`${config.endpoints.operacoes.purchases}?${params}`);
      const result = await response.json();
      if (result.success) {
        setPurchases(result.purchases || []);
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  const loadReceivings = async () => {
    try {
      setIsLoadingReceivings(true);
      const params = new URLSearchParams();
      if (selectedSupplier !== 'all') params.append('supplierId', selectedSupplier);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`${config.endpoints.operacoes.receivings}?${params}`);
      const result = await response.json();
      if (result.success) {
        setReceivings(result.receivings || []);
      }
    } catch (error) {
      console.error('Erro ao carregar recebimentos:', error);
      toast.error('Erro ao carregar recebimentos');
    } finally {
      setIsLoadingReceivings(false);
    }
  };

  const loadInventoryCounts = async () => {
    try {
      setIsLoadingInventory(true);
      const params = new URLSearchParams();
      if (selectedCenter !== 'all') params.append('storageCenter', selectedCenter);

      const response = await fetch(`${config.endpoints.operacoes.inventoryCounts}?${params}`);
      const result = await response.json();
      if (result.success) {
        setInventoryCounts(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar inventário:', error);
      toast.error('Erro ao carregar inventário');
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const loadDraftOrders = async () => {
    try {
      setIsLoadingDrafts(true);
      const params = new URLSearchParams();
      params.append('user_id', user?.id || 'anonymous'); // TODO: Get from auth context

      const response = await fetch(`${config.endpoints.estoque.draftOrders}?${params}`);
      const result = await response.json();
      if (result.success) {
        setDraftOrders(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar rascunhos:', error);
      toast.error('Erro ao carregar rascunhos');
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const handleAddToOrder = async (data: AddToOrderData) => {
    try {
      // Preparar payload removendo campos undefined
      const payload: any = {
        supplier_id: data.supplierId,
        supplier_name: data.supplierName,
        ingredient_id: data.ingredientId,
        ingredient_name: data.ingredientName,
        quantity: data.quantity,
        unit: data.unit,
        user_id: user?.id || 'anonymous', // TODO: Get from auth context
      };

      // Adicionar campos opcionais somente se tiverem valor
      if (data.unitPrice !== undefined && data.unitPrice !== null) {
        payload.unit_price = data.unitPrice;
      }
      if (data.notes) {
        payload.notes = data.notes;
      }

      const response = await fetch(config.endpoints.estoque.draftOrders, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        const action = result.data.action === 'created' ? 'criado' : 'atualizado';
        toast.success(`Rascunho ${action} com sucesso!`);
        loadDraftOrders();
      } else {
        toast.error(result.error || 'Erro ao adicionar ao rascunho');
      }
    } catch (error) {
      console.error('Erro ao adicionar ao rascunho:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Tem certeza que deseja excluir este rascunho?')) {
      return;
    }

    try {
      const response = await fetch(config.endpoints.estoque.draftOrder(draftId), {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Rascunho excluído com sucesso!');
        loadDraftOrders();
      } else {
        toast.error(result.error || 'Erro ao excluir rascunho');
      }
    } catch (error) {
      console.error('Erro ao excluir rascunho:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleEditDraft = (draftId: string) => {
    // TODO: Implement edit functionality
    toast.info('Funcionalidade de edição será implementada em breve');
  };

  const handleFinalizeDraft = (draft: any) => {
    setSelectedDraft(draft);
    setShowFinalizeDraftModal(true);
  };

  const handleConfirmFinalization = async (data: FinalizationData) => {
    try {
      const response = await fetch(config.endpoints.estoque.finalizeDraft(data.draftId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_date: data.orderDate,
          expected_delivery: data.expectedDelivery,
          notes: data.notes,
          items: data.items, // Enviar items atualizados com preços
          user_id: user?.id || 'anonymous', // TODO: Get from auth context
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Pedido criado com sucesso!');
        loadPurchases();
        loadReceivings();
        loadDraftOrders();
        setShowFinalizeDraftModal(false);
        setSelectedDraft(null);
      } else {
        toast.error(result.error || 'Erro ao criar pedido');
      }
    } catch (error) {
      console.error('Erro ao finalizar rascunho:', error);
      toast.error('Erro de conexão');
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const handleChecklistItemUpdate = async (receivingId: string, itemIndex: number, data: any) => {
    try {
      const response = await fetch(
        config.endpoints.operacoes.updateChecklistItem(receivingId, itemIndex),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success('Item conferido com sucesso');
        // Reload the receiving to get updated values
        await loadSingleReceiving(receivingId);
      } else {
        toast.error(result.error || 'Erro ao atualizar item');
      }
    } catch (error) {
      console.error('Erro ao atualizar item do checklist:', error);
      toast.error('Erro ao atualizar item');
    }
  };

  const handleUploadInvoicePhoto = async (receivingId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        config.endpoints.operacoes.uploadReceivingPhoto(receivingId),
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success('Foto enviada com sucesso');
        // Reload the receiving
        await loadSingleReceiving(receivingId);
        return result.photoUrl;
      } else {
        toast.error(result.error || 'Erro ao enviar foto');
        return null;
      }
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao enviar foto');
      return null;
    }
  };

  const handleCompleteReceiving = async (receivingId: string, generalNotes?: string) => {
    try {
      const response = await fetch(
        config.endpoints.operacoes.completeReceiving(receivingId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id || 'anonymous', // TODO: Get from auth context
            generalNotes,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success('Recebimento completado com sucesso!');
        loadReceivings();
        setViewingReceipt(null);
      } else {
        toast.error(result.error || 'Erro ao completar recebimento');
      }
    } catch (error) {
      console.error('Erro ao completar recebimento:', error);
      toast.error('Erro ao completar recebimento');
    }
  };

  const handleCreateOrder = async (data: any) => {
    try {
      setIsCreatingOrder(true);
      const response = await fetch(config.endpoints.operacoes.purchases, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          createdBy: user?.id || 'anonymous', // TODO: Get from auth context
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Pedido criado com sucesso! Recebimento gerado automaticamente.');
        loadPurchases();
        loadReceivings();
        setShowCreateOrderDialog(false);
      } else {
        toast.error(result.error || 'Erro ao criar pedido');
      }
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast.error('Erro de conexão');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleStartInventory = async (data: any) => {
    try {
      setIsStartingInventory(true);

      // Calcular diferenças antes de enviar
      const itemsWithDifferences = data.items.map((item: any) => ({
        ingredient_id: item.ingredientId,
        ingredient_name: item.ingredientName,
        system_qty: item.systemQty,
        counted_qty: item.countedQty,
        difference: item.countedQty - item.systemQty,
        unit: item.unit,
        notes: item.notes,
      }));

      const payload = {
        count_type: data.countType,
        storage_center: data.storageCenter,
        counted_by: data.countedBy || user?.id || 'anonymous',
        notes: data.notes,
        items: itemsWithDifferences,
      };

      const response = await fetch(config.endpoints.operacoes.inventoryCounts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Contagem de inventário iniciada com sucesso!');
        loadInventoryCounts();
        setShowStartInventoryDialog(false);
      } else {
        toast.error(result.error || 'Erro ao iniciar contagem');
      }
    } catch (error) {
      console.error('Erro ao iniciar inventário:', error);
      toast.error('Erro de conexão');
    } finally {
      setIsStartingInventory(false);
    }
  };

  const loadSingleReceiving = async (receivingId: string) => {
    try {
      const response = await fetch(config.endpoints.operacoes.receiving(receivingId));
      const result = await response.json();
      if (result.success && result.data) {
        setViewingReceipt(result.data);
        // Also update in the list
        setReceivings(prev =>
          prev.map(r => (r.id === receivingId ? result.data : r))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar recebimento:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'awaiting_delivery':
        return 'bg-yellow-100 text-yellow-700';
      case 'received':
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'partial':
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      in_transit: 'Em Trânsito',
      partial: 'Parcial',
      received: 'Recebido',
      cancelled: 'Cancelado',
      awaiting_delivery: 'Aguardando Entrega',
      in_progress: 'Em Progresso',
      completed: 'Concluído',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Operações</h1>
        <p className="text-gray-500 mt-1">Gerencie pedidos, recebimentos e inventários</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pedidos">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="recebimentos">
            <PackageCheck className="w-4 h-4 mr-2" />
            Recebimentos
          </TabsTrigger>
          <TabsTrigger value="estoque">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Estoque
          </TabsTrigger>
        </TabsList>

        {/* Pedidos de Compra */}
        <TabsContent value="pedidos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Pedidos de Compra</CardTitle>
                  <CardDescription>
                    {statusFilter === 'draft'
                      ? `${draftOrders.length} rascunhos`
                      : statusFilter === 'all'
                      ? `${purchases.length} pedidos • ${draftOrders.length} rascunhos`
                      : `${purchases.length} pedidos registrados`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="draft">Rascunhos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="received">Recebidos</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedSupplier} onValueChange={(val) => {
                    setSelectedSupplier(val);
                    setTimeout(loadPurchases, 100);
                  }}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => setShowCreateOrderDialog(true)}
                    disabled={isLoadingSuppliers || isLoadingIngredients || isCreatingOrder}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Pedido
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Rascunhos */}
              {(statusFilter === 'draft' || statusFilter === 'all') && (
                <>
                  {isLoadingDrafts ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : draftOrders.length === 0 ? (
                    statusFilter === 'draft' && (
                      <div className="text-center py-12 text-gray-500">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum rascunho encontrado</p>
                        <p className="text-sm mt-2">
                          Adicione ingredientes ao rascunho pela tela de Estoque
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3 mb-6">
                      {statusFilter === 'all' && (
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Rascunhos</h3>
                      )}
                      <div className="grid gap-3 md:grid-cols-2">
                        {draftOrders.map((draft) => (
                          <DraftOrderCard
                            key={draft.id}
                            draft={draft}
                            onEdit={handleEditDraft}
                            onFinalize={handleFinalizeDraft}
                            onDelete={handleDeleteDraft}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Pedidos */}
              {statusFilter !== 'draft' && (
                <>
                  {statusFilter === 'all' && draftOrders.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Pedidos Confirmados</h3>
                    </div>
                  )}
                  {isLoadingPurchases ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : purchases.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum pedido encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {purchases.map((order) => (
                        <div
                          key={order.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setViewingOrder(order)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{order.supplier_name}</h3>
                                <Badge className={getStatusColor(order.status)}>
                                  {getStatusLabel(order.status)}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                                <span>Pedido: {order.order_number}</span>
                                <span>
                                  Data:{' '}
                                  {new Date(order.order_date?.seconds * 1000 || order.order_date).toLocaleDateString('pt-BR')}
                                </span>
                                <span>
                                  Entrega:{' '}
                                  {new Date(order.expected_delivery?.seconds * 1000 || order.expected_delivery).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="font-medium">
                                  Total: R$ {order.total_value?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                              <div className="mt-2 text-sm">
                                <span className="text-gray-600">Itens: {order.items?.length || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recebimentos */}
        <TabsContent value="recebimentos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Registro de Recebimentos</CardTitle>
                  <CardDescription>
                    {receivings.length} recebimentos registrados
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedSupplier} onValueChange={(val) => {
                    setSelectedSupplier(val);
                    setTimeout(loadReceivings, 100);
                  }}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={(val) => {
                    setSelectedStatus(val);
                    setTimeout(loadReceivings, 100);
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="awaiting_delivery">Aguardando</SelectItem>
                      <SelectItem value="in_progress">Em Progresso</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingReceivings ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : receivings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <PackageCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum recebimento encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivings.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setViewingReceipt(receipt)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{receipt.supplier_name}</h3>
                            <Badge className={getStatusColor(receipt.status)}>
                              {getStatusLabel(receipt.status)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            <span>
                              Data:{' '}
                              {new Date(receipt.receiving_date?.seconds * 1000 || receipt.receiving_date).toLocaleDateString('pt-BR')}
                            </span>
                            <span>Pedido: {receipt.purchase_id}</span>
                            <span className="font-medium">
                              Recebido: R$ {receipt.received_total_value?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          {receipt.adjustment_value > 0 && (
                            <div className="mt-2 text-sm text-red-600">
                              Ajuste: -R$ {receipt.adjustment_value.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estoque */}
        <TabsContent value="estoque" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Estoque Atual</CardTitle>
                  <CardDescription>
                    Visualização em tempo real de todos os ingredientes
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowStartInventoryDialog(true)}
                    disabled={isLoadingIngredients || isStartingInventory}
                  >
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Fazer Contagem Física
                  </Button>
                  <Button
                    variant={showStockFilters ? 'default' : 'outline'}
                    onClick={() => setShowStockFilters(!showStockFilters)}
                  >
                    Filtros
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showStockFilters && (
                <StockFiltersComponent
                  filters={stockFilters}
                  onFiltersChange={setStockFilters}
                  suppliers={suppliers}
                  categories={Array.from(new Set(ingredients.map(ing => ing.category || 'Outros')))}
                />
              )}

              <StockTable
                ingredients={stockData}
                isLoading={isLoadingStock}
                onAddToOrder={(ingredient) => {
                  setSelectedIngredient(ingredient);
                  // Garantir que fornecedores estejam carregados
                  if (suppliers.length === 0) {
                    loadSuppliers();
                  }
                  setShowAddToOrderModal(true);
                }}
                onViewHistory={(ingredientId) => {
                  // TODO: Implement movement history view
                  toast.info('Histórico de movimentos será implementado');
                }}
                onAdjustStock={(ingredient) => {
                  // TODO: Implement manual stock adjustment
                  toast.info('Ajuste manual de estoque será implementado');
                }}
                onViewDetails={(ingredient) => {
                  // TODO: Implement ingredient details view
                  toast.info('Visualização de detalhes será implementada');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialogs */}
      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          <PurchaseOrderDetails
            data={viewingOrder}
            onClose={() => setViewingOrder(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingReceipt} onOpenChange={(open) => !open && setViewingReceipt(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalhes do Recebimento</DialogTitle>
          </DialogHeader>
          <ReceiptDetails
            data={viewingReceipt}
            onClose={() => setViewingReceipt(null)}
            onChecklistItemUpdate={handleChecklistItemUpdate}
            onUploadPhoto={handleUploadInvoicePhoto}
            onComplete={handleCompleteReceiving}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingInventory} onOpenChange={(open) => !open && setViewingInventory(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalhes do Inventário</DialogTitle>
          </DialogHeader>
          <InventoryDetails
            data={viewingInventory}
            onClose={() => setViewingInventory(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateOrderDialog} onOpenChange={setShowCreateOrderDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Pedido de Compra</DialogTitle>
          </DialogHeader>
          <PurchaseOrderForm
            suppliers={suppliers}
            ingredients={ingredients}
            onSave={handleCreateOrder}
            onCancel={() => setShowCreateOrderDialog(false)}
            isLoading={isCreatingOrder}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showStartInventoryDialog} onOpenChange={setShowStartInventoryDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Iniciar Contagem de Inventário</DialogTitle>
          </DialogHeader>
          <StartInventoryCountForm
            ingredients={ingredients}
            onSave={handleStartInventory}
            onCancel={() => setShowStartInventoryDialog(false)}
            isLoading={isStartingInventory}
          />
        </DialogContent>
      </Dialog>

      {/* Draft Order Modals */}
      <AddToOrderModal
        ingredient={selectedIngredient}
        suppliers={suppliers}
        isLoadingSuppliers={isLoadingSuppliers}
        isOpen={showAddToOrderModal}
        onClose={() => {
          setShowAddToOrderModal(false);
          setSelectedIngredient(null);
        }}
        onSave={handleAddToOrder}
      />

      <FinalizeDraftModal
        draft={selectedDraft}
        supplier={suppliers.find(s => s.id === selectedDraft?.supplier_id) || null}
        isOpen={showFinalizeDraftModal}
        onClose={() => {
          setShowFinalizeDraftModal(false);
          setSelectedDraft(null);
        }}
        onConfirm={handleConfirmFinalization}
      />

      {/* Draft Cart Widget - Only show on Estoque tab */}
      {activeTab === 'estoque' && (
        <DraftCartWidget
          draftCount={draftOrders.length}
          onClick={() => {
            setActiveTab('pedidos');
            setStatusFilter('draft');
            setSearchParams({ tab: 'pedidos' });
          }}
        />
      )}
    </div>
  );
}
