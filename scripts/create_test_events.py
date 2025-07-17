#!/usr/bin/env python3
"""
RaveTracker v1 - Create Test Event
GNU GPL v3 Licensed
"""

import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta

def create_test_event():
    """Create a test event in Firestore."""
    try:
        # Path to Firebase service account key
        key_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'firebase-key.json')
        
        if not os.path.exists(key_path):
            print(f"❌ Firebase key not found at: {key_path}")
            return False
        
        # Initialize Firebase Admin SDK
        if not firebase_admin._apps:
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        
        # Create test event data
        event_data = {
            'title': 'Goa Psytrance Festival 2025',
            'description': 'Eine magische Reise durch psychedelische Klänge in der Natur. Erlebe die besten Goa- und Psytrance-Artists in einer einzigartigen Atmosphäre.',
            'genre': 'goa',
            'date_start': datetime(2025, 8, 15, 20, 0),
            'date_end': datetime(2025, 8, 17, 6, 0),
            'location': 'Waldlichtung am Chiemsee, Bayern',
            'location_coordinates': {
                'lat': 47.8774,
                'lng': 12.3761
            },
            'price': 45.00,
            'price_currency': 'EUR',
            'max_attendees': 500,
            'current_attendees': 23,
            'organizer_id': 'test_organizer',
            'organizer_name': 'Nature Sounds Collective',
            'status': 'published',
            'is_featured': True,
            'tags': ['outdoor', 'psychedelic', 'forest', 'camping'],
            'age_restriction': 18,
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'images': [
                'https://via.placeholder.com/800x400/4ecdc4/ffffff?text=Goa+Festival+2025'
            ]
        }
        
        # Add to Firestore
        doc_ref = db.collection('events').add(event_data)
        print(f"✅ Test event created with ID: {doc_ref[1].id}")
        
        # Create another test event
        event_data2 = {
            'title': 'Drum & Bass Underground',
            'description': 'The hardest DNB beats in the underground scene. Join us for a night of pure bass madness.',
            'genre': 'dnb',
            'date_start': datetime(2025, 7, 25, 22, 0),
            'date_end': datetime(2025, 7, 26, 8, 0),
            'location': 'Industrial Warehouse, Berlin',
            'location_coordinates': {
                'lat': 52.5200,
                'lng': 13.4050
            },
            'price': 25.00,
            'price_currency': 'EUR',
            'max_attendees': 300,
            'current_attendees': 87,
            'organizer_id': 'test_organizer2',
            'organizer_name': 'Underground Collective',
            'status': 'published',
            'is_featured': False,
            'tags': ['underground', 'warehouse', 'bass'],
            'age_restriction': 18,
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'images': [
                'https://via.placeholder.com/800x400/45b7d1/ffffff?text=DNB+Underground'
            ]
        }
        
        doc_ref2 = db.collection('events').add(event_data2)
        print(f"✅ Second test event created with ID: {doc_ref2[1].id}")
        
        # Create a hardcore event
        event_data3 = {
            'title': 'Hardcore Mayhem 2025',
            'description': 'The most intense hardcore experience. Only for the brave ones who can handle 200+ BPM.',
            'genre': 'hardcore',
            'date_start': datetime(2025, 9, 5, 23, 0),
            'date_end': datetime(2025, 9, 6, 12, 0),
            'location': 'Abandoned Factory, Amsterdam',
            'location_coordinates': {
                'lat': 52.3676,
                'lng': 4.9041
            },
            'price': 35.00,
            'price_currency': 'EUR',
            'max_attendees': 800,
            'current_attendees': 234,
            'organizer_id': 'test_organizer3',
            'organizer_name': 'Hardcore United',
            'status': 'published',
            'is_featured': True,
            'tags': ['hardcore', 'gabber', 'industrial'],
            'age_restriction': 18,
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'images': [
                'https://via.placeholder.com/800x400/f39c12/ffffff?text=Hardcore+Mayhem'
            ]
        }
        
        doc_ref3 = db.collection('events').add(event_data3)
        print(f"✅ Third test event created with ID: {doc_ref3[1].id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating test events: {str(e)}")
        return False

if __name__ == "__main__":
    print("🎉 Creating test events for RaveTracker...")
    success = create_test_event()
    if success:
        print("✅ Test events created successfully!")
    else:
        print("❌ Failed to create test events")
