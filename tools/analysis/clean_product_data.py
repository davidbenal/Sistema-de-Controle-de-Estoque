#!/usr/bin/env python3
"""
Limpeza e Padronização de Dados: Zig × Ficha Técnica

ATENÇÃO: Este script modifica dados no Firebase.
Só execute após revisar o relatório de análise.

Ações:
1. Padronizar capitalization (Title Case)
2. Remover espaços extras
3. Atualizar mapeamentos aprovados
4. Consolidar duplicatas (opcional)
"""

import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials
from google.cloud import firestore
from firebase_helper import get_firestore_client
import json
from datetime import datetime

# Load environment variables
project_root = Path(__file__).parent.parent.parent
env_path = project_root / '.env'
load_dotenv(env_path)

# Initialize Firebase
creds_path = project_root / 'firebase-credentials.json'
cred = credentials.Certificate(str(creds_path))

# Verifica se Firebase já foi inicializado
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = get_firestore_client()

def load_cleanup_config():
    """Carrega configuração de limpeza aprovada pelo usuário"""
    config_path = project_root / 'tools' / 'analysis' / 'cleanup_config.json'

    if not config_path.exists():
        print("❌ Arquivo de configuração não encontrado!")
        print("   Crie: tools/analysis/cleanup_config.json")
        print("\nExemplo:")
        print(json.dumps({
            "apply_capitalization": True,
            "remove_extra_spaces": True,
            "update_mappings": [],
            "merge_duplicates": []
        }, indent=2))
        sys.exit(1)

    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def normalize_text(text):
    """Normaliza texto: Title Case + remove espaços extras"""
    if not text:
        return text
    # Remove espaços extras
    text = ' '.join(text.split())
    # Title Case
    return text.title()

def apply_capitalization_fixes(dry_run=True):
    """Aplica correções de capitalization"""
    print("\n1️⃣ Aplicando correções de capitalization...")

    # Atualizar product_mappings
    mappings_ref = db.collection('product_mappings')
    updated_count = 0

    for doc in mappings_ref.stream():
        data = doc.to_dict()
        original_name = data.get('product_name_zig', '')
        normalized = normalize_text(original_name)

        if original_name != normalized:
            if dry_run:
                print(f"   [DRY RUN] {doc.id}: '{original_name}' → '{normalized}'")
            else:
                doc.reference.update({
                    'product_name_zig': normalized,
                    'updated_at': firestore.SERVER_TIMESTAMP
                })
                print(f"   ✅ {doc.id}: '{original_name}' → '{normalized}'")
            updated_count += 1

    # Atualizar recipes
    recipes_ref = db.collection('recipes')
    for doc in recipes_ref.stream():
        data = doc.to_dict()
        original_name = data.get('name', '')
        normalized = normalize_text(original_name)

        if original_name != normalized:
            if dry_run:
                print(f"   [DRY RUN] Recipe {doc.id}: '{original_name}' → '{normalized}'")
            else:
                doc.reference.update({
                    'name': normalized,
                    'updated_at': firestore.SERVER_TIMESTAMP
                })
                print(f"   ✅ Recipe {doc.id}: '{original_name}' → '{normalized}'")
            updated_count += 1

    print(f"\n   Total normalizado: {updated_count} registros")
    return updated_count

def update_approved_mappings(mapping_updates, dry_run=True):
    """Atualiza mapeamentos aprovados pelo usuário"""
    print("\n2️⃣ Atualizando mapeamentos aprovados...")

    if not mapping_updates:
        print("   Nenhum mapeamento para atualizar.")
        return 0

    updated_count = 0
    mappings_ref = db.collection('product_mappings')

    for update in mapping_updates:
        sku = update['sku']
        new_recipe_id = update['new_recipe_id']
        new_recipe_name = update['new_recipe_name']

        # Buscar documento do mapping
        query = mappings_ref.where('sku', '==', sku).limit(1)
        docs = list(query.stream())

        if not docs:
            print(f"   ⚠️  SKU {sku} não encontrado")
            continue

        doc = docs[0]

        if dry_run:
            print(f"   [DRY RUN] SKU {sku}: → '{new_recipe_name}' (ID: {new_recipe_id})")
        else:
            doc.reference.update({
                'recipe_id': new_recipe_id,
                'recipe_name': new_recipe_name,
                'confidence': 1.0,  # Manual = 100% confiança
                'updated_at': firestore.SERVER_TIMESTAMP,
                'updated_by': 'manual_review'
            })
            print(f"   ✅ SKU {sku}: → '{new_recipe_name}'")

        updated_count += 1

    print(f"\n   Total atualizado: {updated_count} mapeamentos")
    return updated_count

