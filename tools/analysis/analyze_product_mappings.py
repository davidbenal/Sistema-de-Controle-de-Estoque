#!/usr/bin/env python3
"""
Análise de Data Matching: Zig × Ficha Técnica

Gera relatório detalhado de:
1. Mapeamentos atuais (alta vs baixa confiança)
2. Inconsistências e duplicatas
3. Sugestões de padronização
4. Produtos não mapeados
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
from fuzzywuzzy import fuzz
from collections import defaultdict
import json

# Load environment variables
project_root = Path(__file__).parent.parent.parent
env_path = project_root / '.env'
load_dotenv(env_path)

# Initialize Firebase
creds_path = project_root / 'firebase-credentials.json'
cred = credentials.Certificate(str(creds_path))
firebase_admin.initialize_app(cred)
db = get_firestore_client()

def get_mappings():
    """Busca todos os mapeamentos do Firebase"""
    mappings_ref = db.collection('product_mappings')
    mappings = []

    for doc in mappings_ref.stream():
        data = doc.to_dict()
        data['doc_id'] = doc.id
        mappings.append(data)

    return mappings

def get_recipes():
    """Busca todas as receitas do Firebase"""
    recipes_ref = db.collection('recipes')
    recipes = []

    for doc in recipes_ref.stream():
        data = doc.to_dict()
        data['doc_id'] = doc.id
        recipes.append(data)

    return recipes

def load_zig_data():
    """Carrega dados originais do relatório Zig"""
    excel_path = project_root / "Relatório de produtos vendidos - janeiro.xlsx"
    df = pd.read_excel(excel_path)

    # Produtos únicos com contagem de vendas
    products = df.groupby(['SKU', 'Nome do Produto']).size().reset_index(name='vendas_janeiro')
    return products.to_dict('records')

def analyze_name_patterns(mappings, recipes):
    """Analisa padrões nos nomes para sugerir padronizações"""

    patterns = {
        'capitalization_issues': [],
        'special_chars': [],
        'extra_spaces': [],
        'abbreviations': [],
        'duplicates': []
    }

    # Verificar capitalization
    for m in mappings:
        zig_name = m.get('product_name_zig', '')
        recipe_name = m.get('recipe_name', '')

        if zig_name and zig_name != zig_name.title():
            patterns['capitalization_issues'].append({
                'sku': m.get('sku'),
                'original': zig_name,
                'suggested': zig_name.title()
            })

    # Verificar espaços extras
    for m in mappings:
        zig_name = m.get('product_name_zig', '')
        if '  ' in zig_name or zig_name != zig_name.strip():
            patterns['extra_spaces'].append({
                'sku': m.get('sku'),
                'original': repr(zig_name),
                'suggested': ' '.join(zig_name.split())
            })

    # Verificar duplicatas semânticas
    recipe_names = [r['name'] for r in recipes]
    seen = defaultdict(list)

    for recipe in recipes:
        normalized = recipe['name'].lower().strip()
        seen[normalized].append(recipe)

    for normalized, recipe_list in seen.items():
        if len(recipe_list) > 1:
            patterns['duplicates'].append({
                'normalized': normalized,
                'variants': [r['name'] for r in recipe_list],
                'ids': [r['doc_id'] for r in recipe_list]
            })

    return patterns

def generate_report(mappings, recipes, zig_products, patterns):
    """Gera relatório completo de análise"""

    # Helper para converter confidence para float
    def get_confidence(mapping):
        conf = mapping.get('confidence', 0)
        if isinstance(conf, str):
            try:
                return float(conf)
            except:
                return 0.0
        return float(conf) if conf else 0.0

    # Estatísticas gerais
    high_confidence = [m for m in mappings if get_confidence(m) > 0.8]
    low_confidence = [m for m in mappings if 0 < get_confidence(m) <= 0.8]
    unmapped = [m for m in mappings if not m.get('recipe_id') or get_confidence(m) == 0]

    report = {
        'timestamp': pd.Timestamp.now().isoformat(),
        'statistics': {
            'total_mappings': len(mappings),
            'high_confidence': len(high_confidence),
            'low_confidence': len(low_confidence),
            'unmapped': len(unmapped),
            'total_recipes': len(recipes),
            'total_zig_products': len(zig_products)
        },
        'high_confidence_mappings': [
            {
                'sku': m['sku'],
                'zig_name': m['product_name_zig'],
                'recipe_name': m.get('recipe_name', 'N/A'),
                'confidence': f"{get_confidence(m):.1%}"
            }
            for m in sorted(high_confidence, key=lambda x: get_confidence(x), reverse=True)
        ],
        'low_confidence_mappings': [
            {
                'sku': m['sku'],
                'zig_name': m['product_name_zig'],
                'recipe_name': m.get('recipe_name', 'N/A'),
                'recipe_id': m.get('recipe_id', 'N/A'),
                'confidence': f"{get_confidence(m):.1%}",
                'suggested_alternatives': find_better_matches(m['product_name_zig'], recipes)[:3]
            }
            for m in sorted(low_confidence, key=lambda x: get_confidence(x))
        ],
        'unmapped_products': [
            {
                'sku': m['sku'],
                'zig_name': m['product_name_zig'],
                'vendas_janeiro': get_sales_count(m['sku'], zig_products),
                'suggested_matches': find_better_matches(m['product_name_zig'], recipes)[:5]
            }
            for m in unmapped
        ],
        'data_quality_issues': {
            'capitalization': patterns['capitalization_issues'][:10],
            'extra_spaces': patterns['extra_spaces'],
            'duplicates': patterns['duplicates']
        },
        'recommendations': generate_recommendations(mappings, patterns)
    }

    return report

def find_better_matches(zig_name, recipes, threshold=60):
    """Encontra melhores matches possíveis"""
    matches = []

    for recipe in recipes:
        ratio = fuzz.token_sort_ratio(zig_name.lower(), recipe['name'].lower())
        if ratio >= threshold:
            matches.append({
                'recipe_name': recipe['name'],
                'recipe_id': recipe['doc_id'],
                'similarity': f"{ratio}%"
            })

    return sorted(matches, key=lambda x: int(x['similarity'].rstrip('%')), reverse=True)

def get_sales_count(sku, zig_products):
    """Retorna contagem de vendas do SKU"""
    for p in zig_products:
        if p['SKU'] == sku:
            return p.get('vendas_janeiro', 0)
    return 0

def generate_recommendations(mappings, patterns):
    """Gera recomendações de ações"""
    recs = []

    # Helper para converter confidence
    def get_confidence(mapping):
        conf = mapping.get('confidence', 0)
        if isinstance(conf, str):
            try:
                return float(conf)
            except:
                return 0.0
        return float(conf) if conf else 0.0

    # Recomendação 1: Revisar baixa confiança
    low_conf_count = len([m for m in mappings if get_confidence(m) <= 0.8])
    if low_conf_count > 0:
        recs.append({
            'priority': 'HIGH',
            'category': 'Mapeamentos',
            'issue': f'{low_conf_count} mapeamentos com baixa confiança (<80%)',
            'action': 'Revisar manualmente e confirmar ou corrigir mapeamentos',
            'impact': 'Vendas podem decrementar estoque incorreto'
        })

    # Recomendação 2: Duplicatas
    if patterns['duplicates']:
        recs.append({
            'priority': 'MEDIUM',
            'category': 'Duplicatas',
            'issue': f'{len(patterns["duplicates"])} receitas duplicadas detectadas',
            'action': 'Consolidar receitas duplicadas em uma única receita',
            'impact': 'Dados fragmentados e relatórios inconsistentes'
        })

    # Recomendação 3: Padronização
    if patterns['capitalization_issues'] or patterns['extra_spaces']:
        recs.append({
            'priority': 'LOW',
            'category': 'Padronização',
            'issue': 'Nomes com capitalization e espaços inconsistentes',
            'action': 'Aplicar Title Case e remover espaços extras',
            'impact': 'Melhor usabilidade e busca'
        })

    return recs

def save_report(report, output_path):
    """Salva relatório em JSON e gera versão legível"""

    # JSON completo
    json_path = output_path / 'mapping_analysis_report.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    # Versão legível em TXT
    txt_path = output_path / 'mapping_analysis_report.txt'
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write("="*80 + "\n")
        f.write("RELATÓRIO DE ANÁLISE: DATA MATCHING ZIG × FICHA TÉCNICA\n")
        f.write("="*80 + "\n\n")

        # Estatísticas
        f.write("📊 ESTATÍSTICAS GERAIS\n")
        f.write("-"*80 + "\n")
        for key, value in report['statistics'].items():
            f.write(f"{key.replace('_', ' ').title():<30} {value:>10}\n")

        # Recomendações
        f.write("\n\n🎯 RECOMENDAÇÕES PRIORITÁRIAS\n")
        f.write("-"*80 + "\n")
        for i, rec in enumerate(report['recommendations'], 1):
            f.write(f"\n{i}. [{rec['priority']}] {rec['category']}\n")
            f.write(f"   Problema: {rec['issue']}\n")
            f.write(f"   Ação: {rec['action']}\n")
            f.write(f"   Impacto: {rec['impact']}\n")

        # Mapeamentos baixa confiança (top 10)
        f.write("\n\n⚠️  TOP 10 MAPEAMENTOS PARA REVISAR (Baixa Confiança)\n")
        f.write("-"*80 + "\n")
        for i, m in enumerate(report['low_confidence_mappings'][:10], 1):
            f.write(f"\n{i}. SKU: {m['sku']} | Confiança: {m['confidence']}\n")
            f.write(f"   Zig: {m['zig_name']}\n")
            f.write(f"   → Mapeado para: {m['recipe_name']}\n")
            if m['suggested_alternatives']:
                f.write(f"   Alternativas sugeridas:\n")
                for alt in m['suggested_alternatives'][:3]:
                    f.write(f"      - {alt['recipe_name']} ({alt['similarity']})\n")

        # Produtos não mapeados
        if report['unmapped_products']:
            f.write("\n\n❌ PRODUTOS NÃO MAPEADOS\n")
            f.write("-"*80 + "\n")
            for i, p in enumerate(report['unmapped_products'], 1):
                f.write(f"\n{i}. SKU: {p['sku']} | Vendas: {p['vendas_janeiro']}\n")
                f.write(f"   Nome: {p['zig_name']}\n")
                if p['suggested_matches']:
                    f.write(f"   Sugestões:\n")
                    for s in p['suggested_matches'][:3]:
                        f.write(f"      - {s['recipe_name']} ({s['similarity']})\n")

        # Duplicatas
        if report['data_quality_issues']['duplicates']:
            f.write("\n\n🔄 RECEITAS DUPLICADAS\n")
            f.write("-"*80 + "\n")
            for i, dup in enumerate(report['data_quality_issues']['duplicates'], 1):
                f.write(f"\n{i}. {dup['normalized']}\n")
                f.write(f"   Variantes:\n")
                for variant in dup['variants']:
                    f.write(f"      - {variant}\n")

    return json_path, txt_path

def main():
    print("🔍 Analisando mapeamentos Zig × Ficha Técnica...\n")

    # Buscar dados
    print("1️⃣ Carregando dados do Firebase...")
    mappings = get_mappings()
    recipes = get_recipes()

    print("2️⃣ Carregando dados do relatório Zig...")
    zig_products = load_zig_data()

    print("3️⃣ Analisando padrões e qualidade de dados...")
    patterns = analyze_name_patterns(mappings, recipes)

    print("4️⃣ Gerando relatório completo...")
    report = generate_report(mappings, recipes, zig_products, patterns)

    # Salvar relatório
    output_dir = project_root / 'tools' / 'analysis'
    output_dir.mkdir(exist_ok=True)

    json_path, txt_path = save_report(report, output_dir)

    print("\n✅ Análise completa!\n")
    print(f"📄 Relatório JSON: {json_path}")
    print(f"📝 Relatório TXT: {txt_path}")

    # Resumo
    print("\n" + "="*80)
    print("RESUMO DA ANÁLISE")
    print("="*80)
    print(f"Total de mapeamentos: {report['statistics']['total_mappings']}")
    print(f"  ✅ Alta confiança (>80%): {report['statistics']['high_confidence']}")
    print(f"  ⚠️  Baixa confiança (≤80%): {report['statistics']['low_confidence']}")
    print(f"  ❌ Não mapeados: {report['statistics']['unmapped']}")
    print(f"\nReceitas no sistema: {report['statistics']['total_recipes']}")
    print(f"Produtos no Zig: {report['statistics']['total_zig_products']}")
    print("\n" + "="*80)
    print("\n🎯 Próximo passo: Revisar relatório e aprovar correções\n")

if __name__ == '__main__':
    main()
