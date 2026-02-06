#!/usr/bin/env python3
"""
Validate sales data and enrich with recipe mappings

Input: JSON from parse_sales_file.py
Output: JSON with validSales and invalidSales

Connects to Firestore to fetch product_mappings (SKU → Recipe)
"""

import sys
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from firebase_helper import get_firestore_client

def load_mappings():
    """
    Carrega mapeamentos SKU → Recipe do Firestore

    Returns:
        dict: {sku: {recipe_id, recipe_name, confidence, ...}}
    """
    db = get_firestore_client()
    mappings = {}

    mappings_ref = db.collection('product_mappings')
    for doc in mappings_ref.stream():
        data = doc.to_dict()
        sku = data.get('sku')
        if sku:
            mappings[sku] = {
                'recipeId': data.get('recipe_id'),
                'recipeName': data.get('recipe_name'),
                'confidence': data.get('confidence', 0),
                'productType': data.get('productType', 'dish')
            }

    return mappings

def validate_sales_data(sales_data):
    """
    Valida vendas e enriquece com dados de mapeamento

    Args:
        sales_data (dict): Output de parse_sales_file.py

    Returns:
        dict: {
            "validSales": [...],
            "invalidSales": [...],
            "stats": {...}
        }
    """
    result = {
        "validSales": [],
        "invalidSales": [],
        "stats": {
            "total": 0,
            "valid": 0,
            "invalid": 0,
            "unmappedSkus": set()
        }
    }

    # Carregar mapeamentos
    print("Carregando mapeamentos do Firestore...")
    mappings = load_mappings()
    print(f"✓ {len(mappings)} mapeamentos carregados")

    # Processar cada venda
    for sale in sales_data.get("sales", []):
        result["stats"]["total"] += 1
        sku = sale.get('sku')

        # Validações básicas
        errors = []

        if not sku or sku.strip() == '':
            errors.append("SKU vazio")

        if sale.get('quantity', 0) <= 0:
            errors.append("Quantidade inválida ou zero")

        if not sale.get('saleDate'):
            errors.append("Data inválida")

        # Verificar mapeamento
        if sku not in mappings:
            errors.append(f"SKU '{sku}' não mapeado para receita")
            result["stats"]["unmappedSkus"].add(sku)

        # Se tem erros, marcar como inválida
        if errors:
            result["invalidSales"].append({
                **sale,
                "isValid": False,
                "errors": errors
            })
            result["stats"]["invalid"] += 1
            continue

        # Enriquecer com dados do mapeamento
        mapping = mappings[sku]

        valid_sale = {
            **sale,
            "recipeId": mapping['recipeId'],
            "recipeName": mapping['recipeName'],
            "mappingConfidence": mapping['confidence'],
            "productType": mapping['productType'],
            "isValid": True
        }

        result["validSales"].append(valid_sale)
        result["stats"]["valid"] += 1

    # Converter set para list para JSON
    result["stats"]["unmappedSkus"] = list(result["stats"]["unmappedSkus"])

    return result

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Uso: python validate_sales_data.py <sales.json>"
        }), file=sys.stderr)
        sys.exit(1)

    # Ler JSON de entrada
    input_file = sys.argv[1]
    with open(input_file, 'r', encoding='utf-8') as f:
        sales_data = json.load(f)

    # Validar
    result = validate_sales_data(sales_data)

    # Output JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # Estatísticas
    print(f"\n✓ Total: {result['stats']['total']}", file=sys.stderr)
    print(f"✓ Válidas: {result['stats']['valid']}", file=sys.stderr)
    print(f"✗ Inválidas: {result['stats']['invalid']}", file=sys.stderr)

    if result['stats']['unmappedSkus']:
        print(f"\n⚠ SKUs não mapeados:", file=sys.stderr)
        for sku in result['stats']['unmappedSkus']:
            print(f"  - {sku}", file=sys.stderr)

    # Exit code
    if result["stats"]["invalid"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
