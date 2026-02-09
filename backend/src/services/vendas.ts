import { execSync } from 'child_process';
import { FastifyInstance } from 'fastify';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';

interface SalesUpload {
  id: string;
  filename: string;
  uploadedAt: Date;
  uploadedBy?: string;
  status: 'processing' | 'completed' | 'failed';
  storageUrl: string;
  processingResults?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    skippedRows: number;
    stockUpdated: boolean;
  };
  salesCreated?: number;
  ingredientsUpdated?: number;
  errors?: any[];
  warnings?: any[];
  completedAt?: Date;
  processingTimeMs?: number;
}

export class VendasService {
  private fastify: FastifyInstance;
  private projectRoot: string;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    // Project root is 2 levels up from backend/src/
    this.projectRoot = path.join(__dirname, '../../..');
  }

  /**
   * Gera ID único para upload
   */
  private generateUploadId(): string {
    return 'upload_' + randomBytes(10).toString('hex');
  }

  /**
   * Salva arquivo temporariamente
   */
  private async saveTemporaryFile(data: Buffer, filename: string, uploadId: string): Promise<string> {
    const tmpDir = path.join(this.projectRoot, '.tmp/uploads');

    // Garantir que diretório existe
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const ext = path.extname(filename);
    const tmpPath = path.join(tmpDir, `${uploadId}${ext}`);

    fs.writeFileSync(tmpPath, data);

    return tmpPath;
  }

  /**
   * Upload para Firebase Storage
   */
  private async uploadToStorage(filePath: string, uploadId: string, filename: string): Promise<string> {
    const bucket = getStorage().bucket();
    const destination = `sales-uploads/${uploadId}/${filename}`;

    await bucket.upload(filePath, {
      destination,
      metadata: {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    // Tornar público (MVP - em produção, usar signed URLs)
    const file = bucket.file(destination);
    await file.makePublic();

    return `https://storage.googleapis.com/${bucket.name}/${destination}`;
  }

  /**
   * Cria documento inicial de sales_upload
   */
  private async createSalesUploadDocument(uploadId: string, filename: string, storageUrl: string, userId?: string) {
    const uploadData: Partial<SalesUpload> = {
      id: uploadId,
      filename,
      uploadedAt: new Date(),
      status: 'processing',
      storageUrl,
    };

    // Only add uploadedBy if userId is provided
    if (userId) {
      uploadData.uploadedBy = userId;
    }

    await this.fastify.db
      .collection('sales_uploads')
      .doc(uploadId)
      .set(uploadData);
  }

  /**
   * Verifica se Python3 e dependências estão disponíveis
   */
  private checkPythonAvailability(): void {
    try {
      execSync('python3 --version', { encoding: 'utf-8', timeout: 5000 });
    } catch {
      throw new Error('Python3 não encontrado no sistema. Instale Python 3 para processar uploads de vendas.');
    }

    try {
      execSync('python3 -c "import pandas; import firebase_admin; from google.cloud import firestore"', {
        encoding: 'utf-8',
        timeout: 10000,
        cwd: this.projectRoot,
      });
    } catch {
      throw new Error('Dependências Python faltando. Execute: pip3 install pandas firebase-admin google-cloud-firestore python-dotenv');
    }
  }

  /**
   * Executa pipeline Python de processamento
   */
  private executePythonPipeline(filePath: string, uploadId: string): any {
    const scriptPath = path.join(this.projectRoot, 'tools/vendas/process_sales_upload.py');

    // Verificar pré-requisitos
    this.checkPythonAvailability();

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script de pipeline não encontrado: ${scriptPath}`);
    }

    try {
      this.fastify.log.info(`Executando pipeline Python: ${scriptPath}`);
      this.fastify.log.info(`  Arquivo: ${filePath}`);
      this.fastify.log.info(`  Upload ID: ${uploadId}`);

      const output = execSync(
        `python3 "${scriptPath}" "${filePath}" "${uploadId}"`,
        {
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 120000, // 2 min timeout
          cwd: this.projectRoot,
        }
      );

      // Extract JSON from output (ignore progress prints)
      const lines = output.trim().split('\n');

      for (let i = lines.length - 1; i >= 0; i--) {
        const candidate = lines.slice(i).join('\n');
        try {
          const result = JSON.parse(candidate);
          return result;
        } catch {
          continue;
        }
      }

      throw new Error('Nenhum JSON válido encontrado no output do pipeline');

    } catch (error: any) {
      this.fastify.log.error('Erro ao executar pipeline Python:', error.message);

      // Tentar parsear stdout do erro (execSync coloca stdout no error)
      if (error.stdout) {
        const lines = (error.stdout as string).trim().split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            return JSON.parse(lines.slice(i).join('\n'));
          } catch { continue; }
        }
      }

      // Tentar parsear stderr como JSON
      if (error.stderr) {
        try {
          return JSON.parse(error.stderr);
        } catch {
          // stderr não é JSON
        }
      }

      const hint = error.message?.includes('ENOENT') ? ' (python3 não encontrado)' : '';
      throw new Error(`Pipeline falhou${hint}: ${error.message}`);
    }
  }

  /**
   * Limpa arquivo temporário
   */
  private cleanupTemporaryFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.fastify.log.info(`Arquivo temporário removido: ${filePath}`);
      }
    } catch (error: any) {
      this.fastify.log.warn(`Falha ao remover arquivo temporário: ${filePath} - ${error.message}`);
    }
  }

  /**
   * Processa upload de vendas (endpoint principal)
   */
  async processUpload(fileData: Buffer, filename: string, userId?: string) {
    const uploadId = this.generateUploadId();
    let tmpPath: string | null = null;

    try {
      this.fastify.log.info(`Iniciando processamento de upload: ${uploadId}`);
      this.fastify.log.info(`  Arquivo: ${filename}`);
      this.fastify.log.info(`  Tamanho: ${fileData.length} bytes`);

      // 1. Salvar temporariamente
      tmpPath = await this.saveTemporaryFile(fileData, filename, uploadId);
      this.fastify.log.info(`Arquivo salvo em: ${tmpPath}`);

      // 2. Storage URL (MVP: skip actual upload, use placeholder)
      const storageUrl = `file://${tmpPath}`;
      this.fastify.log.info(`Arquivo local: ${storageUrl}`);

      // 3. Criar documento inicial
      await this.createSalesUploadDocument(uploadId, filename, storageUrl, userId);
      this.fastify.log.info(`Documento sales_upload criado: ${uploadId}`);

      // 4. Executar pipeline Python
      const result = await this.executePythonPipeline(tmpPath, uploadId);
      this.fastify.log.info(`Pipeline concluído: ${result.status}`);

      // 5. Cleanup
      this.cleanupTemporaryFile(tmpPath);

      return {
        uploadId,
        status: result.status,
        processingResults: result.steps,
        errors: result.errors || [],
        warnings: result.warnings || [],
        processingTimeMs: result.processingTimeMs,
      };

    } catch (error: any) {
      this.fastify.log.error('Erro no processamento de upload:', error);

      // Marcar como failed no Firestore
      try {
        await this.fastify.db
          .collection('sales_uploads')
          .doc(uploadId)
          .update({
            status: 'failed',
            errors: [{
              message: error.message,
              stack: error.stack,
            }],
            updatedAt: FieldValue.serverTimestamp(),
          });
      } catch (updateError: any) {
        this.fastify.log.error('Erro ao atualizar status de falha:', updateError.message);
      }

      // Cleanup
      if (tmpPath) {
        this.cleanupTemporaryFile(tmpPath);
      }

      throw error;
    }
  }

  /**
   * Lista uploads recentes
   */
  async listUploads(limit: number = 10) {
    const snapshot = await this.fastify.db
      .collection('sales_uploads')
      .orderBy('uploadedAt', 'desc')
      .limit(limit)
      .get();

    const uploads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return uploads;
  }

  /**
   * Busca detalhes de um upload específico
   */
  async getUpload(uploadId: string) {
    const doc = await this.fastify.db
      .collection('sales_uploads')
      .doc(uploadId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  }
}
