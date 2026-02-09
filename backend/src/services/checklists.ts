import { FastifyInstance } from 'fastify';
import { FieldValue } from 'firebase-admin/firestore';

export class ChecklistsService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async listTasks(filters: {
    assignedTo?: string;
    completed?: string;
    dueDate?: string;
  } = {}) {
    try {
      let query: any = this.fastify.db.collection('tasks');

      // Exclude soft-deleted tasks
      query = query.where('status', 'not-in', ['cancelada']);

      if (filters.assignedTo) {
        query = query.where('assigned_to', '==', filters.assignedTo);
      }
      if (filters.completed === 'true') {
        query = query.where('completed', '==', true);
      } else if (filters.completed === 'false') {
        query = query.where('completed', '==', false);
      }

      query = query.orderBy('created_at', 'desc');

      const snapshot = await query.get();
      const tasks = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, tasks };
    } catch (error: any) {
      // Fallback: if composite index not available, fetch all and filter client-side
      this.fastify.log.warn('listTasks index error, falling back to client-side filter:', error.message);
      try {
        const snapshot = await this.fastify.db.collection('tasks')
          .orderBy('created_at', 'desc').get();
        let tasks = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter out soft-deleted
        tasks = tasks.filter((t: any) => t.status !== 'cancelada');

        if (filters.assignedTo) {
          tasks = tasks.filter((t: any) => t.assigned_to === filters.assignedTo);
        }
        if (filters.completed === 'true') {
          tasks = tasks.filter((t: any) => t.completed === true);
        } else if (filters.completed === 'false') {
          tasks = tasks.filter((t: any) => t.completed !== true);
        }

        return { success: true, tasks };
      } catch (fallbackError: any) {
        this.fastify.log.error('Error listing tasks (fallback):', fallbackError);
        throw new Error('Erro ao listar tarefas');
      }
    }
  }

  async createTask(data: {
    title: string;
    assignedTo: string;
    dueDate?: string;
    origin?: string;
    templateId?: string;
    createdBy: string;
    // Enhanced fields
    description?: string;
    priority?: string;
    category?: string;
    originType?: string;
    originId?: string;
    alertId?: string;
  }) {
    try {
      const taskData = {
        title: data.title,
        description: data.description || '',
        completed: false,
        status: 'pendente',
        assigned_to: data.assignedTo,
        due_date: data.dueDate || new Date().toISOString().split('T')[0],
        origin: data.origin || 'manual',
        origin_type: data.originType || null,
        origin_id: data.originId || null,
        template_id: data.templateId || '',
        priority: data.priority || 'media',
        category: data.category || 'geral',
        alert_id: data.alertId || null,
        completed_at: null,
        completed_by: null,
        created_by: data.createdBy,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      const ref = await this.fastify.db.collection('tasks').add(taskData);
      return { success: true, task: { id: ref.id, ...taskData } };
    } catch (error: any) {
      this.fastify.log.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id: string, data: {
    title?: string;
    completed?: boolean;
    assignedTo?: string;
    completedBy?: string;
    priority?: string;
    status?: string;
  }) {
    try {
      const doc = await this.fastify.db.collection('tasks').doc(id).get();
      if (!doc.exists) throw new Error('Tarefa nao encontrada');

      const taskData = doc.data() as any;
      const updateData: any = { updated_at: FieldValue.serverTimestamp() };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;

      if (data.completed !== undefined) {
        updateData.completed = data.completed;
        updateData.completed_at = data.completed ? FieldValue.serverTimestamp() : null;
        updateData.status = data.completed ? 'concluida' : 'pendente';
        if (data.completed && data.completedBy) {
          updateData.completed_by = data.completedBy;
        }
        if (!data.completed) {
          updateData.completed_by = null;
        }
      }

      if (data.status !== undefined) updateData.status = data.status;

      await this.fastify.db.collection('tasks').doc(id).update(updateData);

      // Auto-resolve alert when task with alert_id is completed
      if (data.completed && taskData.alert_id) {
        try {
          await this.fastify.db.collection('alerts').doc(taskData.alert_id).update({
            status: 'resolved',
            resolvedAt: FieldValue.serverTimestamp(),
            resolved_by: data.completedBy || null,
            resolved_via_task: id,
          });
          this.fastify.log.info(`Alert ${taskData.alert_id} resolved via task ${id}`);
        } catch (alertError: any) {
          this.fastify.log.warn('Failed to resolve alert:', alertError.message);
        }
      }

      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(id: string) {
    try {
      const doc = await this.fastify.db.collection('tasks').doc(id).get();
      if (!doc.exists) throw new Error('Tarefa nao encontrada');

      // Soft delete instead of hard delete
      await this.fastify.db.collection('tasks').doc(id).update({
        status: 'cancelada',
        updated_at: FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error deleting task:', error);
      throw error;
    }
  }

  async applyTemplate(templateId: string, userId: string, createdBy: string) {
    try {
      const templateDoc = await this.fastify.db.collection('checklist_templates').doc(templateId).get();
      if (!templateDoc.exists) throw new Error('Template nao encontrado');

      const template = templateDoc.data() as any;
      const today = new Date().toISOString().split('T')[0];
      const createdTasks: any[] = [];

      for (const taskTitle of template.tasks) {
        const taskData = {
          title: taskTitle,
          description: '',
          completed: false,
          status: 'pendente',
          assigned_to: userId,
          due_date: today,
          origin: 'template',
          origin_type: null,
          origin_id: null,
          template_id: templateId,
          priority: 'media',
          category: 'geral',
          alert_id: null,
          completed_at: null,
          completed_by: null,
          created_by: createdBy,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        };

        const ref = await this.fastify.db.collection('tasks').add(taskData);
        createdTasks.push({ id: ref.id, ...taskData });
      }

      return { success: true, tasks: createdTasks, count: createdTasks.length };
    } catch (error: any) {
      this.fastify.log.error('Error applying template:', error);
      throw error;
    }
  }

  async listTemplates() {
    try {
      const snapshot = await this.fastify.db.collection('checklist_templates').get();
      const templates = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return { success: true, templates };
    } catch (error: any) {
      this.fastify.log.error('Error listing templates:', error);
      throw new Error('Erro ao listar templates');
    }
  }

  async createTemplate(data: { name: string; role: string; tasks: string[] }) {
    try {
      const templateData = {
        name: data.name,
        role: data.role,
        tasks: data.tasks,
        created_at: FieldValue.serverTimestamp(),
      };

      const ref = await this.fastify.db.collection('checklist_templates').add(templateData);
      return { success: true, template: { id: ref.id, ...templateData } };
    } catch (error: any) {
      this.fastify.log.error('Error creating template:', error);
      throw error;
    }
  }
}
