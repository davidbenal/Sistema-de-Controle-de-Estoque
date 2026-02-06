#!/usr/bin/env python3
"""
Cadastra produtos não mapeados e cria alertas para fichas técnicas incompletas

Ações:
1. Ler produtos do Zig que não têm mapeamento
2. Criar receitas vazias/básicas para cada produto
3. Criar mapeamentos SKU → Receita
4. Marcar bebidas industriais como "não controlado"
5. Criar alertas para fichas técnicas que precisam revisão
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
    services = ['COUVERT', 'TAXA', 'SERVICO', 'SERVIÇO']

    # Bebidas de bar (precisam ficha técnica mas são simples)
    bar_drinks = ['CAIPIRINHA', 'MOJITO', 'PISCO', 'MARGARITA', 'DAIQUIRI',
                  'COLADA', 'SOUR', 'UMIÑA']

    if any(bev in name_upper for bev in beverages):
        return 'beverage_industrial'  # Não precisa controle de estoque
    elif any(srv in name_upper for srv in services):
        return 'service'  # Não precisa controle de estoque
    elif any(drink in name_upper for drink in bar_drinks):
        return 'beverage_bar'  # Precisa ficha técnica simplificada
    else:
        return 'dish'  # Prato que precisa ficha técnica completa

def get_unmapped_products():
    """Retorna produtos do Zig que não têm recipe_id"""
    # Ler Excel do Zig
    excel_path = project_root / "Relatório de produtos vendidos - janeiro.xlsx"
    df = pd.read_excel(excel_path)

    # Contar vendas por produto
    sales_count = df.groupby(['SKU', 'Nome do Produto']).size().reset_index(name='vendas')

    # Buscar mapeamentos existentes COM recipe_id válido
    mappings_ref = db.collection('product_mappings')
    existing_skus_with_recipe = set()

    for doc in mappings_ref.stream():
        data = doc.to_dict()
        recipe_id = data.get('recipe_id')

        # Apenas contar se tem recipe_id válido (não None, não vazio)
        if recipe_id and recipe_id != 'None' and recipe_id.strip():
            existing_skus_with_recipe.add(data.get('sku'))

    # Filtrar produtos SEM recipe_id
    unmapped = sales_count[~sales_count['SKU'].isin(existing_skus_with_recipe)]
    unmapped = unmapped.sort_values('vendas', ascending=False)

    return unmapped.to_dict('records')

def create_recipe_for_product(product_name, product_type, sales_count):
    """Cria receita básica para produto"""
    recipe_id = generate_id()

    # Configuração baseada no tipo
    needs_inventory_control = product_type in ['dish', 'beverage_bar']

    recipe_data = {
        'id': recipe_id,
        'name': product_name.title(),  # Title Case
        'category': classify_category(product_type),
        'portions': 1,
        'ingredients': [],  # Vazio - time precisa preencher
        'totalCost': 0.0,
        'costPerPortion': 0.0,
        'suggestedPrice': 0.0,
        'notes': f'Criado automaticamente. Produto vendeu {sales_count}x em janeiro. PRECISA REVISÃO.',
        'status': 'draft',  # draft | complete
        'needsReview': True,
        'inventoryControlled': needs_inventory_control,
        'productType': product_type,
        'createdAt': firestore.SERVER_TIMESTAMP,
        'createdBy': 'auto_migration'
    }

    # Salvar no Firestore
    db.collection('recipes').document(recipe_id).set(recipe_data)

    return recipe_id

def classify_category(product_type):
    """Retorna categoria baseada no tipo"""
    categories = {
        'dish': 'Pratos Principais',
        'beverage_bar': 'Bebidas de Bar',
        'beverage_industrial': 'Bebidas Industriais',
        'service': 'Serviços'
    }
    return categories.get(product_type, 'Não Categorizado')

def create_or_update_mapping(sku, product_name, recipe_id, product_type):
    """Cria ou atualiza mapeamento SKU → Receita"""
    mappings_ref = db.collection('product_mappings')

    # Buscar mapeamento existente para este SKU
    query = mappings_ref.where('sku', '==', sku).limit(1)
    docs = list(query.stream())

    mapping_data = {
        'sku': sku,
        'product_name_zig': product_name,
        'recipe_id': recipe_id,
        'recipe_name': product_name.title(),
        'confidence': 1.0,  # Auto-criado = 100%
        'productType': product_type,
        'needsReview': product_type in ['dish', 'beverage_bar'],  # Apenas pratos/bebidas bar precisam revisão
        'updated_at': firestore.SERVER_TIMESTAMP,
        'updated_by': 'auto_migration'
    }

    if docs:
        # Atualizar mapeamento existente
        docs[0].reference.update(mapping_data)
    else:
        # Criar novo mapeamento
        mapping_id = generate_id()
        mapping_data['id'] = mapping_id
        mapping_data['createdAt'] = firestore.SERVER_TIMESTAMP
        mappings_ref.document(mapping_id).set(mapping_data)

def create_review_alert(recipe_id, recipe_name, sales_count, product_type):
    """Cria alerta para receita que precisa revisão"""
    if product_type not in ['dish', 'beverage_bar']:
        return  # Não criar alerta para bebidas industriais/serviços

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
        'status': 'pending',  # pending | resolved
        'createdAt': firestore.SERVER_TIMESTAMP,
        'resolvedAt': None
    }

    db.collection('alerts').document(alert_id).set(alert_data)

def main():
    print("="*80)
    print("CADASTRO DE PRODUTOS NÃO MAPEADOS")
    print("="*80)

    print("\n1️⃣ Buscando produtos não mapeados...")
    unmapped = get_unmapped_products()

    print(f"\n   Encontrados {len(unmapped)} produtos sem mapeamento")
    print(f"   Total de vendas não mapeadas: {sum(p['vendas'] for p in unmapped)}")

    # Estatísticas por tipo
    type_stats = {'dish': 0, 'beverage_bar': 0, 'beverage_industrial': 0, 'service': 0}

    print("\n2️⃣ Criando receitas e mapeamentos...\n")

    created_count = 0
    alerts_count = 0

    for product in unmapped:
        sku = product['SKU']
        name = product['Nome do Produto']
        sales = product['vendas']

        # Classificar tipo
        product_type = classify_product_type(name)
        type_stats[product_type] += 1

        # Criar receita
        recipe_id = create_recipe_for_product(name, product_type, sales)

        # Criar ou atualizar mapeamento
        create_or_update_mapping(sku, name, recipe_id, product_type)

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
    print("✅ CADASTRO COMPLETO!")
    print("="*80)
    print(f"\nReceitas criadas: {created_count}")
    print(f"  🍽️  Pratos principais:        {type_stats['dish']}")
    print(f"  🍹 Bebidas de bar:          {type_stats['beverage_bar']}")
    print(f"  🍺 Bebidas industriais:     {type_stats['beverage_industrial']}")
    print(f"  💰 Serviços/Taxas:          {type_stats['service']}")
    print(f"\nAlertas criados: {alerts_count}")
    print(f"  (para pratos e bebidas de bar que precisam ficha técnica)")

    print("\n📋 Próximos passos:")
    print("  1. Acessar Dashboard → Alertas")
    print("  2. Revisar fichas técnicas marcadas como 'draft'")
    print("  3. Adicionar ingredientes nas fichas dos pratos principais")
    print("  4. Marcar alertas como resolvidos após completar fichas")
    print()

if __name__ == '__main__':
    main()
