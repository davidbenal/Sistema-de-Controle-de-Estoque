#!/usr/bin/env python3
"""
Corrige mapeamentos com nomes oficiais fornecidos pelo usuário
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

# Nomes corretos fornecidos pelo usuário
CORRECT_NAMES = {
    "Quinotto": "Quinotto",
    "Porção de Patacones": "Porção de Patacones",
    "Tamarindo Sour": "Tamarindo Sour",
    "Maduro com Queijo e Salprieta": "Maduro com Queijo e Salprieta",
    "Pina Colada": "Pina Colada",
    "Choux com Colada Morada": "Choux com Colada Morada",
    "Rompope": "Rompope",
    "Copo de Suco de Abacaxi": "Copo de Suco de Abacaxi",
    "Copo de Suco de Maracuja": "Copo de Suco de Maracuja",
    "Copo de Suco de Tamarindo": "Copo de Suco de Tamarindo",
    "Copo de Suco de Limão": "Copo de Suco de Limão",
    "Montuvia": "Montuvia",
    "Dom Canuto - Sanduiche de Hornado": "Dom Canuto - Sanduiche de Hornado"
}

# Mapeamentos SKU → Nome correto
SKU_MAPPINGS = {
    "C": "Quinotto",
    "5": "Porção de Patacones",
    "X": "Tamarindo Sour",
    "7": "Maduro com Queijo e Salprieta",
    "k": "Pina Colada",
    "0O": "Rompope",
    "a": "Copo de Suco",  # Genérico - vamos mapear para Abacaxi
    "G": "Montuvia",
    "0G": "Dom Canuto - Sanduiche de Hornado"
}

def generate_id():
    """Gera ID único"""
    import random
    import string
    return 'rec_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=20))

def find_or_create_recipe(name):
    """Encontra receita existente ou cria nova"""
    recipes_ref = db.collection('recipes')

    # Procurar receita existente (case insensitive)
    query = recipes_ref.where('name', '==', name).limit(1)
    docs = list(query.stream())

    if docs:
        return docs[0].id, name

    # Criar nova receita
    recipe_id = generate_id()
    recipe_data = {
        'id': recipe_id,
        'name': name,
        'category': 'Não categorizado',
        'portions': 1,
        'ingredients': [],
        'totalCost': 0.0,
        'costPerPortion': 0.0,
        'suggestedPrice': 0.0,
        'notes': 'Criado automaticamente com nome oficial',
        'createdAt': firestore.SERVER_TIMESTAMP,
        'createdBy': 'data_cleanup_script'
    }

    recipes_ref.document(recipe_id).set(recipe_data)
    print(f"  ✅ Receita criada: {name}")
    return recipe_id, name

def update_or_create_mapping(sku, zig_name, recipe_id, recipe_name):
    """Atualiza ou cria mapeamento SKU → Receita"""
    mappings_ref = db.collection('product_mappings')

    # Procurar mapeamento existente
    query = mappings_ref.where('sku', '==', sku).limit(1)
    docs = list(query.stream())

    mapping_data = {
        'sku': sku,
        'product_name_zig': zig_name,
        'recipe_id': recipe_id,
        'recipe_name': recipe_name,
        'confidence': 1.0,  # Manual = 100%
        'updated_at': firestore.SERVER_TIMESTAMP,
        'updated_by': 'manual_correction'
    }

    if docs:
        # Atualizar existente
        docs[0].reference.update(mapping_data)
        print(f"  ✓ Mapeamento atualizado: SKU {sku} → {recipe_name}")
    else:
        # Criar novo
        mapping_id = generate_id()
        mapping_data['id'] = mapping_id
        mapping_data['createdAt'] = firestore.SERVER_TIMESTAMP
        mappings_ref.document(mapping_id).set(mapping_data)
        print(f"  ✓ Mapeamento criado: SKU {sku} → {recipe_name}")

def consolidate_patacones_duplicate():
    """Consolida duplicata de Porção de Patacones"""
    recipes_ref = db.collection('recipes')

    # Buscar todas as receitas de Patacones
    query = recipes_ref.where('name', '==', 'Porção de Patacones (250g)')
    docs = list(query.stream())

    if len(docs) <= 1:
        print("  ℹ️  Nenhuma duplicata de Patacones encontrada")
        return

    # Manter o primeiro, arquivar os outros
    keep_id = docs[0].id

    for doc in docs[1:]:
        # Redirecionar mapeamentos
        mappings_ref = db.collection('product_mappings')
        query = mappings_ref.where('recipe_id', '==', doc.id)
        for mapping in query.stream():
            mapping.reference.update({
                'recipe_id': keep_id,
                'recipe_name': 'Porção de Patacones',
                'updated_at': firestore.SERVER_TIMESTAMP
            })

        # Arquivar receita duplicada
        doc.reference.update({
            'archived': True,
            'merged_into': keep_id,
            'archived_at': firestore.SERVER_TIMESTAMP
        })
        print(f"  ✓ Duplicata arquivada: {doc.id}")

    # Atualizar nome da receita mantida
    docs[0].reference.update({
        'name': 'Porção de Patacones',  # Nome oficial sem (250g)
        'updated_at': firestore.SERVER_TIMESTAMP
    })
    print(f"  ✅ Consolidado em: Porção de Patacones")

def main():
    print("="*80)
    print("CORREÇÃO DE MAPEAMENTOS COM NOMES OFICIAIS")
    print("="*80)

    # 1. Criar receitas faltantes
    print("\n1️⃣ Criando receitas faltantes com nomes oficiais...")
    recipe_map = {}
    for name in CORRECT_NAMES.values():
        recipe_id, recipe_name = find_or_create_recipe(name)
        recipe_map[name] = (recipe_id, recipe_name)

    # 2. Atualizar mapeamentos SKU
    print("\n2️⃣ Atualizando mapeamentos SKU → Receita...")

    # Mapeamentos diretos
    direct_mappings = {
        "C": "Quinotto",
        "5": "Porção de Patacones",
        "X": "Tamarindo Sour",
        "7": "Maduro com Queijo e Salprieta",
        "k": "Pina Colada",
        "0O": "Rompope",
        "G": "Montuvia",
        "0G": "Dom Canuto - Sanduiche de Hornado"
    }

    for sku, recipe_name in direct_mappings.items():
        if recipe_name in recipe_map:
            recipe_id, _ = recipe_map[recipe_name]
            # Buscar nome original no Zig
            zig_name = get_zig_name(sku)
            update_or_create_mapping(sku, zig_name, recipe_id, recipe_name)

    # 3. Consolidar duplicata
    print("\n3️⃣ Consolidando duplicata de Patacones...")
    consolidate_patacones_duplicate()

    # 4. Padronizar nomes de receitas existentes
    print("\n4️⃣ Padronizando nomes de receitas...")
    standardize_recipe_names()

    print("\n" + "="*80)
    print("✅ CORREÇÃO COMPLETA!")
    print("="*80)
    print("\n📋 Próximos passos:")
    print("  1. Verificar no Firebase Console")
    print("  2. Testar mapeamentos com upload XLSX")
    print()

def get_zig_name(sku):
    """Retorna nome do produto no Zig para um SKU"""
    zig_names = {
        "C": "QUINOTO",
        "5": "PORÇÃO DE PATACONES (200G)",
        "X": "TAMARINDO",
        "7": "MADURO COM QUEIJO E SALPRIETA",
        "k": "PINA COLADA",
        "0O": "ROMPOPE",
        "G": "MONTUVIA",
        "0G": "Dom Thom - Sanduiche de Hornado"
    }
    return zig_names.get(sku, f"Produto SKU {sku}")

def standardize_recipe_names():
    """Padroniza nomes de receitas para Title Case"""
    recipes_ref = db.collection('recipes')
    count = 0

    for doc in recipes_ref.stream():
        data = doc.to_dict()
        original_name = data.get('name', '')

        # Verificar se é um dos nomes oficiais
        if original_name in CORRECT_NAMES.values():
            continue  # Já está correto

        # Aplicar Title Case em outros
        normalized = ' '.join(original_name.split()).title()

        if original_name != normalized and not data.get('archived'):
            doc.reference.update({
                'name': normalized,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            print(f"  ✓ Padronizado: {original_name} → {normalized}")
            count += 1

    if count > 0:
        print(f"  ✅ {count} receitas padronizadas")
    else:
        print("  ℹ️  Nenhuma receita precisou padronização")

if __name__ == '__main__':
    main()
