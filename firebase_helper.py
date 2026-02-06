#!/usr/bin/env python3
"""
Helper para inicializar Firebase com database montuvia1 (São Paulo)
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, storage
from google.cloud import firestore
from google.oauth2 import service_account

# Load environment variables
PROJECT_ROOT = Path(__file__).parent  # firebase_helper.py is in project root
env_path = PROJECT_ROOT / '.env'
load_dotenv(env_path)

def get_firestore_client():
    """
    Retorna cliente Firestore configurado para database montuvia1

    Returns:
        firestore.Client: Cliente Firestore conectado ao database montuvia1
    """
    creds_path = PROJECT_ROOT / 'firebase-credentials.json'

    if not creds_path.exists():
        raise FileNotFoundError(
            f"firebase-credentials.json not found at {creds_path}"
        )

    # Inicializar Firebase Admin se ainda não foi
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(creds_path))
        firebase_admin.initialize_app(cred, {
            'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET'),
        })

    # Criar cliente Firestore com credenciais explícitas
    creds = service_account.Credentials.from_service_account_file(
        str(creds_path)
    )

    db = firestore.Client(
        project=os.getenv('FIREBASE_PROJECT_ID', 'restges-montuvia'),
        credentials=creds,
        database='montuvia1'  # Database in São Paulo
    )

    return db

def get_storage_bucket():
    """
    Retorna bucket do Storage

    Returns:
        storage.Bucket: Bucket do Firebase Storage
    """
    return storage.bucket()
