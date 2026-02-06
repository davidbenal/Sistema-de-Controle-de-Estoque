#!/usr/bin/env python3
"""
Script de Migração: Importar dados do Excel Montuvia para Firebase

Este script:
1. Lê 236 ingredientes do sheet "CADASTRO DE INSUMOS"
2. Lê ~100 produtos do sheet "PRECIFICADOS"
3. Cria mapeamentos automáticos SKU Zig → Recipe ID
4. Popula Firebase Firestore
5. Gera relatório de migração

Uso:
    python tools/migrations/import_montuvia_initial_data.py
"""

import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import json
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import pandas as pd
import firebase_admin
from firebase_admin import credentials
from google.cloud import firestore
from firebase_helper import get_firestore_client
from fuzzywuzzy import fuzz
import unicodedata

# Paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXCEL_FICHA_TECNICA = os.path.join(PROJECT_ROOT, "MONTUVIA - FICHA TECNICA PRO (1).xlsx")
EXCEL_RELATORIO_ZIG = os.path.join(PROJECT_ROOT, "Relatório de produtos vendidos - janeiro.xlsx")
CREDENTIALS_PATH = os.path.join(PROJECT_ROOT, "firebase-credentials.json")

# Initialize Firebase
cred = credentials.Certificate(CREDENTIALS_PATH)
firebase_admin.initialize_app(cred)
db = get_firestore_client()

# Helper functions
def normalize_string(s: str) -> str:
    """Normaliza string para comparação (remove acentos, lowercase, trim)"""
    if pd.isna(s):
        return ""
    s = str(s).lower().strip()
    s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII')
    return s

def generate_id() -> str:
    """Gera ID único para documentos"""
    return db.collection('_temp').document().id

def classify_category(nome: str) -> str:
    """Classifica categoria do ingrediente baseado no nome"""
    nome_lower = normalize_string(nome)

    # Bebidas
    if any(word in nome_lower for word in ['cerveja', 'vinho', 'drink', 'suco', 'refrigerante', 'agua', 'vodka', 'whisky', 'cachaca']):
        return 'bebida'

    # Limpeza
    if any(word in nome_lower for word in ['detergente', 'sabao', 'desinfetante', 'alcool', 'papel toalha', 'saco lixo']):
        return 'limpeza'

    # Descartáveis
    if any(word in nome_lower for word in ['copo', 'prato', 'guardanapo', 'talher', 'embalagem', 'sacola']):
        return 'descartavel'

    # Perecíveis (padrão para ingredientes de comida)
    return 'perecivel'

def normalize_unit(unit: str) -> str:
    """Normaliza unidades de medida"""
    if pd.isna(unit):
        return 'un'

    unit = str(unit).lower().strip()
    mapping = {
        'un': 'un',
        'unidade': 'un',
        'kg': 'kg',
        'g': 'g',
        'gramas': 'g',
        'l': 'l',
        'litro': 'l',
        'ml': 'ml',
        'mililitro': 'ml',
        'pct': 'pct',
        'pacote': 'pct',
    }

    return mapping.get(unit, unit)

def estimate_min_stock(row: pd.Series) -> float:
    """Estima estoque mínimo baseado em heurística"""
    # Regra simples: 20% da quantidade comprada ou 1 unidade
    qty = row.get('Qtd. LÍQUIDA', 1)
    if pd.isna(qty):
        return 1.0
    return max(float(qty) * 0.2, 1.0)

def estimate_max_stock(row: pd.Series) -> float:
    """Estima estoque máximo baseado em heurística"""
    # Regra simples: 3x o estoque mínimo
    min_stock = estimate_min_stock(row)
    return min_stock * 3

def extract_price(value) -> float:
    """Extrai preço de valores variados"""
    if pd.isna(value):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    # Remove R$, espaços, e converte
    value_str = str(value).replace('R$', '').replace(' ', '').replace(',', '.')
    try:
        return float(value_str)
    except:
        return 0.0

def find_best_match(search_name: str, candidates: List[Dict[str, str]], threshold: int = 80) -> Dict:
    """Encontra melhor match usando fuzzy matching"""
    search_normalized = normalize_string(search_name)
    best_score = 0
    best_match = None

    for candidate in candidates:
        candidate_normalized = normalize_string(candidate['name'])
        score = fuzz.ratio(search_normalized, candidate_normalized)

        if score > best_score:
            best_score = score
            best_match = candidate

    confidence = "auto-high" if best_score >= threshold else "low"
    needs_review = best_score < threshold

    return {
        "recipe_id": best_match['id'] if best_match else None,
        "recipe_name": best_match['name'] if best_match else None,
        "confidence": confidence,
        "score": best_score,
        "needs_review": needs_review
    }

