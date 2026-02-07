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
      this.fastify.log.error('Error listing tasks:', error);
      throw new Error('Erro ao listar tarefas');
    }
  }

  async createTask(data: {
    title: string;
    assignedTo: string;
    dueDate?: string;
    origin?: string;
    templateId?: string;
    createdBy: string;
  }) {
    try {
      const taskData = {
        title: data.title,
        completed: false,
        assigned_to: data.assignedTo,
        due_date: data.dueDate || new Date().toISOString().split('T')[0],
        origin: data.origin || 'manual',
        template_id: data.templateId || '',
        completed_at: null,
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
  }) {
    try {
      const doc = await this.fastify.db.collection('tasks').doc(id).get();
      if (!doc.exists) throw new Error('Tarefa não encontrada');

      const updateData: any = { updated_at: FieldValue.serverTimestamp() };
      if (data.title !== undefined) updateData.title = data.title;
      if (data.completed !== undefined) {
        updateData.completed = data.completed;
        updateData.completed_at = data.completed ? FieldValue.serverTimestamp() : null;
      }
      if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;

      await this.fastify.db.collection('tasks').doc(id).update(updateData);
      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(id: string) {
    try {
      const doc = await this.fastify.db.collection('tasks').doc(id).get();
      if (!doc.exists) throw new Error('Tarefa não encontrada');

      await this.fastify.db.collection('tasks').doc(id).delete();
      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error deleting task:', error);
      throw error;
    }
  }

  async applyTemplate(templateId: string, userId: string, createdBy: string) {
    try {
      const templateDoc = await this.fastify.db.collection('checklist_templates').doc(templateId).get();
      if (!templateDoc.exists) throw new Error('Template não encontrado');

      const template = templateDoc.data() as any;
      const today = new Date().toISOString().split('T')[0];
      const createdTasks: any[] = [];

      for (const taskTitle of template.tasks) {
        const taskData = {
          title: taskTitle,
          completed: false,
          assigned_to: userId,
          due_date: today,
          origin: 'template',
          template_id: templateId,
          completed_at: null,
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
