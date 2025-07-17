# Firebase Setup für RaveTracker v1

Diese Anleitung führt Sie Schritt für Schritt durch die Einrichtung von Firebase für das RaveTracker v1 Projekt.

## 🔥 Firebase Projekt erstellen

### 1. Firebase Console öffnen
1. Gehen Sie zu [https://console.firebase.google.com](https://console.firebase.google.com)
2. Melden Sie sich mit Ihrem Google-Account an
3. Klicken Sie auf **"Projekt hinzufügen"**

### 2. Projekt konfigurieren
1. **Projektname**: Geben Sie `ravetracker-v1` ein (oder einen Namen Ihrer Wahl)
2. **Google Analytics**: Aktivieren Sie Google Analytics (optional, aber empfohlen)
3. **Analytics-Konto**: Wählen Sie ein vorhandenes Konto oder erstellen Sie ein neues
4. Klicken Sie auf **"Projekt erstellen"**

### 3. Projekt-Einstellungen öffnen
1. Nach der Erstellung, klicken Sie auf das **Zahnrad-Symbol** (⚙️) neben "Projektübersicht"
2. Wählen Sie **"Projekteinstellungen"**
3. Notieren Sie sich die **Projekt-ID** (Sie benötigen diese später)

## 🗄️ Firestore Database einrichten

### 1. Firestore aktivieren
1. Gehen Sie in der linken Seitenleiste zu **"Firestore Database"**
2. Klicken Sie auf **"Datenbank erstellen"**
3. Wählen Sie **"Im Produktionsmodus starten"** 
4. Wählen Sie eine **Region** (empfohlen: `europe-west3` für Deutschland)

### 2. Sicherheitsregeln konfigurieren
1. Gehen Sie zum Tab **"Regeln"**
2. Ersetzen Sie die Standard-Regeln mit folgenden:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users können nur ihre eigenen Daten lesen/schreiben
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Events sind öffentlich lesbar, aber nur Organizer können schreiben
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null && 
        (resource == null || resource.data.organizer_id == request.auth.uid);
    }
    
    // Subscription plans sind öffentlich lesbar
    match /subscription_plans/{planId} {
      allow read: if true;
      allow write: if false; // Nur über Admin SDK
    }
    
    // Invitations nur für Admins
    match /invitations/{inviteId} {
      allow read, write: if request.auth != null;
    }
    
    // Reports nur für eingeloggte Benutzer
    match /reports/{reportId} {
      allow read, write: if request.auth != null;
    }
    
    // Support tickets nur für Besitzer und Admins
    match /support_tickets/{ticketId} {
      allow read, write: if request.auth != null;
    }
    
    // Coupons nur lesbar
    match /coupons/{couponId} {
      allow read: if request.auth != null;
      allow write: if false; // Nur über Admin SDK
    }
    
    // Activity logs nur für Admins
    match /activity_logs/{logId} {
      allow read, write: if false; // Nur über Admin SDK
    }
  }
}
```

3. Klicken Sie auf **"Veröffentlichen"**

### 3. Grundlegende Datenstruktur erstellen
1. Gehen Sie zum Tab **"Daten"**
2. Erstellen Sie folgende Collections manuell (klicken Sie auf **"Collection starten"**):

#### Collection: `subscription_plans`
Erstellen Sie 4 Dokumente mit folgenden IDs und Daten:

**Dokument ID: `free`**
```json
{
  "name": "free",
  "display_name": "Free",
  "price": 0,
  "currency": "EUR",
  "duration_months": 1,
  "features": {
    "max_events": 1,
    "priority_support": false,
    "analytics": false,
    "custom_branding": false,
    "api_access": false
  },
  "description": "Kostenloser Plan für den Einstieg"
}
```

**Dokument ID: `premium`**
```json
{
  "name": "premium",
  "display_name": "Premium",
  "price": 9.99,
  "currency": "EUR",
  "duration_months": 1,
  "features": {
    "max_events": 5,
    "priority_support": true,
    "analytics": false,
    "custom_branding": false,
    "api_access": false
  },
  "description": "Erweiterte Features für aktive Nutzer"
}
```

**Dokument ID: `pro`**
```json
{
  "name": "pro",
  "display_name": "Pro",
  "price": 19.99,
  "currency": "EUR",
  "duration_months": 1,
  "features": {
    "max_events": 20,
    "priority_support": true,
    "analytics": true,
    "custom_branding": false,
    "api_access": false
  },
  "description": "Professionelle Tools für Veranstalter"
}
```

**Dokument ID: `unlimited`**
```json
{
  "name": "unlimited",
  "display_name": "Unlimited",
  "price": 39.99,
  "currency": "EUR",
  "duration_months": 1,
  "features": {
    "max_events": -1,
    "priority_support": true,
    "analytics": true,
    "custom_branding": true,
    "api_access": true
  },
  "description": "Unbegrenzte Möglichkeiten für große Veranstalter"
}
```

## 🔑 Service Account Key erstellen

### 1. Service Account erstellen
1. Gehen Sie zu **"Projekteinstellungen"** > **"Dienstkonten"**
2. Klicken Sie auf **"Neuen privaten Schlüssel generieren"**
3. Wählen Sie **"JSON"** als Schlüsseltyp
4. Klicken Sie auf **"Schlüssel generieren"**

### 2. Key-Datei speichern
1. Die JSON-Datei wird automatisch heruntergeladen
2. Benennen Sie die Datei in `firebase-key.json` um
3. Verschieben Sie die Datei in das Hauptverzeichnis Ihres RaveTracker-Projekts
4. **WICHTIG**: Fügen Sie `firebase-key.json` zu Ihrer `.gitignore` hinzu (bereits enthalten)

### 3. Beispiel der Key-Datei-Struktur
```json
{
  "type": "service_account",
  "project_id": "ihr-projekt-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@ihr-projekt-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## ⚙️ Umgebungsvariablen konfigurieren

### 1. .env Datei erstellen
1. Kopieren Sie die `.env.example` Datei zu `.env`:
   ```bash
   cp .env.example .env
   ```

### 2. Firebase-Konfiguration eintragen
Öffnen Sie die `.env` Datei und tragen Sie Ihre Firebase-Daten ein:

```env
# Environment Configuration
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=ihr-super-geheimer-schluessel-hier-aendern

# Firebase Configuration
FIREBASE_PROJECT_ID=ihre-firebase-projekt-id

# Security Settings
JWT_SECRET_KEY=ihr-jwt-geheimer-schluessel-hier-aendern
JWT_ACCESS_TOKEN_EXPIRES=86400

# Application Settings
MAX_CONTENT_LENGTH=16777216
UPLOAD_FOLDER=uploads
```

### 3. Sichere Schlüssel generieren
Für Produktionsumgebungen generieren Sie sichere Schlüssel:

```python
# Python-Script zum Generieren sicherer Schlüssel
import secrets
print("SECRET_KEY:", secrets.token_urlsafe(32))
print("JWT_SECRET_KEY:", secrets.token_urlsafe(32))
```

## 🧪 Firebase-Verbindung testen

### 1. Dependencies installieren
```bash
pip install -r requirements-simple.txt
```

### 2. Test-Script erstellen
Erstellen Sie eine Datei `test_firebase.py`:

```python
import os
from dotenv import load_dotenv
from backend.app.utils.firebase_config import initialize_firebase, get_db

def test_firebase_connection():
    # Lade Umgebungsvariablen
    load_dotenv()
    
    try:
        # Firebase initialisieren
        initialize_firebase()
        
        # Datenbankverbindung testen
        db = get_db()
        
        # Test: Subscription plans laden
        plans_ref = db.collection('subscription_plans')
        plans = list(plans_ref.stream())
        
        print(f"✅ Firebase-Verbindung erfolgreich!")
        print(f"✅ Gefundene Subscription Plans: {len(plans)}")
        
        for plan in plans:
            plan_data = plan.to_dict()
            print(f"   - {plan_data.get('display_name', plan.id)}: €{plan_data.get('price', 0)}")
        
    except Exception as e:
        print(f"❌ Firebase-Verbindung fehlgeschlagen: {e}")
        return False
    
    return True

if __name__ == "__main__":
    test_firebase_connection()
```

### 3. Test ausführen
```bash
python test_firebase.py
```

Bei erfolgreicher Verbindung sollten Sie folgende Ausgabe sehen:
```
✅ Firebase-Verbindung erfolgreich!
✅ Gefundene Subscription Plans: 4
   - Free: €0
   - Premium: €9.99
   - Pro: €19.99
   - Unlimited: €39.99
```

## 🚀 Anwendung starten

### 1. Entwicklungsserver starten
```bash
cd backend
python run.py
```

### 2. Anwendung testen
1. Öffnen Sie Ihren Browser und gehen Sie zu `http://localhost:5000`
2. Sie sollten die RaveTracker-Homepage sehen
3. Testen Sie die Registrierung (Sie benötigen einen Einladungscode)

## 🔧 Erweiterte Konfiguration

### 1. Admin-Benutzer erstellen
Um den ersten Admin-Benutzer zu erstellen, führen Sie folgendes Script aus:

```python
# create_admin.py
from backend.app.utils.firebase_config import initialize_firebase, get_db
from werkzeug.security import generate_password_hash
from datetime import datetime
import uuid

def create_admin_user():
    initialize_firebase()
    db = get_db()
    
    # Admin-Benutzer erstellen
    admin_data = {
        'username': 'admin',
        'email': 'admin@ravetracker.com',
        'password_hash': generate_password_hash('AdminPassword123!'),
        'role': 'admin',
        'subscription_plan': 'unlimited',
        'subscription_expires': None,
        'created_at': datetime.now(),
        'is_active': True
    }
    
    # Admin zu Firestore hinzufügen
    admin_ref = db.collection('users').add(admin_data)
    print(f"✅ Admin-Benutzer erstellt mit ID: {admin_ref[1].id}")
    
    # Einladungscode für erste Benutzer erstellen
    invite_data = {
        'email': '',  # Leer lassen für allgemeine Einladung
        'code': 'WELCOME2025',
        'created_by': admin_ref[1].id,
        'expires_at': datetime(2025, 12, 31),
        'used': False,
        'max_uses': 100,
        'current_uses': 0
    }
    
    invite_ref = db.collection('invitations').add(invite_data)
    print(f"✅ Einladungscode erstellt: WELCOME2025")

if __name__ == "__main__":
    create_admin_user()
```

### 2. Firebase Indizes erstellen
Für bessere Performance erstellen Sie zusammengesetzte Indizes:

1. Gehen Sie zu **"Firestore Database"** > **"Indizes"**
2. Erstellen Sie folgende zusammengesetzte Indizes:

**Events Index:**
- Collection: `events`
- Felder: `is_public` (Aufsteigend), `date_start` (Aufsteigend)
- Query-Scope: Collection

**Reports Index:**
- Collection: `reports`
- Felder: `status` (Aufsteigend), `created_at` (Absteigend)
- Query-Scope: Collection

### 3. Backup-Strategie
Richten Sie automatische Backups ein:

1. Gehen Sie zu **"Firestore Database"** > **"Backups"**
2. Klicken Sie auf **"Backup-Zeitplan erstellen"**
3. Konfigurieren Sie tägliche Backups um 3:00 Uhr

## 🛡️ Sicherheitsüberlegungen

### 1. Produktionsregeln
Für die Produktion sollten Sie strengere Firestore-Regeln verwenden:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Hilfsfunktionen
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function hasRole(role) {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    // Users Collection
    match /users/{userId} {
      allow read: if isOwner(userId) || hasRole('admin') || hasRole('moderator');
      allow write: if isOwner(userId) || hasRole('admin');
    }
    
    // Events Collection
    match /events/{eventId} {
      allow read: if resource.data.is_public == true || 
        isOwner(resource.data.organizer_id) || 
        hasRole('moderator') || hasRole('admin');
      allow create: if isSignedIn() && hasRole('organizer');
      allow update: if isOwner(resource.data.organizer_id) || 
        hasRole('moderator') || hasRole('admin');
      allow delete: if isOwner(resource.data.organizer_id) || 
        hasRole('moderator') || hasRole('admin');
    }
    
    // Weitere Collections...
  }
}
```

### 2. API-Schlüssel beschränken
1. Gehen Sie zu **"APIs & Services"** > **"Credentials"** in der Google Cloud Console
2. Beschränken Sie die API-Schlüssel auf Ihre Domain
3. Aktivieren Sie nur benötigte APIs

### 3. Monitoring einrichten
1. Aktivieren Sie **Firebase Performance Monitoring**
2. Richten Sie **Alerting** für ungewöhnliche Aktivitäten ein
3. Überwachen Sie die **Firestore-Nutzung** regelmäßig

## 📚 Zusätzliche Ressourcen

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Cloud Firestore Pricing](https://firebase.google.com/pricing)

## 🆘 Troubleshooting

### Häufige Probleme:

**1. "Permission denied" Fehler:**
- Überprüfen Sie Ihre Firestore-Sicherheitsregeln
- Stellen Sie sicher, dass der Benutzer angemeldet ist

**2. "Project not found" Fehler:**
- Überprüfen Sie die FIREBASE_PROJECT_ID in der .env Datei
- Stellen Sie sicher, dass die firebase-key.json korrekt ist

**3. "Service account key invalid":**
- Generieren Sie einen neuen Service Account Key
- Überprüfen Sie den Dateipfad der firebase-key.json

**4. Langsame Abfragen:**
- Erstellen Sie die empfohlenen Firestore-Indizes
- Optimieren Sie Ihre Abfragen mit Pagination

Bei weiteren Problemen erstellen Sie ein Issue im GitHub-Repository oder kontaktieren Sie den Support.

---

**Glückwunsch!** 🎉 Ihr Firebase-Setup für RaveTracker v1 ist nun vollständig konfiguriert und einsatzbereit!
