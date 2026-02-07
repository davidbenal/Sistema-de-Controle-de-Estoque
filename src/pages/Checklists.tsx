import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Clock,
  Sparkles,
  User,
  LayoutTemplate,
  ArrowRight,
  Trash2,
  Loader2,
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
  const isManager = user?.role === 'administrador' || user?.role === 'gerencia';

  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const url = isManager
        ? config.endpoints.checklists.tasks
        : `${config.endpoints.checklists.tasks}?assignedTo=${user?.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setLocalTasks(data.tasks || []);
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
            fetch(config.endpoints.cadastros.equipe).then(r => r.json()),
            fetch(config.endpoints.checklists.templates).then(r => r.json()),
            fetch(`${config.endpoints.alertas.list}?status=pending`).then(r => r.json()),
          );
        }

        const results = await Promise.all(promises);

        if (isManager) {
          const [, equipeData, templatesData, alertasData] = results;
          if (equipeData?.success) setTeamMembers(equipeData.members || equipeData.equipe || []);
          if (templatesData?.success) setTemplates(templatesData.templates || []);
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

  const getAssignedTo = (task: Task) => task.assigned_to || task.assignedTo || '';

  // --- Task handlers that call API ---

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    setLocalTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, completed } : t)
    );
    try {
      await fetch(config.endpoints.checklists.task(taskId), {
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

  const handleAddTask = async (title: string, assignedTo: string) => {
    try {
      const res = await fetch(config.endpoints.checklists.tasks, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          assignedTo,
          createdBy: user?.id || '',
          origin: 'manual',
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
      const res = await fetch(config.endpoints.checklists.applyTemplate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          userId,
          createdBy: user?.id || '',
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
      await fetch(config.endpoints.checklists.task(taskId), { method: 'DELETE' });
      toast.success('Tarefa removida');
    } catch {
      setLocalTasks(prev);
      toast.error('Erro ao remover tarefa');
    }
  };

  // --- Sugestoes Automaticas baseadas em alertas REAIS ---
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

  // --- Task List Component ---
  const TaskList = ({ tasks, showAssignee = false }: { tasks: Task[]; showAssignee?: boolean }) => (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <p className="text-gray-500 text-center py-4 text-sm">Nenhuma tarefa pendente.</p>
      ) : (
        tasks.map(task => (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
              task.completed ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
            }`}
          >
            <Checkbox
              id={task.id}
              checked={task.completed}
              onCheckedChange={c => handleToggleTask(task.id, c as boolean)}
              className="mt-1"
            />
            <div className="flex-1">
              <label
                htmlFor={task.id}
                className={`text-sm font-medium cursor-pointer ${
                  task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                }`}
              >
                {task.title}
              </label>
              <div className="flex items-center gap-2 mt-1">
                {task.origin === 'template' && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1 bg-blue-50 text-blue-700 border-blue-200">
                    Rotina
                  </Badge>
                )}
                {showAssignee && (
                  <span className="text-xs text-gray-500 flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {teamMembers.find(u => u.id === getAssignedTo(task))?.name || 'Equipe'}
                  </span>
                )}
              </div>
            </div>
            {isManager && !task.completed && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={() => handleDeleteTask(task.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );

  // --- Operation View (My Tasks) ---
  if (!isManager) {
    const myTasks = localTasks;
    const pendingCount = myTasks.filter(t => !t.completed).length;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Minhas Tarefas</h1>
            <p className="text-gray-500">
              Voce tem {pendingCount} tarefas pendentes hoje
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
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
                  handleAddTask(formData.get('title') as string, user?.id || '');
                  (e.target as HTMLFormElement).reset();
                }}
              >
                <div className="py-4">
                  <Label htmlFor="taskTitle">Descricao da Tarefa</Label>
                  <Input id="taskTitle" name="title" placeholder="Ex: Limpar filtro do ar condicionado" required />
                </div>
                <DialogFooter>
                  <Button type="submit">Adicionar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            <TaskList tasks={myTasks} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Manager View (Team Management) ---
  const operationMembers = teamMembers.filter(m => m.role === 'operacao');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestao de Tarefas</h1>
        <p className="text-gray-500 mt-1">Delegue e acompanhe as atividades da equipe</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Team List */}
        <div className="lg:col-span-2 space-y-4">
          {operationMembers.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center py-8 text-sm">
                  Nenhum membro de operacao cadastrado. Cadastre a equipe em Cadastros &gt; Equipe.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {operationMembers.map(member => {
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
                                handleAddTask(formData.get('title') as string, member.id);
                                (e.target as HTMLFormElement).reset();
                              }}
                            >
                              <div className="py-4">
                                <Label>Descricao</Label>
                                <Input name="title" required placeholder="Ex: Recontar estoque de bebidas" />
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

                      <TaskList tasks={memberTasks} />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>

        {/* Right Column: Suggestions & Quick Actions */}
        <div className="space-y-6">
          {/* Sugestoes Automaticas */}
          <Card className="border-purple-100 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Sugestoes Automaticas
              </CardTitle>
              <CardDescription className="text-purple-700">
                Tarefas recomendadas baseadas em alertas ativos
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
                    {operationMembers.length > 0 && (
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
                                handleAddTask(sug.action, val);
                              }}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um colaborador" />
                                </SelectTrigger>
                                <SelectContent>
                                  {operationMembers.map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Available Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Templates Disponiveis</CardTitle>
              <CardDescription>Padroes de checklist da casa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {templates.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum template cadastrado.</p>
                ) : (
                  templates.map(tpl => (
                    <div key={tpl.id} className="p-3 bg-gray-50 rounded text-sm">
                      <span className="font-medium block">{tpl.name}</span>
                      <span className="text-xs text-gray-500 capitalize">Setor: {tpl.role}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
