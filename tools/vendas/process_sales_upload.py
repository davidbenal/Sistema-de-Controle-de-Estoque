#!/usr/bin/env python3
"""
Orchestrator for sales upload processing

Executes the full pipeline:
1. Parse Excel file
2. Validate and enrich with mappings
3. Update stock from sales
4. Update sales_uploads document with results

Usage: python process_sales_upload.py <excel_file> <upload_id>
"""

import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime
import tempfile

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from firebase_helper import get_firestore_client
from google.cloud import firestore

def run_tool(script_name, args):
    """
    Executa um Python tool e retorna o resultado

    Args:
        script_name (str): Nome do script Python
        args (list): Lista de argumentos

    Returns:
        dict: Resultado do script (parsed JSON)
    """
    script_path = Path(__file__).parent / script_name
    cmd = ['python3', str(script_path)] + args

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False  # Don't raise on non-zero exit
        )

        # Parse apenas stdout como JSON (ignore stderr - warnings)
        if result.stdout:
            # Filter out lines that are not JSON (warnings, etc)
            lines = result.stdout.strip().split('\n')

            # Try to find JSON in output (usually last lines)
            for i in range(len(lines)):
                # Try parsing from this line onwards
                json_candidate = '\n'.join(lines[i:])
                try:
                    return json.loads(json_candidate)
                except json.JSONDecodeError:
                    continue

            # If no valid JSON found, return error
            return {"error": "Nenhum JSON válido encontrado no output", "stdout": result.stdout[:500]}
        else:
            return {"error": "Sem output do script", "stderr": result.stderr[:500]}

    except Exception as e:
        return {"error": f"Erro ao executar {script_name}: {str(e)}"}
def update_sales_upload_status(db, upload_id, status, data=None):
    """
    Atualiza status do upload no Firestore

    Args:
        db: Firestore client
        upload_id (str): ID do upload
        status (str): "processing" | "completed" | "failed"
        data (dict): Dados adicionais para atualizar
    """
    upload_ref = db.collection('sales_uploads').document(upload_id)

    update_data = {
        'status': status,
        'updatedAt': firestore.SERVER_TIMESTAMP
    }

    if status == 'completed':
        update_data['completedAt'] = firestore.SERVER_TIMESTAMP

    if data:
        update_data.update(data)

    # Use set with merge to create if not exists
    upload_ref.set(update_data, merge=True)

