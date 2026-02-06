import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from 'dotenv';
import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import fs from 'fs';

// Load environment variables
config({ path: path.join(__dirname, '../../.env') });

const fastify = Fastify({
  logger: true, // Simple logger for MVP
});

// Register plugins
fastify.register(cors, {
  origin: true, // Allow all origins in dev (restrict in production)
});

fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Initialize Firebase Admin
let db: FirebaseFirestore.Firestore | undefined;
let storage: ReturnType<typeof getStorage> | undefined;

try {
  const credentialsPath = path.join(__dirname, '../../firebase-credentials.json');

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
      `Firebase credentials not found at: ${credentialsPath}\n` +
      'Please follow SETUP_FIREBASE.md to generate credentials.'
    );
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(credentialsPath, 'utf8')
  ) as ServiceAccount;

  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
  });

  db = getFirestore('montuvia1'); // Database in São Paulo
  storage = getStorage();

  fastify.log.info('✓ Firebase Admin SDK initialized successfully');
} catch (error) {
  fastify.log.error('✗ Failed to initialize Firebase Admin SDK:');
  fastify.log.error(error);
  fastify.log.warn('\nPlease complete Firebase setup following SETUP_FIREBASE.md\n');
}

// Make Firebase accessible to routes
if (db && storage) {
  fastify.decorate('db', db);
  fastify.decorate('storage', storage);
} else {
  // Create empty decorators to satisfy TypeScript
  fastify.decorate('db', {} as FirebaseFirestore.Firestore);
  fastify.decorate('storage', {} as ReturnType<typeof getStorage>);
}

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebase: db ? 'connected' : 'not configured',
  };
});

// Root endpoint
fastify.get('/', async () => {
  return {
    name: 'Montuvia Estoque API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      vendas: '/api/vendas',
      cadastros: '/api/cadastros',
      operacoes: '/api/operacoes',
      relatorios: '/api/relatorios',
      mapeamentos: '/api/mapeamentos',
      alertas: '/api/alertas',
    },
  };
});

// Import routes
import vendasRoutes from './routes/vendas';
import { alertasRoutes } from './routes/alertas';
import { dashboardRoutes } from './routes/dashboard';
import { cadastrosRoutes } from './routes/cadastros';
import { mapeamentosRoutes } from './routes/mapeamentos';
// import operacoesRoutes from './routes/operacoes';

// Register routes
fastify.register(vendasRoutes, { prefix: '/api/vendas' });
fastify.register(alertasRoutes, { prefix: '/api/alertas' });
fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
fastify.register(cadastrosRoutes, { prefix: '/api/cadastros' });
fastify.register(mapeamentosRoutes, { prefix: '/api/mapeamentos' });
// fastify.register(operacoesRoutes, { prefix: '/api/operacoes' });

// Start server
const start = async () => {
  try {
    const PORT = Number(process.env.PORT) || 3001;
    const HOST = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port: PORT, host: HOST });
    console.log('\n🚀 Server is running!');
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🔥 Firebase: ${db ? '✓ Connected' : '✗ Not configured'}`);
    console.log('\n📝 To setup Firebase, see: SETUP_FIREBASE.md\n');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Type declarations
declare module 'fastify' {
  interface FastifyInstance {
    db: FirebaseFirestore.Firestore;
    storage: ReturnType<typeof getStorage>;
  }
}
