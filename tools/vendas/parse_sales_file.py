#!/usr/bin/env python3
"""
Parse sales file from Zig PDV (Excel or CSV format)

Input: Path to XLSX/XLS/CSV file
Output: JSON with structured sales data

Expected columns from Zig:
- id, SKU, Nome do Produto, Categoria, Valor Unitário, Quantidade,
  Vendedor, Cliente, Data, Bar
"""

import sys
import json
from pathlib import Path
from datetime import datetime
import pandas as pd

def normalize_column_name(col):
    """Normaliza nome de coluna para camelCase"""
    mapping = {
        'id': 'zigSaleId',
        'SKU': 'sku',
        'Nome do Produto': 'productNameZig',
        'Categoria': 'category',
        'Valor Unitário': 'unitPrice',
        'Valor Unitáro': 'unitPrice',  # Typo comum no export Zig
        'Quantidade': 'quantity',
        'Valor de Desconto': 'discountValue',
        'Vendedor': 'seller',
        'Cliente': 'customer',
        'Data': 'saleDate',
        'Valor total': 'totalValue',
        'Bar': 'bar',
        'Data do Evento': 'eventDate',
    }
    return mapping.get(col, col)

def parse_date(date_value):
    """Converte data para ISO string"""
    if pd.isna(date_value):
        return None

    if isinstance(date_value, str):
        # Try parsing various date formats (Brasil format first)
        for fmt in ['%d/%m/%Y %H:%M:%S', '%d/%m/%Y', '%Y-%m-%d', '%Y-%m-%d %H:%M:%S']:
            try:
                dt = datetime.strptime(date_value, fmt)
                return dt.isoformat()
            except ValueError:
                continue
        return None
    elif isinstance(date_value, datetime):
        return date_value.isoformat()
    elif isinstance(date_value, pd.Timestamp):
        return date_value.isoformat()

    return None

def parse_sales_file(file_path):
    """
    Lê arquivo de vendas e retorna estrutura JSON

    Args:
        file_path (str): Caminho para arquivo XLSX/XLS/CSV

    Returns:
        dict: {
            "sales": [...],
            "totalRows": int,
            "parseErrors": [...]
        }
    """
    result = {
        "sales": [],
        "totalRows": 0,
        "parseErrors": []
    }

    file_path = Path(file_path)

    # Verificar se arquivo existe
    if not file_path.exists():
        result["parseErrors"].append({
            "error": f"Arquivo não encontrado: {file_path}"
        })
        return result

    # Detectar formato e ler arquivo
    try:
        if file_path.suffix.lower() in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        elif file_path.suffix.lower() == '.csv':
            df = pd.read_csv(file_path)
        else:
            result["parseErrors"].append({
                "error": f"Formato não suportado: {file_path.suffix}. Use XLSX, XLS ou CSV"
            })
            return result
    except Exception as e:
        result["parseErrors"].append({
            "error": f"Erro ao ler arquivo: {str(e)}"
        })
        return result

    result["totalRows"] = len(df)

    # Verificar colunas obrigatórias
    required_columns = ['SKU', 'Nome do Produto', 'Quantidade', 'Data']
    missing_columns = [col for col in required_columns if col not in df.columns]

    if missing_columns:
        result["parseErrors"].append({
            "error": "Colunas obrigatórias faltando",
            "missingColumns": missing_columns,
            "foundColumns": list(df.columns),
            "suggestion": "Verifique se exportou o relatório correto do Zig (Relatório de produtos vendidos)"
        })
        return result

    # Processar cada linha
    for index, row in df.iterrows():
        try:
            # Normalizar dados
            sale = {}

            for col in df.columns:
                normalized_col = normalize_column_name(col)
                value = row[col]

                # Converter data
                if normalized_col == 'saleDate':
                    sale[normalized_col] = parse_date(value)
                # Converter numéricos
                elif normalized_col in ['unitPrice', 'quantity', 'totalValue', 'discountValue']:
                    sale[normalized_col] = float(value) if pd.notna(value) else 0
                # String
                else:
                    sale[normalized_col] = str(value) if pd.notna(value) else ""

            # Validação básica
            if not sale.get('sku'):
                result["parseErrors"].append({
                    "row": index + 2,  # Excel row (header = 1)
                    "error": "SKU vazio"
                })
                continue

            if sale.get('quantity', 0) <= 0:
                result["parseErrors"].append({
                    "row": index + 2,
                    "sku": sale.get('sku'),
                    "error": "Quantidade inválida ou zero"
                })
                continue

            if not sale.get('saleDate'):
                result["parseErrors"].append({
                    "row": index + 2,
                    "sku": sale.get('sku'),
                    "error": "Data inválida"
                })
                continue

            result["sales"].append(sale)

        except Exception as e:
            result["parseErrors"].append({
                "row": index + 2,
                "error": f"Erro ao processar linha: {str(e)}"
            })

    return result

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Uso: python parse_sales_file.py <arquivo.xlsx>"
        }), file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]
    result = parse_sales_file(file_path)

    # Output JSON para stdout
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # Exit code
    if result["parseErrors"]:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
