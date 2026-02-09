import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function activityRoutes(fastify: FastifyInstance) {

  /**
   * GET /api/activity
   * List recent activity with optional filters
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { entity_type, actor_id, entity_id, limit: limitStr } = request.query as {
        entity_type?: string;
        actor_id?: string;
        entity_id?: string;
        limit?: string;
      };

      const limit = Math.min(parseInt(limitStr || '50', 10), 100);

      let query: any = fastify.db.collection('activity_log');

      if (entity_type) {
        query = query.where('entity_type', '==', entity_type);
      }
      if (actor_id) {
        query = query.where('actor_id', '==', actor_id);
      }
      if (entity_id) {
        query = query.where('entity_id', '==', entity_id);
      }

      query = query.orderBy('created_at', 'desc').limit(limit);

      const snapshot = await query.get();
      const activities = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return reply.code(200).send({ success: true, activities });
    } catch (error: any) {
      fastify.log.error('Error listing activities:', error);
      return reply.code(500).send({ success: false, error: error.message });
    }
  });
}
