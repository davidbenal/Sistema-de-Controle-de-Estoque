import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Seed: Centros de Armazenamento
 *
 * Popula a collection `storage_centers` com os 7 centros padrão.
 * Verifica duplicatas antes de inserir.
 *
 * Uso:
 *   npx tsx src/scripts/seed-storage-centers.ts
 */

const SEED_CENTERS = [
  { value: 'cozinha', label: 'Cozinha', order: 1 },
  { value: 'cozinha-fria', label: 'Cozinha Fria', order: 2 },
  { value: 'bar', label: 'Bar', order: 3 },
  { value: 'despensa', label: 'Despensa', order: 4 },
  { value: 'estoque-geral', label: 'Estoque Geral', order: 5 },
  { value: 'refrigerado', label: 'Refrigerado', order: 6 },
  { value: 'congelado', label: 'Congelado', order: 7 },
];

async function seed() {
  try {
    const credentialsPath = path.join(__dirname, '../../../firebase-credentials.json');

    if (!fs.existsSync(credentialsPath)) {
      console.error('Firebase credentials not found at:', credentialsPath);
      process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    const db = admin.firestore();
    db.settings({ databaseId: 'montuvia1' });

    console.log('Verificando centros existentes...');

    const existing = await db.collection('storage_centers').get();
    const existingValues = new Set(existing.docs.map(doc => doc.data().value));

    const toInsert = SEED_CENTERS.filter(c => !existingValues.has(c.value));

    if (toInsert.length === 0) {
      console.log(`Todos os ${SEED_CENTERS.length} centros ja existem. Nada a fazer.`);
      process.exit(0);
    }

    const batch = db.batch();
    for (const center of toInsert) {
      const ref = db.collection('storage_centers').doc();
      batch.set(ref, { ...center, created_at: new Date() });
    }
    await batch.commit();

    console.log(`Seed concluido: ${toInsert.length} centros inseridos (${existingValues.size} ja existiam).`);
    process.exit(0);
  } catch (error) {
    console.error('Erro no seed:', error);
    process.exit(1);
  }
}

seed();
