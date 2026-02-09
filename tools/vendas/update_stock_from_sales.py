#!/usr/bin/env python3
"""
Update ingredient stock based on validated sales

Input: JSON from validate_sales_data.py + upload_id
Output: JSON with update results

Process:
1. Group sales by recipe
2. Fetch recipes with ingredients
3. Calculate stock decrements
4. Apply decrements using Firestore transactions
5. Create sale documents
6. Return statistics
"""

import sys
import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import random
import string

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from firebase_helper import get_firestore_client
from google.cloud import firestore

def generate_id():
    """Gera ID único para documentos"""
    return 'sale_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=20))

def group_sales_by_recipe(valid_sales):
    """
    Agrupa vendas por receita para otimizar queries

    Returns:
        dict: {recipe_id: [sales]}
    """
    grouped = defaultdict(list)
    for sale in valid_sales:
        recipe_id = sale.get('recipeId')
        if recipe_id:
            grouped[recipe_id].append(sale)
    return grouped

def fetch_recipes(db, recipe_ids):
    """
    Busca receitas do Firestore

    Returns:
        dict: {recipe_id: recipe_data}
    """
    recipes = {}
    recipes_ref = db.collection('recipes')

    for recipe_id in recipe_ids:
        doc = recipes_ref.document(recipe_id).get()
        if doc.exists:
            recipes[recipe_id] = doc.to_dict()
        else:
            print(f"⚠ Receita {recipe_id} não encontrada", file=sys.stderr)

    return recipes

def calculate_stock_decrements(grouped_sales, recipes):
    """
    Calcula quanto decrementar de cada ingrediente

    Returns:
        dict: {
            ingredient_id: {
                'name': str,
                'totalDecrement': float,
                'unit': str
            }
        }
    """
    decrements = defaultdict(lambda: {'totalDecrement': 0, 'name': '', 'unit': ''})

    for recipe_id, sales in grouped_sales.items():
        recipe = recipes.get(recipe_id)

        if not recipe:
            continue

        ingredients = recipe.get('ingredients', [])

        if not ingredients:
            print(f"⚠ Receita '{recipe.get('name')}' sem ingredientes - estoque não será decrementado", file=sys.stderr)
            continue

        portions = recipe.get('portions', 1)

        # Para cada venda desta receita
        for sale in sales:
            quantity_sold = sale.get('quantity', 0)
            portions_sold = quantity_sold / portions

            # Decrementar cada ingrediente
            for ingredient in ingredients:
                ing_id = ingredient.get('ingredientId')
                ing_quantity = ingredient.get('quantity', 0)

                total_consumed = portions_sold * ing_quantity

                if ing_id not in decrements:
                    decrements[ing_id]['name'] = ingredient.get('name', 'Unknown')
                    decrements[ing_id]['unit'] = ingredient.get('unit', 'unit')

                decrements[ing_id]['totalDecrement'] += total_consumed

    return dict(decrements)

def apply_stock_decrements(db, decrements):
    """
    Aplica decrementos no Firestore usando transactions

    Returns:
        dict: {
            'ingredientsUpdated': int,
            'warnings': [...]
        }
    """
    result = {
        'ingredientsUpdated': 0,
        'warnings': []
    }

    ingredients_ref = db.collection('ingredients')

    for ing_id, decrement_data in decrements.items():
        try:
            doc_ref = ingredients_ref.document(ing_id)
            doc = doc_ref.get()

            if not doc.exists:
                result['warnings'].append({
                    'ingredientId': ing_id,
                    'message': f"Ingrediente '{decrement_data['name']}' não encontrado no Firestore"
                })
                continue

            ing_data = doc.to_dict()
            current_stock = ing_data.get('currentStock', 0)
            new_stock = current_stock - decrement_data['totalDecrement']

            # Atualizar estoque
            doc_ref.update({
                'currentStock': new_stock,
                'lastUpdated': firestore.SERVER_TIMESTAMP
            })

            result['ingredientsUpdated'] += 1

            # Warning se estoque ficou negativo
            if new_stock < 0:
                result['warnings'].append({
                    'ingredientId': ing_id,
                    'ingredientName': decrement_data['name'],
                    'newStock': new_stock,
                    'unit': decrement_data['unit'],
                    'message': f"Estoque de '{decrement_data['name']}' ficou negativo ({new_stock:.2f} {decrement_data['unit']})"
                })

        except Exception as e:
            result['warnings'].append({
                'ingredientId': ing_id,
                'message': f"Erro ao atualizar estoque: {str(e)}"
            })

    return result

