#!/usr/bin/env python3
"""
Completa mapeamentos que têm recipe_id: None

Ações:
1. Buscar mapeamentos com recipe_id None/vazio
2. Para cada mapeamento, criar receita
3. Atualizar o mapeamento com o recipe_id criado
4. Criar alertas para fichas que precisam revisão
5. Limpar mapeamentos duplicados
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
import pandas as pd
from datetime import datetime
import random
import string

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

def generate_id():
    """Gera ID único"""
    return 'rec_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=20))

def classify_product_type(product_name):
    """Classifica tipo de produto"""
    name_upper = product_name.upper()

    # Bebidas industriais
    beverages = ['CORONA', 'HEINEKEN', 'PILSEN', 'STELLA', 'BUDWEISER', 'ANTARCTICA',
                 'REFRI', 'ÁGUA', 'COCA', 'GUARANÁ', 'SPRITE', 'FANTA', 'SODA', 'CERVEJA']

    # Serviços e taxas
    services = ['COUVERT', 'TAXA', 'SERVICO', 'SERVIÇO', 'EVENTO', 'CORTESIA']

    # Bebidas de bar (precisam ficha técnica mas são simples)
    bar_drinks = ['CAIPIRINHA', 'MOJITO', 'PISCO', 'MARGARITA', 'DAIQUIRI',
                  'COLADA', 'SOUR', 'UMIÑA', 'GIN', 'COSMOPOLITAN', 'NEGRONI']

    if any(bev in name_upper for bev in beverages):
        return 'beverage_industrial'
    elif any(srv in name_upper for srv in services):
        return 'service'
    elif any(drink in name_upper for drink in bar_drinks):
        return 'beverage_bar'
    else:
        return 'dish'

def classify_category(product_type):
    """Retorna categoria baseada no tipo"""
    categories = {
        'dish': 'Pratos Principais',
        'beverage_bar': 'Bebidas de Bar',
        'beverage_industrial': 'Bebidas Industriais',
        'service': 'Serviços'
    }
    return categories.get(product_type, 'Não Categorizado')

def get_sales_count(sku):
    """Busca quantidade de vendas de um SKU"""
    excel_path = project_root / "Relatório de produtos vendidos - janeiro.xlsx"
    df = pd.read_excel(excel_path)
    sales = df[df['SKU'] == sku]
    return len(sales)

def create_recipe_for_product(product_name, product_type, sales_count):
    """Cria receita básica para produto"""
    recipe_id = generate_id()

    needs_inventory_control = product_type in ['dish', 'beverage_bar']

    recipe_data = {
        'id': recipe_id,
        'name': product_name.title(),
        'category': classify_category(product_type),
        'portions': 1,
        'ingredients': [],
        'totalCost': 0.0,
        'costPerPortion': 0.0,
        'suggestedPrice': 0.0,
        'notes': f'Criado automaticamente. Produto vendeu {sales_count}x em janeiro. PRECISA REVISÃO.',
        'status': 'draft',
        'needsReview': True,
        'inventoryControlled': needs_inventory_control,
        'productType': product_type,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'createdBy': 'auto_migration'
    }

    db.collection('recipes').document(recipe_id).set(recipe_data)
    return recipe_id

def create_review_alert(recipe_id, recipe_name, sales_count, product_type):
    """Cria alerta para receita que precisa revisão"""
    if product_type not in ['dish', 'beverage_bar']:
        return

    alert_id = generate_id()
    priority = 'high' if sales_count >= 40 else ('medium' if sales_count >= 20 else 'low')

    alert_data = {
        'id': alert_id,
        'type': 'incomplete_recipe',
        'priority': priority,
        'recipe_id': recipe_id,
        'recipe_name': recipe_name,
        'message': f'Ficha técnica "{recipe_name}" precisa ser completada. Produto vendeu {sales_count}x em janeiro.',
        'salesVolume': sales_count,
        'status': 'pending',
        'createdAt': firestore.SERVER_TIMESTAMP,
        'resolvedAt': None
    }

    db.collection('alerts').document(alert_id).set(alert_data)

def main():
    print("="*80)
    print("COMPLETANDO MAPEAMENTOS INCOMPLETOS")
    print("="*80)

    print("\n1️⃣ Buscando mapeamentos com recipe_id None...")

    mappings_ref = db.collection('product_mappings')
    incomplete_mappings = []

    for doc in mappings_ref.stream():
        data = doc.to_dict()
        recipe_id = data.get('recipe_id')

        if not recipe_id or recipe_id == 'None' or not str(recipe_id).strip():
            incomplete_mappings.append({
                'doc_id': doc.id,
                'doc_ref': doc.reference,
                'sku': data.get('sku'),
                'name': data.get('product_name_zig', 'N/A')
            })

    print(f"   Encontrados {len(incomplete_mappings)} mapeamentos incompletos")

    # Agrupar por SKU para evitar duplicatas
    skus_processed = {}

    print("\n2️⃣ Criando receitas e completando mapeamentos...\n")

    type_stats = {'dish': 0, 'beverage_bar': 0, 'beverage_industrial': 0, 'service': 0}
    created_count = 0
    updated_count = 0
    alerts_count = 0

    for mapping in incomplete_mappings:
        sku = mapping['sku']
        name = mapping['name']

        # Se já processamos este SKU, reusar o recipe_id
        if sku in skus_processed:
            recipe_id = skus_processed[sku]
            # Atualizar mapeamento com recipe_id existente
            mapping['doc_ref'].update({
                'recipe_id': recipe_id,
                'updated_at': firestore.SERVER_TIMESTAMP,
                'updated_by': 'auto_migration'
            })
            updated_count += 1
            continue

        # Processar novo SKU
        sales = get_sales_count(sku)
        product_type = classify_product_type(name)
        type_stats[product_type] += 1

        # Criar receita
        recipe_id = create_recipe_for_product(name, product_type, sales)
        skus_processed[sku] = recipe_id

        # Atualizar mapeamento
        mapping['doc_ref'].update({
            'recipe_id': recipe_id,
            'recipe_name': name.title(),
            'confidence': 1.0,
            'productType': product_type,
            'needsReview': product_type in ['dish', 'beverage_bar'],
            'updated_at': firestore.SERVER_TIMESTAMP,
            'updated_by': 'auto_migration'
        })

        # Criar alerta se necessário
        if product_type in ['dish', 'beverage_bar']:
            create_review_alert(recipe_id, name.title(), sales, product_type)
            alerts_count += 1

        # Log
        icon = {
            'dish': '🍽️',
            'beverage_bar': '🍹',
            'beverage_industrial': '🍺',
            'service': '💰'
        }.get(product_type, '📦')

        status = "⚠️ PRECISA REVISÃO" if product_type in ['dish', 'beverage_bar'] else "✓ Não controlado"

        print(f"   {icon} SKU {sku:4s} | {name:45s} | {sales:3d} vendas | {status}")
        created_count += 1

    # Resumo
    print("\n" + "="*80)
    print("✅ MAPEAMENTOS COMPLETADOS!")
    print("="*80)
    print(f"\nReceitas criadas: {created_count}")
    print(f"Mapeamentos atualizados: {len(incomplete_mappings)}")
    print(f"  (incluindo {updated_count} duplicatas atualizadas)")
    print(f"\nPor tipo:")
    print(f"  🍽️  Pratos principais:        {type_stats['dish']}")
    print(f"  🍹 Bebidas de bar:          {type_stats['beverage_bar']}")
    print(f"  🍺 Bebidas industriais:     {type_stats['beverage_industrial']}")
    print(f"  💰 Serviços/Taxas:          {type_stats['service']}")
    print(f"\nAlertas criados: {alerts_count}")

    # Calcular cobertura
    excel_path = project_root / "Relatório de produtos vendidos - janeiro.xlsx"
    df = pd.read_excel(excel_path)

    total_sales = len(df)
    mapped_sales = len(df[df['SKU'].isin(skus_processed.keys())])
    coverage = (mapped_sales / total_sales) * 100 if total_sales > 0 else 0

    print(f"\n📊 Cobertura de vendas:")
    print(f"  Total vendas janeiro: {total_sales}")
    print(f"  Vendas mapeadas: {mapped_sales} ({coverage:.1f}%)")

    print("\n📋 Próximos passos:")
    print("  1. Verificar Firebase Console → collections recipes e alerts")
    print("  2. Revisar fichas técnicas marcadas como 'draft'")
    print("  3. Adicionar ingredientes nos pratos principais")
    print()

if __name__ == '__main__':
    main()