def merge_duplicate_recipes(duplicates, dry_run=True):
    """Consolida receitas duplicadas"""
    print("\n3️⃣ Consolidando receitas duplicadas...")

    if not duplicates:
        print("   Nenhuma duplicata para consolidar.")
        return 0

    merged_count = 0
    recipes_ref = db.collection('recipes')

    for dup in duplicates:
        keep_id = dup['keep_id']
        remove_ids = dup['remove_ids']
        canonical_name = dup['canonical_name']

        if dry_run:
            print(f"   [DRY RUN] Manter: {canonical_name} (ID: {keep_id})")
            print(f"              Remover: {remove_ids}")
        else:
            # Atualizar nome canônico
            keep_ref = recipes_ref.document(keep_id)
            keep_ref.update({
                'name': canonical_name,
                'updated_at': firestore.SERVER_TIMESTAMP
            })

            # Redirecionar mapeamentos para a receita que será mantida
            mappings_ref = db.collection('product_mappings')
            for remove_id in remove_ids:
                query = mappings_ref.where('recipe_id', '==', remove_id)
                for doc in query.stream():
                    doc.reference.update({
                        'recipe_id': keep_id,
                        'recipe_name': canonical_name,
                        'updated_at': firestore.SERVER_TIMESTAMP
                    })

                # Marcar receita como arquivada ao invés de deletar
                remove_ref = recipes_ref.document(remove_id)
                remove_ref.update({
                    'archived': True,
                    'merged_into': keep_id,
                    'archived_at': firestore.SERVER_TIMESTAMP
                })

            print(f"   ✅ Consolidado: {canonical_name}")
            print(f"      Arquivados: {remove_ids}")

        merged_count += 1

    print(f"\n   Total consolidado: {merged_count} grupos")
    return merged_count

def create_backup():
    """Cria backup dos dados antes de modificar"""
    print("\n💾 Criando backup...")

    backup_dir = project_root / 'backups'
    backup_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = backup_dir / f'firebase_backup_{timestamp}.json'

    backup_data = {
        'timestamp': timestamp,
        'mappings': [],
        'recipes': []
    }

    # Backup mappings
    for doc in db.collection('product_mappings').stream():
        backup_data['mappings'].append({
            'id': doc.id,
            **doc.to_dict()
        })

    # Backup recipes
    for doc in db.collection('recipes').stream():
        backup_data['recipes'].append({
            'id': doc.id,
            **doc.to_dict()
        })

    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, indent=2, ensure_ascii=False, default=str)

    print(f"   ✅ Backup salvo: {backup_path}")
    return backup_path

def main():
    print("="*80)
    print("LIMPEZA E PADRONIZAÇÃO DE DADOS")
    print("="*80)

    # Carregar configuração
    print("\n📋 Carregando configuração de limpeza...")
    try:
        config = load_cleanup_config()
    except Exception as e:
        print(f"❌ Erro ao carregar configuração: {e}")
        sys.exit(1)

    # Confirmar com usuário
    print("\n⚠️  ATENÇÃO: Esta operação modificará dados no Firebase!")
    print("\nAções planejadas:")
    if config.get('apply_capitalization'):
        print("  ✓ Padronizar capitalization (Title Case)")
    if config.get('remove_extra_spaces'):
        print("  ✓ Remover espaços extras")
    if config.get('update_mappings'):
        print(f"  ✓ Atualizar {len(config['update_mappings'])} mapeamentos")
    if config.get('merge_duplicates'):
        print(f"  ✓ Consolidar {len(config['merge_duplicates'])} grupos de duplicatas")

    print("\nOpções:")
    print("  1. DRY RUN (simular sem modificar)")
    print("  2. EXECUTAR (aplicar mudanças no Firebase)")
    print("  3. CANCELAR")

    choice = input("\nEscolha uma opção (1/2/3): ").strip()

    if choice == '3':
        print("\n❌ Operação cancelada pelo usuário.")
        sys.exit(0)

    dry_run = (choice == '1')

    if not dry_run:
        # Criar backup antes de modificar
        backup_path = create_backup()
        print(f"\n✅ Backup criado: {backup_path}")

    # Executar limpezas
    total_changes = 0

    if config.get('apply_capitalization') or config.get('remove_extra_spaces'):
        total_changes += apply_capitalization_fixes(dry_run=dry_run)

    if config.get('update_mappings'):
        total_changes += update_approved_mappings(config['update_mappings'], dry_run=dry_run)

    if config.get('merge_duplicates'):
        total_changes += merge_duplicate_recipes(config['merge_duplicates'], dry_run=dry_run)

    # Resumo
    print("\n" + "="*80)
    if dry_run:
        print("🔍 DRY RUN COMPLETO")
        print(f"   {total_changes} alterações seriam aplicadas")
        print("\n   Para executar de verdade, escolha opção 2")
    else:
        print("✅ LIMPEZA COMPLETA")
        print(f"   {total_changes} alterações aplicadas com sucesso")
        print(f"   Backup disponível em: {backup_path}")

    print("="*80)

if __name__ == '__main__':
    main()
