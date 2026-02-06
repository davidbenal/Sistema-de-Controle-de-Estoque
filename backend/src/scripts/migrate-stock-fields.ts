import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Script de Migração: Adicionar Campos de Estoque
 *
 * Este script garante que todos os ingredientes tenham os campos necessários
 * para o sistema de controle de estoque funcionar corretamente.
 *
 * Campos adicionados/corrigidos:
 * - storage_center (obrigatório para visualização de estoque)
 * - current_stock (inicializado em 0 se ausente)
 * - avg_daily_consumption (inicializado em 0 se ausente)
 *
 * Uso:
 *   npx ts-node src/scripts/migrate-stock-fields.ts
 */

async function migrateStockFields() {
  try {
    // Inicializar Firebase Admin
    const credentialsPath = path.join(__dirname, '../../../firebase-credentials.json');

    if (!fs.existsSync(credentialsPath)) {
      console.error('❌ Firebase credentials not found at:', credentialsPath);
      console.error('Please follow SETUP_FIREBASE.md to generate credentials.');
      process.exit(1);
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(credentialsPath, 'utf8')
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    const db = admin.firestore();
    db.settings({ databaseId: 'montuvia1' });

    console.log('\n🚀 Iniciando migração de campos de estoque...\n');

    // 1. Pegar todos os ingredientes
    const ingredientsSnapshot = await db.collection('ingredients').get();
    console.log(`📊 Total de ingredientes encontrados: ${ingredientsSnapshot.size}\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // 2. Para cada ingrediente
    for (const doc of ingredientsSnapshot.docs) {
      try {
        const ingredient = doc.data();
        const updates: any = {};

        // Garantir que storage_center existe
        if (!ingredient.storage_center) {
          updates.storage_center = 'estoque-geral'; // Default
          console.log(`⚠️  [${ingredient.name}]: storage_center ausente, setando 'estoque-geral'`);
        }

        // Inicializar current_stock se não existe
        if (ingredient.current_stock === undefined || ingredient.current_stock === null) {
          updates.current_stock = 0;
          console.log(`⚠️  [${ingredient.name}]: current_stock ausente, setando 0`);
        }

        // Inicializar avg_daily_consumption
        if (ingredient.avg_daily_consumption === undefined || ingredient.avg_daily_consumption === null) {
          updates.avg_daily_consumption = 0;
        }

        // Garantir que status está definido
        if (!ingredient.status) {
          updates.status = 'active';
          console.log(`⚠️  [${ingredient.name}]: status ausente, setando 'active'`);
        }

        // Atualizar documento se necessário
        if (Object.keys(updates).length > 0) {
          await doc.ref.update(updates);
          updated++;
          console.log(`✅ [${ingredient.name}]: Atualizado com ${Object.keys(updates).join(', ')}`);
        } else {
          skipped++;
        }
      } catch (error: any) {
        console.error(`❌ Erro ao atualizar ${doc.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Resultado da Migração:');
    console.log(`   ✅ Atualizados: ${updated}`);
    console.log(`   ⏭️  Ignorados (já ok): ${skipped}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (errors > 0) {
      console.error('⚠️  Migração completada com erros. Revise os logs acima.\n');
      process.exit(1);
    } else {
      console.log('✅ Migração concluída com sucesso!\n');
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n❌ Erro fatal durante migração:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Executar migração
migrateStockFields();
