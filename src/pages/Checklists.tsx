import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { config } from '../config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Plus,
  Sparkles,
  User,
  LayoutTemplate,
  ArrowRight,
  Trash2,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  assigned_to?: string;
  assignedTo?: string;
  due_date?: string;
  dueDate?: string;
  origin?: string;
  template_id?: string;
  completed_at?: any;
  description?: string;
  priority?: string;
  category?: string;
  origin_type?: string;
  origin_id?: string;
  completed_by?: string;
  status?: string;
  alert_id?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  position?: string;
  sector?: string;
}

interface Template {
  id: string;
  name: string;
  role: string;
  tasks: string[];
}

interface Alert {
  id: string;
  type?: string;
  alert_type?: string;
  message?: string;
  ingredient_name?: string;
  priority?: string;
  status?: string;
}

export function Checklists() {
  const { user } = useAuth();
  const userRole = user?.role || 'operacao';
  const isAdmin = userRole === 'administrador';
  const isGerente = userRole === 'gerencia';
  const isManager = isAdmin || isGerente;

  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Template creation state
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateRole, setNewTemplateRole] = useState('operacao');
  const [newTemplateTasks, setNewTemplateTasks] = useState<string[]>([]);
  const [newTemplateTaskInput, setNewTemplateTaskInput] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [newTaskPriority, setNewTaskPriority] = useState('media');

  const getAssignedTo = useCallback((task: Task) => task.assigned_to || task.assignedTo || '', []);

  const fetchTasks = useCallback(async () => {
    try {
      // Always fetch all tasks, filter client-side (avoids composite index requirement)
      const res = await apiFetch(config.endpoints.checklists.tasks);
      const data = await res.json();
      if (data.success) {
        const allTasks: Task[] = data.tasks || [];
        if (!isManager) {
          // Operations: only keep own tasks
          setLocalTasks(allTasks.filter(t => (t.assigned_to || t.assignedTo || '') === user?.id));
        } else {
          setLocalTasks(allTasks);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar tarefas:', err);
    }
  }, [isManager, user?.id]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const promises: Promise<any>[] = [fetchTasks()];

        if (isManager) {
          promises.push(
            apiFetch(config.endpoints.cadastros.equipe).then(r => r.json()),
            apiFetch(config.endpoints.checklists.templates).then(r => r.json()),
          );
        }

        // All roles get alerts (operations needs them for recommended tasks)
        promises.push(
          apiFetch(`${config.endpoints.alertas.list}?status=pending`).then(r => r.json()).catch(() => ({ success: false })),
        );

        const results = await Promise.all(promises);

        if (isManager) {
          const [, equipeData, templatesData, alertasData] = results;
          if (equipeData?.success) setTeamMembers(equipeData.members || equipeData.equipe || []);
          if (templatesData?.success) setTemplates(templatesData.templates || []);
          if (alertasData?.success) setAlerts(alertasData.alerts || []);
        } else {
          // Operations: alerts is the second result (index 1)
          const [, alertasData] = results;
          if (alertasData?.success) setAlerts(alertasData.alerts || []);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isManager, fetchTasks]);

  // --- Task handlers ---

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    setLocalTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, completed } : t)
    );
    try {
      await apiFetch(config.endpoints.checklists.task(taskId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (completed) toast.success('Tarefa concluida!');
    } catch {
      setLocalTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, completed: !completed } : t)
      );
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleAddTask = async (title: string, assignedTo: string, alertId?: string, priority?: string) => {
    try {
      const res = await apiFetch(config.endpoints.checklists.tasks, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          assignedTo,
          origin: alertId ? 'alert' : 'manual',
          alertId: alertId || undefined,
          originType: alertId ? 'alert' : undefined,
          priority: priority || 'media',
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setLocalTasks(prev => [...prev, data.task]);
        toast.success('Tarefa adicionada!');
      }
    } catch {
      toast.error('Erro ao adicionar tarefa');
    }
  };

  const handleApplyTemplate = async (templateId: string, userId: string) => {
    try {
      const res = await apiFetch(config.endpoints.checklists.applyTemplate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          userId,
        }),
      });
      const data = await res.json();
      if (data.success && data.tasks) {
        setLocalTasks(prev => [...prev, ...data.tasks]);
        const tpl = templates.find(t => t.id === templateId);
        toast.success(`Template "${tpl?.name || 'Checklist'}" aplicado!`);
      }
    } catch {
      toast.error('Erro ao aplicar template');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const prev = localTasks;
    setLocalTasks(tasks => tasks.filter(t => t.id !== taskId));
    try {
      await apiFetch(config.endpoints.checklists.task(taskId), { method: 'DELETE' });
      toast.success('Tarefa removida');
    } catch {
      setLocalTasks(prev);
      toast.error('Erro ao remover tarefa');
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim() || newTemplateTasks.length === 0) {
      toast.error('Preencha o nome e adicione pelo menos uma tarefa');
      return;
    }
    setCreatingTemplate(true);
    try {
      const res = await apiFetch(config.endpoints.checklists.templates, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          role: newTemplateRole,
          tasks: newTemplateTasks,
        }),
      });
      const data = await res.json();
      if (data.success && data.template) {
        setTemplates(prev => [...prev, data.template]);
        toast.success('Template criado!');
        setNewTemplateOpen(false);
        setNewTemplateName('');
        setNewTemplateRole('operacao');
        setNewTemplateTasks([]);
      }
    } catch {
      toast.error('Erro ao criar template');
    } finally {
      setCreatingTemplate(false);
    }
  };

  // --- Auto suggestions from alerts ---
  const autoSuggestions = alerts
    .filter(a => (a.status || '') === 'pending')
    .slice(0, 5)
    .map(alert => {
      const alertType = alert.alert_type || alert.type || '';
      const msg = alert.message || alert.ingredient_name || 'Alerta';
      let action = '';
      if (alertType === 'estoque-minimo' || alertType === 'stock_low') {
        action = `Verificar estoque de ${alert.ingredient_name || msg}`;
      } else if (alertType === 'validade-proxima') {
        action = 'Verificar validade e descartar se necessario';
      } else if (alertType === 'divergencia-inventario') {
        action = 'Recontar item com divergencia';
      } else if (alertType === 'nota_fiscal_pendente') {
        action = `Anexar nota fiscal: ${msg}`;
      } else {
        action = `Verificar: ${msg}`;
      }
      return { id: alert.id, alertMsg: msg, action };
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // --- Render helpers (plain functions, NOT component definitions) ---

  const getPriorityBorderClass = (priority?: string) => {
    switch (priority) {
      case 'alta': return 'border-l-4 border-l-red-400';
      case 'media': return 'border-l-4 border-l-yellow-400';
      case 'baixa': return 'border-l-4 border-l-green-400';
      default: return '';
    }
  };

  const getOriginLink = (originType?: string, originId?: string) => {
    if (!originType || !originId) return null;
    switch (originType) {
      case 'receiving': return `/operacoes?tab=recebimentos&id=${originId}`;
      case 'inventory_count': return `/operacoes?tab=estoque&id=${originId}`;
      case 'purchase': return `/operacoes?tab=pedidos&id=${originId}`;
      default: return null;
    }
  };

  const renderTaskList = (tasks: Task[], opts: { showAssignee?: boolean; canDelete?: boolean } = {}) => (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <p className="text-gray-500 text-center py-4 text-sm">Nenhuma tarefa pendente.</p>
      ) : (
        tasks.map(task => {
          const originLink = getOriginLink(task.origin_type, task.origin_id);
          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${getPriorityBorderClass(task.priority)} ${
                task.completed ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
              }`}
            >
              <Checkbox
                id={`task-${task.id}`}
                checked={task.completed}
                onCheckedChange={c => handleToggleTask(task.id, c as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <label
                  htmlFor={`task-${task.id}`}
                  className={`text-sm font-medium cursor-pointer ${
                    task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}
                >
                  {task.title}
                </label>
                {task.completed && task.completed_by && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Concluida por {teamMembers.find(m => m.id === task.completed_by)?.name || 'Desconhecido'}
                    {task.completed_at && ` em ${new Date(task.completed_at._seconds ? task.completed_at._seconds * 1000 : task.completed_at).toLocaleString('pt-BR')}`}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {task.origin === 'template' && !task.origin_type && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1 bg-blue-50 text-blue-700 border-blue-200">
                      Rotina
                    </Badge>
                  )}
                  {task.origin_type === 'receiving' && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1 bg-green-50 text-green-700 border-green-200">
                      Recebimento
                    </Badge>
                  )}
                  {task.origin_type === 'inventory_count' && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1 bg-blue-50 text-blue-700 border-blue-200">
                      Inventario
                    </Badge>
                  )}
                  {task.origin_type === 'purchase' && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1 bg-orange-50 text-orange-700 border-orange-200">
                      Pedido
                    </Badge>
                  )}
                  {task.origin_type === 'alert' && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1 bg-red-50 text-red-700 border-red-200">
                      Alerta
                    </Badge>
                  )}
                  {originLink && (
                    <Link to={originLink} className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                      <ExternalLink className="w-3 h-3" />
                      Ver
                    </Link>
                  )}
                  {opts.showAssignee && (
                    <span className="text-xs text-gray-500 flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      {teamMembers.find(u => u.id === getAssignedTo(task))?.name || 'Equipe'}
                    </span>
                  )}
                </div>
              </div>
              {opts.canDelete && !task.completed && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={() => handleDeleteTask(task.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const renderMemberAccordion = (title: string, members: TeamMember[]) => {
    if (members.length === 0) return null;

    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <Accordion type="single" collapsible className="w-full space-y-3">
          {members.map(member => {
            const memberTasks = localTasks.filter(t => getAssignedTo(t) === member.id);
            const completedCount = memberTasks.filter(t => t.completed).length;
            const totalCount = memberTasks.length;
            const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

            return (
              <AccordionItem key={member.id} value={member.id} className="border rounded-lg bg-white px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 w-full pr-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                      {member.name.charAt(0)}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{member.position || member.role} {member.sector ? `• ${member.sector}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{completedCount}/{totalCount}</div>
                      <div className="w-24 h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 border-t">
                  <div className="flex justify-end mb-4 gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="w-3 h-3 mr-2" />
                          Tarefa
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Tarefa para {member.name}</DialogTitle>
                        </DialogHeader>
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleAddTask(
                              formData.get('title') as string,
                              member.id,
                              undefined,
                              newTaskPriority,
                            );
                            (e.target as HTMLFormElement).reset();
                            setNewTaskPriority('media');
                          }}
                        >
                          <div className="py-4 space-y-4">
                            <div>
                              <Label>Descricao</Label>
                              <Input name="title" required placeholder="Ex: Recontar estoque de bebidas" />
                            </div>
                            <div>
                              <Label>Prioridade</Label>
                              <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="alta">Alta</SelectItem>
                                  <SelectItem value="media">Media</SelectItem>
                                  <SelectItem value="baixa">Baixa</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit">Adicionar</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {templates.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <LayoutTemplate className="w-3 h-3 mr-2" />
                            Template
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Aplicar Template para {member.name}</DialogTitle>
                            <DialogDescription>
                              Selecione um conjunto padrao de tarefas para adicionar.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-3 py-4">
                            {templates.map(tpl => (
                              <div
                                key={tpl.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleApplyTemplate(tpl.id, member.id)}
                              >
                                <div>
                                  <p className="font-medium">{tpl.name}</p>
                                  <p className="text-xs text-gray-500">{tpl.tasks?.length || 0} tarefas</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {renderTaskList(memberTasks, { canDelete: true })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  };

  const renderRecommendedTasks = (canDelegate: boolean) => (
    <Card className="border-purple-100 bg-purple-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Tarefas Recomendadas
        </CardTitle>
        <CardDescription className="text-purple-700">
          Baseadas em alertas ativos do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {autoSuggestions.length === 0 ? (
          <p className="text-sm text-purple-600">Nenhum alerta ativo no momento.</p>
        ) : (
          autoSuggestions.map(sug => (
            <div key={sug.id} className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Alerta: {sug.alertMsg}</p>
              <p className="font-medium text-sm text-gray-900 mb-2">{sug.action}</p>
              {canDelegate && teamMembers.length > 0 ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white h-8">
                      Delegar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delegar Tarefa</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <p className="text-sm font-medium">{sug.action}</p>
                      <div className="space-y-2">
                        <Label>Para quem?</Label>
                        <Select onValueChange={val => {
                          handleAddTask(sug.action, val, sug.id);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um colaborador" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : !canDelegate ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8"
                  onClick={() => handleAddTask(sug.action, user?.id || '', sug.id)}
                >
                  Adicionar as minhas tarefas
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  // --- Computed values ---
  const myTasks = localTasks.filter(t => getAssignedTo(t) === user?.id);
  const myPendingCount = myTasks.filter(t => !t.completed).length;

  // --- Inline JSX blocks for "My Tasks" card ---
  const myTasksCard = (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Minhas Tarefas</CardTitle>
            <CardDescription>{myPendingCount} pendentes</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-3 h-3 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Tarefa Pessoal</DialogTitle>
                <DialogDescription>O que voce precisa fazer?</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleAddTask(
                    formData.get('title') as string,
                    user?.id || '',
                    undefined,
                    newTaskPriority,
                  );
                  (e.target as HTMLFormElement).reset();
                  setNewTaskPriority('media');
                }}
              >
                <div className="py-4 space-y-4">
                  <div>
                    <Label htmlFor="myTaskTitle">Descricao da Tarefa</Label>
                    <Input id="myTaskTitle" name="title" placeholder="Ex: Revisar pedido do fornecedor" required />
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Adicionar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {renderTaskList(myTasks, { canDelete: isManager })}
      </CardContent>
    </Card>
  );

  // --- Inline JSX for templates section ---
  const templatesCard = (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Templates Disponiveis</CardTitle>
            <CardDescription>Padroes de checklist da casa</CardDescription>
          </div>
          <Dialog open={newTemplateOpen} onOpenChange={setNewTemplateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-3 h-3 mr-2" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Template</DialogTitle>
                <DialogDescription>
                  Defina um conjunto padrao de tarefas reutilizavel.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="templateName">Nome do Template</Label>
                  <Input
                    id="templateName"
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    placeholder="Ex: Abertura da cozinha"
                  />
                </div>
                <div>
                  <Label>Setor Alvo</Label>
                  <Select value={newTemplateRole} onValueChange={setNewTemplateRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operacao">Operacao</SelectItem>
                      <SelectItem value="gerencia">Gerencia</SelectItem>
                      <SelectItem value="administrador">Administracao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="templateTaskInput">Tarefas</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="templateTaskInput"
                      value={newTemplateTaskInput}
                      onChange={e => setNewTemplateTaskInput(e.target.value)}
                      placeholder="Descricao da tarefa"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newTemplateTaskInput.trim()) {
                          e.preventDefault();
                          setNewTemplateTasks(prev => [...prev, newTemplateTaskInput.trim()]);
                          setNewTemplateTaskInput('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!newTemplateTaskInput.trim()}
                      onClick={() => {
                        if (newTemplateTaskInput.trim()) {
                          setNewTemplateTasks(prev => [...prev, newTemplateTaskInput.trim()]);
                          setNewTemplateTaskInput('');
                        }
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  {newTemplateTasks.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {newTemplateTasks.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <span>{i + 1}. {t}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-gray-400 hover:text-red-500"
                            onClick={() => setNewTemplateTasks(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {newTemplateTasks.length === 0 && (
                    <p className="text-xs text-gray-400 mt-2">Pressione Enter ou clique + para adicionar tarefas.</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewTemplateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTemplate} disabled={creatingTemplate}>
                  {creatingTemplate && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                  Criar Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum template cadastrado.</p>
          ) : (
            templates.map(tpl => (
              <div key={tpl.id} className="p-3 bg-gray-50 rounded text-sm">
                <span className="font-medium block">{tpl.name}</span>
                <span className="text-xs text-gray-500 capitalize">Setor: {tpl.role} &middot; {tpl.tasks?.length || 0} tarefas</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  // =============================================
  // ROLE-SPECIFIC VIEWS
  // =============================================

  // --- 6.3 Operations View ---
  if (!isManager) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Minhas Tarefas</h1>
          <p className="text-gray-500">
            Voce tem {myPendingCount} tarefas pendentes
          </p>
        </div>

        {myTasksCard}

        {renderRecommendedTasks(false)}
      </div>
    );
  }

  // --- Role-based member grouping ---
  const gerenciaMembers = teamMembers.filter(m => m.role === 'gerencia');
  const adminMembers = teamMembers.filter(m => m.role === 'administrador');
  const operacaoMembers = teamMembers.filter(m => m.role === 'operacao');

  // 6.1 Admin: sections = Minhas Tarefas | Gerencia | Operacao
  // 6.2 Gerente: sections = Minhas Tarefas | Gerencia e Administracao | Operacao
  const middleSectionTitle = isAdmin ? 'Gerencia' : 'Gerencia e Administracao';
  const middleSectionMembers = isAdmin
    ? gerenciaMembers
    : [...adminMembers, ...gerenciaMembers].filter(m => m.id !== user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestao de Tarefas</h1>
        <p className="text-gray-500 mt-1">Delegue e acompanhe as atividades da equipe</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Task sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Minhas Tarefas */}
          {myTasksCard}

          {/* Middle section: Gerencia (admin view) or Gerencia e Administracao (gerente view) */}
          {middleSectionMembers.length > 0 && renderMemberAccordion(middleSectionTitle, middleSectionMembers)}

          {/* Operacao section */}
          {operacaoMembers.length > 0 ? (
            renderMemberAccordion('Operacao', operacaoMembers)
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center py-4 text-sm">
                  Nenhum membro de operacao cadastrado. Cadastre a equipe em Cadastros &gt; Equipe.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Recommendations & Templates */}
        <div className="space-y-6">
          {renderRecommendedTasks(true)}
          {templatesCard}
        </div>
      </div>
    </div>
  );
}