def process_sales_upload(excel_file, upload_id):
    """
    Processa upload de vendas completo

    Args:
        excel_file (str): Caminho do arquivo Excel
        upload_id (str): ID do upload para rastreamento

    Returns:
        dict: Resultado consolidado
    """
    db = get_firestore_client()
    start_time = datetime.now()

    result = {
        'uploadId': upload_id,
        'status': 'processing',
        'steps': {},
        'errors': [],
        'warnings': []
    }

    # Marcar como "processing"
    update_sales_upload_status(db, upload_id, 'processing')
    print(f"\n{'='*80}")
    print(f"PROCESSANDO UPLOAD: {upload_id}")
    print(f"Arquivo: {excel_file}")
    print(f"{'='*80}\n")

    # STEP 1: Parse Excel
    print("1️⃣ Parsing arquivo Excel...")
    parse_result = run_tool('parse_sales_file.py', [excel_file])

    if 'error' in parse_result or parse_result.get('parseErrors'):
        result['status'] = 'failed'
        result['errors'].append({
            'step': 'parse',
            'message': parse_result.get('error', 'Erros ao parsear arquivo'),
            'details': parse_result.get('parseErrors', [])
        })
        update_sales_upload_status(db, upload_id, 'failed', {
            'errors': result['errors']
        })
        return result

    result['steps']['parse'] = {
        'totalRows': parse_result.get('totalRows', 0),
        'salesParsed': len(parse_result.get('sales', [])),
        'parseErrors': len(parse_result.get('parseErrors', []))
    }
    print(f"   ✓ {result['steps']['parse']['salesParsed']} vendas parseadas")

    # Salvar resultado temporário
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(parse_result, f, ensure_ascii=False)
        parsed_file = f.name

    # STEP 2: Validate and enrich
    print("\n2️⃣ Validando e enriquecendo com mapeamentos...")
    validate_result = run_tool('validate_sales_data.py', [parsed_file])

    if 'error' in validate_result:
        result['status'] = 'failed'
        result['errors'].append({
            'step': 'validate',
            'message': validate_result.get('error', 'Erro ao validar dados')
        })
        update_sales_upload_status(db, upload_id, 'failed', {
            'errors': result['errors']
        })
        return result

    stats = validate_result.get('stats', {})
    result['steps']['validate'] = {
        'total': stats.get('total', 0),
        'valid': stats.get('valid', 0),
        'invalid': stats.get('invalid', 0),
        'unmappedSkus': stats.get('unmappedSkus', [])
    }
    print(f"   ✓ {result['steps']['validate']['valid']} vendas válidas")
    print(f"   ✗ {result['steps']['validate']['invalid']} vendas inválidas")

    if result['steps']['validate']['unmappedSkus']:
        print(f"   ⚠ SKUs não mapeados: {', '.join(result['steps']['validate']['unmappedSkus'])}")
        result['warnings'].append({
            'message': f"{len(result['steps']['validate']['unmappedSkus'])} SKUs não mapeados",
            'skus': result['steps']['validate']['unmappedSkus']
        })

    # Salvar resultado validado
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(validate_result, f, ensure_ascii=False)
        validated_file = f.name

    # STEP 3: Update stock
    print("\n3️⃣ Atualizando estoque...")
    stock_result = run_tool('update_stock_from_sales.py', [validated_file, upload_id])

    if 'error' in stock_result:
        result['status'] = 'failed'
        result['errors'].append({
            'step': 'update_stock',
            'message': stock_result.get('error', 'Erro ao atualizar estoque')
        })
        update_sales_upload_status(db, upload_id, 'failed', {
            'errors': result['errors']
        })
        return result

    result['steps']['update_stock'] = {
        'salesCreated': stock_result.get('salesCreated', 0),
        'totalRevenue': stock_result.get('totalRevenue', 0),
        'ingredientsUpdated': stock_result.get('ingredientsUpdated', 0),
        'stockDecrements': stock_result.get('stockDecrements', {})
    }
    result['warnings'].extend(stock_result.get('warnings', []))

    print(f"   ✓ {result['steps']['update_stock']['salesCreated']} vendas registradas")
    print(f"   ✓ {result['steps']['update_stock']['ingredientsUpdated']} ingredientes atualizados")

    # Cleanup temp files
    Path(parsed_file).unlink(missing_ok=True)
    Path(validated_file).unlink(missing_ok=True)

    # FINAL: Marcar como completed
    end_time = datetime.now()
    processing_time_ms = int((end_time - start_time).total_seconds() * 1000)

    result['status'] = 'completed'
    result['processingTimeMs'] = processing_time_ms

    update_sales_upload_status(db, upload_id, 'completed', {
        'processingResults': {
            'totalRows': result['steps']['parse']['totalRows'],
            'validRows': result['steps']['validate']['valid'],
            'invalidRows': result['steps']['validate']['invalid'],
            'skippedRows': result['steps']['parse']['parseErrors'],
            'stockUpdated': True
        },
        'salesCreated': result['steps']['update_stock']['salesCreated'],
        'totalRevenue': result['steps']['update_stock'].get('totalRevenue', 0),
        'ingredientsUpdated': result['steps']['update_stock']['ingredientsUpdated'],
        'errors': result['errors'],
        'warnings': result['warnings'],
        'processingTimeMs': processing_time_ms
    })

    print(f"\n{'='*80}")
    print(f"✅ UPLOAD COMPLETO!")
    print(f"{'='*80}")
    print(f"Tempo de processamento: {processing_time_ms}ms")
    print(f"Vendas registradas: {result['steps']['update_stock']['salesCreated']}")
    print(f"Ingredientes atualizados: {result['steps']['update_stock']['ingredientsUpdated']}")

    if result['warnings']:
        print(f"\n⚠ {len(result['warnings'])} avisos - verifique os detalhes")

    return result

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Uso: python process_sales_upload.py <excel_file> <upload_id>"
        }), file=sys.stderr)
        sys.exit(1)

    excel_file = sys.argv[1]
    upload_id = sys.argv[2]

    result = process_sales_upload(excel_file, upload_id)

    # Output JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # Exit code
    if result['status'] == 'failed':
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
