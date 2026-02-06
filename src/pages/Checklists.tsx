import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  LayoutTemplate,
  ArrowRight,
  Trash2,
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
import { tasks, checklistTemplates, teamMembers, alerts } from '../data/mockData';
import { toast } from 'sonner@2.0.3';

export function Checklists() {
  const { user } = useAuth();
  const [localTasks, setLocalTasks] = useState(tasks);
  const isManager = user?.role === 'administrador' || user?.role === 'gerencia';

  // --- Funções de Manipulação de Tarefas ---

  const handleToggleTask = (taskId: string, completed: boolean) => {
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed,
              completedAt: completed ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
    if (completed) toast.success('Tarefa concluída!');
  };

  const handleAddTask = (title: string, assignedTo: string) => {
    const newTask = {
      id: `t${Date.now()}`,
      title,
      completed: false,
      assignedTo,
      dueDate: new Date().toISOString().split('T')[0],
      origin: 'manual' as const,
    };
    setLocalTasks((prev) => [...prev, newTask]);
    toast.success('Tarefa adicionada!');
  };

  const handleApplyTemplate = (templateId: string, userId: string) => {
    const template = checklistTemplates.find((t) => t.id === templateId);
    if (!template) return;

    const newTasks = template.tasks.map((taskTitle, index) => ({
      id: `t${Date.now()}-${index}`,
      title: taskTitle,
      completed: false,
      assignedTo: userId,
      dueDate: new Date().toISOString().split('T')[0],
      origin: 'template' as const,
      templateId,
    }));

    setLocalTasks((prev) => [...prev, ...newTasks]);
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const handleDeleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast.success('Tarefa removida');
  };

  // --- Sugestões de IA baseadas em alertas ---
  const aiSuggestions = alerts
    .filter((a) => !a.resolved)
    .map((alert) => {
      let suggestedAction = '';
      if (alert.type === 'estoque-minimo') suggestedAction = `Contar estoque de ${alert.message.split(' ')[0]}`;
      else if (alert.type === 'validade-proxima') suggestedAction = 'Verificar validade e descartar se necessário';
      else if (alert.type === 'divergencia-inventario') suggestedAction = 'Recontar item com divergência';
      else suggestedAction = 'Verificar situação reportada';

      return {
        id: alert.id,
        alertMsg: alert.message,
        action: suggestedAction,
      };
    });

  // --- Componente de Lista de Tarefas (Reutilizável) ---
  const TaskList = ({ tasks, showAssignee = false }: { tasks: typeof localTasks, showAssignee?: boolean }) => (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <p className="text-gray-500 text-center py-4 text-sm">Nenhuma tarefa pendente.</p>
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
              task.completed ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
            }`}
          >
            <Checkbox
              id={task.id}
              checked={task.completed}
              onCheckedChange={(c) => handleToggleTask(task.id, c as boolean)}
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
                {task.origin === 'ia' && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1 bg-purple-50 text-purple-700 border-purple-200">
                    <Sparkles className="w-2 h-2 mr-1" /> IA
                  </Badge>
                )}
                {showAssignee && (
                    <span className="text-xs text-gray-500 flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {teamMembers.find(u => u.id === task.assignedTo)?.name || 'Desconhecido'}
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

  // --- Visão da Operação (Minhas Tarefas) ---
  if (!isManager) {
    const myTasks = localTasks.filter((t) => t.assignedTo === user?.id);
    const pendingCount = myTasks.filter((t) => !t.completed).length;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Minhas Tarefas</h1>
            <p className="text-gray-500">
              Você tem {pendingCount} tarefas pendentes hoje
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
                <DialogDescription>O que você precisa fazer?</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleAddTask(formData.get('title') as string, user?.id || '');
                }}
              >
                <div className="py-4">
                  <Label htmlFor="taskTitle">Descrição da Tarefa</Label>
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

  // --- Visão da Gerência (Gestão de Equipe) ---
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Tarefas</h1>
        <p className="text-gray-500 mt-1">Delegue e acompanhe as atividades da equipe</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Lista da Equipe */}
        <div className="lg:col-span-2 space-y-4">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {teamMembers
              .filter((m) => m.role === 'operacao')
              .map((member) => {
                const memberTasks = localTasks.filter((t) => t.assignedTo === member.id);
                const completedCount = memberTasks.filter((t) => t.completed).length;
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
                          <p className="text-xs text-gray-500 capitalize">{member.position} • {member.sector}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {completedCount}/{totalCount}
                          </div>
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
                        {/* Botão de Add Manual */}
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
                              onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                handleAddTask(formData.get('title') as string, member.id);
                              }}
                            >
                              <div className="py-4">
                                <Label>Descrição</Label>
                                <Input name="title" required placeholder="Ex: Recontar estoque de bebidas" />
                              </div>
                              <DialogFooter>
                                <Button type="submit">Adicionar</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        {/* Botão de Templates */}
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
                                Selecione um conjunto padrão de tarefas para adicionar.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-3 py-4">
                              {checklistTemplates.map((tpl) => (
                                <div
                                  key={tpl.id}
                                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                  onClick={() => handleApplyTemplate(tpl.id, member.id)}
                                >
                                  <div>
                                    <p className="font-medium">{tpl.name}</p>
                                    <p className="text-xs text-gray-500">{tpl.tasks.length} tarefas</p>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-gray-400" />
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <TaskList tasks={memberTasks} />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
          </Accordion>
        </div>

        {/* Coluna Direita: Sugestões e Ações Rápidas */}
        <div className="space-y-6">
          {/* Sugestões da IA */}
          <Card className="border-purple-100 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Sugestões da IA
              </CardTitle>
              <CardDescription className="text-purple-700">
                Tarefas recomendadas baseadas no status atual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiSuggestions.length === 0 ? (
                <p className="text-sm text-purple-600">Nenhuma sugestão no momento.</p>
              ) : (
                aiSuggestions.map((sug) => (
                  <div key={sug.id} className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Motivo: {sug.alertMsg}</p>
                    <p className="font-medium text-sm text-gray-900 mb-2">{sug.action}</p>
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
                                <Select onValueChange={(val) => {
                                    handleAddTask(sug.action, val);
                                    toast.success('Tarefa delegada com sucesso!');
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um colaborador" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teamMembers.filter(m => m.role === 'operacao').map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Templates Rápidos */}
          <Card>
            <CardHeader>
              <CardTitle>Templates Disponíveis</CardTitle>
              <CardDescription>Padrões de checklist da casa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {checklistTemplates.map((tpl) => (
                    <div key={tpl.id} className="p-3 bg-gray-50 rounded text-sm">
                        <span className="font-medium block">{tpl.name}</span>
                        <span className="text-xs text-gray-500 capitalize">Setor: {tpl.role}</span>
                    </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
