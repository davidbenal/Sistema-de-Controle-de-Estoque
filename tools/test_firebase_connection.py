#!/usr/bin/env python3
"""
Test Firebase connection and credentials.
Run this script after downloading firebase-credentials.json to verify setup.
"""

import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, storage
from google.cloud import firestore
from firebase_helper import get_firestore_client

# Load environment variables
project_root = Path(__file__).parent.parent
env_path = project_root / '.env'
load_dotenv(env_path)

def test_firebase_connection():
    """Test Firebase connection and basic operations"""

    print("🔥 Testing Firebase Connection...\n")

    # Check credentials file
    creds_path = project_root / 'firebase-credentials.json'
    if not creds_path.exists():
        print("❌ ERRO: firebase-credentials.json não encontrado!")
        print(f"   Esperado em: {creds_path}")
        print("\n📋 Instruções:")
        print("   1. Acesse: https://console.firebase.google.com/project/restges-montuvia/settings/serviceaccounts/adminsdk")
        print("   2. Clique em 'Generate new private key'")
        print("   3. Mova o arquivo para o diretório do projeto")
        print("   4. Renomeie para 'firebase-credentials.json'")
        return False

    print(f"✅ Credenciais encontradas: {creds_path}")

    # Initialize Firebase
    try:
        cred = credentials.Certificate(str(creds_path))
        firebase_admin.initialize_app(cred, {
            'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET'),
            'databaseURL': f'https://{os.getenv("FIREBASE_PROJECT_ID")}.firebaseio.com'
        })
        print("✅ Firebase inicializado com sucesso")
    except Exception as e:
        print(f"❌ ERRO ao inicializar Firebase: {e}")
        return False

    # Test Firestore (using montuvia1 database in São Paulo)
    try:
        db = get_firestore_client()

        # Try to write a test document
        test_ref = db.collection('_test').document('connection_test')
        test_ref.set({
            'timestamp': firestore.SERVER_TIMESTAMP,
            'status': 'connected',
            'message': 'Firebase connection test successful'
        })

        # Read it back
        doc = test_ref.get()
        if doc.exists:
            print("✅ Firestore: Leitura e escrita OK")
            # Clean up
            test_ref.delete()
        else:
            print("⚠️  Firestore: Escrita OK, mas leitura falhou")

    except Exception as e:
        print(f"❌ ERRO no Firestore: {e}")
        return False

    # Test Storage
    try:
        bucket = storage.bucket()
        print(f"✅ Storage: Bucket '{bucket.name}' acessível")
    except Exception as e:
        print(f"❌ ERRO no Storage: {e}")
        return False

    print("\n🎉 Todos os testes passaram! Firebase está configurado corretamente.\n")
    return True

if __name__ == '__main__':
    success = test_firebase_connection()
    sys.exit(0 if success else 1)