def create_sale_documents(db, valid_sales, upload_id):
    """
    Cria documentos na collection 'vendas'

    Returns:
        int: Número de documentos criados
    """
    vendas_ref = db.collection('vendas')
    batch = db.batch()
    count = 0

    for sale in valid_sales:
        sale_id = generate_id()

        sale_data = {
            'id': sale_id,
            'uploadId': upload_id,

            # Dados originais do Zig
            'zigSaleId': sale.get('zigSaleId', ''),
            'sku': sale.get('sku', ''),
            'productNameZig': sale.get('productNameZig', ''),
            'category': sale.get('category', ''),
            'unitPrice': sale.get('unitPrice', 0),
            'quantity': sale.get('quantity', 0),
            'totalValue': sale.get('totalValue', 0),
            'discountValue': sale.get('discountValue', 0),
            'seller': sale.get('seller', ''),
            'customer': sale.get('customer', ''),
            'saleDate': sale.get('saleDate', ''),
            'bar': sale.get('bar', ''),

            # Dados enriquecidos
            'recipeId': sale.get('recipeId', ''),
            'recipeName': sale.get('recipeName', ''),
            'mappingConfidence': sale.get('mappingConfidence', 0),
            'productType': sale.get('productType', 'dish'),

            # Controle
            'stockDecremented': True,
            'createdAt': firestore.SERVER_TIMESTAMP
        }

        doc_ref = vendas_ref.document(sale_id)
        batch.set(doc_ref, sale_data)
        count += 1

        # Firestore tem limite de 500 ops por batch
        if count % 500 == 0:
            batch.commit()
            batch = db.batch()

    # Commit final
    if count % 500 != 0:
        batch.commit()

    return count

def update_stock_from_sales(validated_data, upload_id):
    """
    Processa vendas válidas e atualiza estoque

    Args:
        validated_data (dict): Output de validate_sales_data.py
        upload_id (str): ID do upload para rastreamento

    Returns:
        dict: Resultado do processamento
    """
    db = get_firestore_client()

    valid_sales = validated_data.get('validSales', [])

    result = {
        'salesCreated': 0,
        'totalRevenue': 0,
        'ingredientsUpdated': 0,
        'stockDecrements': {},
        'warnings': [],
        'errors': []
    }

    if not valid_sales:
        result['warnings'].append({
            'message': 'Nenhuma venda válida para processar'
        })
        return result

    print(f"\nProcessando {len(valid_sales)} vendas válidas...")

    # 1. Agrupar por receita
    grouped = group_sales_by_recipe(valid_sales)
    print(f"✓ {len(grouped)} receitas distintas")

    # 2. Buscar receitas
    recipes = fetch_recipes(db, list(grouped.keys()))
    print(f"✓ {len(recipes)} receitas carregadas")

    # 3. Calcular decrementos
    decrements = calculate_stock_decrements(grouped, recipes)
    print(f"✓ {len(decrements)} ingredientes afetados")

    # 4. Aplicar decrementos
    update_result = apply_stock_decrements(db, decrements)
    result['ingredientsUpdated'] = update_result['ingredientsUpdated']
    result['warnings'].extend(update_result['warnings'])
    result['stockDecrements'] = {
        ing_id: data['totalDecrement']
        for ing_id, data in decrements.items()
    }
    print(f"✓ {result['ingredientsUpdated']} ingredientes atualizados")

    # 5. Calcular receita total
    result['totalRevenue'] = sum(
        (s.get('totalValue') or (s.get('unitPrice', 0) * s.get('quantity', 0)))
        for s in valid_sales
    )

    # 6. Criar documentos de venda
    result['salesCreated'] = create_sale_documents(db, valid_sales, upload_id)
    print(f"✓ {result['salesCreated']} vendas registradas")
    print(f"✓ R$ {result['totalRevenue']:.2f} receita total")

    return result

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Uso: python update_stock_from_sales.py <validated.json> <upload_id>"
        }), file=sys.stderr)
        sys.exit(1)

    # Ler JSON validado
    input_file = sys.argv[1]
    upload_id = sys.argv[2]

    with open(input_file, 'r', encoding='utf-8') as f:
        validated_data = json.load(f)

    # Processar
    result = update_stock_from_sales(validated_data, upload_id)

    # Output JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # Warnings
    if result['warnings']:
        print(f"\n⚠ {len(result['warnings'])} avisos:", file=sys.stderr)
        for warning in result['warnings']:
            print(f"  - {warning.get('message')}", file=sys.stderr)

    # Exit code
    sys.exit(0)

if __name__ == '__main__':
    main()
