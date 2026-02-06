import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { VendasService } from '../services/vendas';
import { MultipartFile } from '@fastify/multipart';

export default async function vendasRoutes(fastify: FastifyInstance) {
  const vendasService = new VendasService(fastify);

  /**
   * POST /api/vendas/upload
   * Upload de arquivo Excel de vendas
   */
  fastify.post('/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Receber arquivo multipart
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          error: 'Nenhum arquivo enviado',
          message: 'Por favor, envie um arquivo Excel (XLSX, XLS ou CSV)',
        });
      }

      // Validar tipo de arquivo
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
        'application/vnd.ms-excel', // XLS
        'text/csv', // CSV
      ];

      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          error: 'Tipo de arquivo não suportado',
          message: 'Por favor, envie um arquivo XLSX, XLS ou CSV',
          receivedType: data.mimetype,
        });
      }

      // Ler arquivo em buffer
      const fileBuffer = await data.toBuffer();
      const filename = data.filename;

      // Processar upload
      fastify.log.info(`Recebido upload: ${filename} (${fileBuffer.length} bytes)`);

      const result = await vendasService.processUpload(
        fileBuffer,
        filename,
        // TODO: Pegar userId da sessão/auth quando implementar autenticação
        undefined
      );

      return reply.code(201).send({
        success: true,
        uploadId: result.uploadId,
        status: result.status,
        processingResults: result.processingResults,
        errors: result.errors,
        warnings: result.warnings,
        processingTimeMs: result.processingTimeMs,
        message: result.status === 'completed'
          ? 'Upload processado com sucesso'
          : 'Upload processado com avisos',
      });

    } catch (error: any) {
      fastify.log.error('Erro ao processar upload de vendas:', error);

      return reply.code(500).send({
        error: 'Erro ao processar upload',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  });

  /**
   * GET /api/vendas/historico
   * Lista uploads recentes
   */
  fastify.get('/historico', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const uploads = await vendasService.listUploads(10);

      return reply.code(200).send({
        success: true,
        uploads,
        total: uploads.length,
      });

    } catch (error: any) {
      fastify.log.error('Erro ao buscar histórico de uploads:', error);

      return reply.code(500).send({
        error: 'Erro ao buscar histórico',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/vendas/upload/:uploadId
   * Busca detalhes de um upload específico
   */
  fastify.get<{
    Params: { uploadId: string };
  }>('/upload/:uploadId', async (request, reply) => {
    try {
      const { uploadId } = request.params;

      const upload = await vendasService.getUpload(uploadId);

      if (!upload) {
        return reply.code(404).send({
          error: 'Upload não encontrado',
          uploadId,
        });
      }

      return reply.code(200).send({
        success: true,
        upload,
      });

    } catch (error: any) {
      fastify.log.error('Erro ao buscar upload:', error);

      return reply.code(500).send({
        error: 'Erro ao buscar upload',
        message: error.message,
      });
    }
  });
}