# Main import functions
def import_suppliers() -> Dict[str, str]:
    """Importa fornecedores do Excel e retorna mapeamento nome → ID"""
    print("\n[1/5] Importando fornecedores...")

    df = pd.read_excel(EXCEL_FICHA_TECNICA, sheet_name="CADASTRO DE INSUMOS")
    unique_suppliers = df['FORNECEDORES'].dropna().unique()

    supplier_map = {}
    suppliers_created = 0

    for supplier_name in unique_suppliers:
        supplier_name = str(supplier_name).strip()
        if not supplier_name or supplier_name == 'nan':
            continue

        supplier_id = generate_id()
        supplier_data = {
            'id': supplier_id,
            'name': supplier_name,
            'contact': '',  # Preencher manualmente depois
            'deliveryTime': 2,  # Padrão: 2 dias
            'paymentTerms': 'A vista',  # Padrão
            'createdAt': firestore.SERVER_TIMESTAMP
        }

        db.collection('suppliers').document(supplier_id).set(supplier_data)
        supplier_map[supplier_name] = supplier_id
        suppliers_created += 1
        print(f"  ✓ {supplier_name}")

    print(f"✓ {suppliers_created} fornecedores criados")
    return supplier_map

def import_ingredients(supplier_map: Dict[str, str]) -> int:
    """Importa 236 ingredientes do Excel"""
    print("\n[2/5] Importando ingredientes...")

    df = pd.read_excel(EXCEL_FICHA_TECNICA, sheet_name="CADASTRO DE INSUMOS")
    ingredients_created = 0

    for _, row in df.iterrows():
        nome = row.get('NOME INSUMO')
        if pd.isna(nome):
            continue

        supplier_name = str(row.get('FORNECEDORES', ''))
        supplier_id = supplier_map.get(supplier_name, '')

        ingredient_id = generate_id()
        ingredient_data = {
            'id': ingredient_id,
            'name': str(nome).strip(),
            'category': classify_category(nome),
            'unit': normalize_unit(row.get('Unidade')),
            'grossQuantity': float(row.get('Qtd. BRUTA', 0)),
            'netQuantity': float(row.get('Qtd. LÍQUIDA', 0)),
            'yieldFactor': float(row.get('Fator', 1.0)),
            'price': float(row.get('Preço', 0)),
            'supplierId': supplier_id,
            'purchaseDate': str(row.get('Data da Compra', ''))[:10] if not pd.isna(row.get('Data da Compra')) else '',
            'currentStock': 0.0,  # Iniciar zerado
            'minStock': estimate_min_stock(row),
            'maxStock': estimate_max_stock(row),
            'storageCenter': 'cozinha',  # Padrão
            'createdAt': firestore.SERVER_TIMESTAMP
        }

        db.collection('ingredients').document(ingredient_id).set(ingredient_data)
        ingredients_created += 1

        if ingredients_created % 50 == 0:
            print(f"  → {ingredients_created} ingredientes...")

    print(f"✓ {ingredients_created} ingredientes criados")
    return ingredients_created

def import_recipes() -> Tuple[int, List[Dict[str, str]]]:
    """Importa ~100 produtos/receitas do Excel"""
    print("\n[3/5] Importando produtos/receitas...")

    # Ler sheet - headers estão na linha 2 (zero-indexed)
    df = pd.read_excel(EXCEL_FICHA_TECNICA, sheet_name="PRECIFICADOS", header=2)
    recipes_created = 0
    recipes_list = []

    for _, row in df.iterrows():
        nome = row.get('LISTA DE PRODUTOS')

        # Pular se nome vazio
        if pd.isna(nome) or str(nome).strip() == '':
            continue

        recipe_id = generate_id()
        price = extract_price(row.get('PREÇO DE VENDA', 0))

        recipe_data = {
            'id': recipe_id,
            'name': str(nome).strip(),
            'category': 'Não categorizado',  # Revisar depois
            'portions': 1,
            'ingredients': [],  # Vazio (sheets P01-P100 são complexas, fazer manual)
            'totalCost': 0.0,
            'costPerPortion': 0.0,
            'suggestedPrice': price,
            'notes': 'Importado automaticamente. Revisar ficha técnica completa.',
            'createdAt': firestore.SERVER_TIMESTAMP
        }

        db.collection('recipes').document(recipe_id).set(recipe_data)
        recipes_list.append({'id': recipe_id, 'name': recipe_data['name']})
        recipes_created += 1

    print(f"✓ {recipes_created} receitas criadas")
    return recipes_created, recipes_list

def import_product_mappings(recipes_list: List[Dict[str, str]]) -> Tuple[int, int]:
    """Cria mapeamentos SKU Zig → Recipe ID"""
    print("\n[4/5] Criando mapeamentos SKU → Receita...")

    df_zig = pd.read_excel(EXCEL_RELATORIO_ZIG)
    unique_products = df_zig[['SKU', 'Nome do Produto']].drop_duplicates()

    mappings_high = 0
    mappings_low = 0

    for _, zig_product in unique_products.iterrows():
        sku = str(zig_product['SKU'])
        product_name = str(zig_product['Nome do Produto'])

        # Fuzzy match com receitas
        best_match = find_best_match(product_name, recipes_list)

        mapping_id = generate_id()
        mapping_data = {
            'id': mapping_id,
            'sku': sku,
            'product_name_zig': product_name,
            'recipe_id': best_match['recipe_id'],
            'recipe_name': best_match['recipe_name'],
            'confidence': best_match['confidence'],
            'match_score': best_match['score'],
            'needs_review': best_match['needs_review'],
            'last_updated': firestore.SERVER_TIMESTAMP
        }

        db.collection('product_mappings').document(mapping_id).set(mapping_data)

        if best_match['needs_review']:
            mappings_low += 1
        else:
            mappings_high += 1

    print(f"✓ {mappings_high} mapeamentos alta confiança (>80%)")
    print(f"⚠ {mappings_low} mapeamentos precisam revisão (<80%)")

    return mappings_high, mappings_low

def generate_report(stats: Dict) -> None:
    """Gera relatório de migração em JSON"""
    print("\n[5/5] Gerando relatório...")

    report = {
        'migration_date': datetime.now().isoformat(),
        'suppliers_created': stats['suppliers'],
        'ingredients_imported': stats['ingredients'],
        'recipes_created': stats['recipes'],
        'mappings_high_confidence': stats['mappings_high'],
        'mappings_need_review': stats['mappings_low'],
        'total_mappings': stats['mappings_high'] + stats['mappings_low'],
        'success_rate': round(
            (stats['mappings_high'] / (stats['mappings_high'] + stats['mappings_low'])) * 100, 1
        ) if (stats['mappings_high'] + stats['mappings_low']) > 0 else 0
    }

    report_path = os.path.join(PROJECT_ROOT, 'tools', 'migrations', 'migration_report.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"✓ Relatório salvo: migration_report.json\n")
    print("=" * 80)
    print("📊 RESUMO DA MIGRAÇÃO")
    print("=" * 80)
    for key, value in report.items():
        if key != 'migration_date':
            label = key.replace('_', ' ').title()
            print(f"  {label:.<50} {value}")
    print("=" * 80)
    print(f"\n✅ Taxa de sucesso: {report['success_rate']}%")
    print(f"⚠️  Mapeamentos para revisar: {stats['mappings_low']}")
    print("\n📝 PRÓXIMO PASSO: Revisar mapeamentos no sistema\n")

# Main execution
if __name__ == '__main__':
    print("\n" + "=" * 80)
    print("🚀 MIGRAÇÃO: Dados Montuvia → Firebase")
    print("=" * 80)

    # Verificar arquivos
    if not os.path.exists(EXCEL_FICHA_TECNICA):
        print(f"❌ Arquivo não encontrado: {EXCEL_FICHA_TECNICA}")
        sys.exit(1)

    if not os.path.exists(EXCEL_RELATORIO_ZIG):
        print(f"❌ Arquivo não encontrado: {EXCEL_RELATORIO_ZIG}")
        sys.exit(1)

    if not os.path.exists(CREDENTIALS_PATH):
        print(f"❌ Credenciais Firebase não encontradas: {CREDENTIALS_PATH}")
        print("Execute: Siga SETUP_FIREBASE.md para gerar credenciais")
        sys.exit(1)

    try:
        # Executar importações
        supplier_map = import_suppliers()
        ingredients_count = import_ingredients(supplier_map)
        recipes_count, recipes_list = import_recipes()
        mappings_high, mappings_low = import_product_mappings(recipes_list)

        # Gerar relatório
        generate_report({
            'suppliers': len(supplier_map),
            'ingredients': ingredients_count,
            'recipes': recipes_count,
            'mappings_high': mappings_high,
            'mappings_low': mappings_low
        })

        print("✅ Migração concluída com sucesso!\n")

    except Exception as e:
        print(f"\n❌ Erro durante migração:")
        print(f"   {str(e)}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)
