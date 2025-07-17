# RaveTracker v1 🎵

**Die Plattform für Partys und Festivals** aus den Bereichen Goa, Psytrance, DnB und Hardcore.

## 📋 Überblick

RaveTracker v1 ist eine umfassende Web-Plattform, die es ermöglicht, elektronische Musik-Events zu veröffentlichen, zu entdecken und zu verwalten. Mit einem Fokus auf die Underground-Szene bietet die Anwendung erweiterte Features für Veranstalter, Moderatoren und die Community.

## 🚀 Features

### Core Features
- **Event-Management**: Erstellen, bearbeiten und verwalten von Partys und Festivals
- **Event-Kalender**: Monats- und Listenansicht mit Such- und Filterfunktionen
- **Benutzer-Dashboard**: Verwalten von Interessen, Teilnahmen und Abonnements
- **Invite-System**: Registrierung nur mit Einladungscode
- **Rollenbasierte Zugriffssteuerung**: User, Veranstalter, Moderator, Admin

### Erweiterte Features
- **Abonnements**: Free, Premium, Pro, Unlimited Pläne
- **Meldesystem**: Community-Moderation für Events, User und Kommentare
- **Support-Tickets**: Integriertes Ticketsystem
- **Gutschein-System**: Rabattcodes und Gratis-Monate

## 🏗️ Projektstruktur

```
ravetracker_v1/
├── backend/                 # Flask Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models/         # Firestore Models
│   │   ├── blueprints/     # Flask Blueprints
│   │   │   ├── auth/       # Authentifizierung
│   │   │   ├── events/     # Event-Management
│   │   │   ├── subscriptions/  # Abonnements
│   │   │   ├── reports/    # Meldesystem
│   │   │   └── support/    # Support-Tickets
│   │   └── utils/          # Hilfsfunktionen
│   ├── config.py
│   ├── requirements.txt
│   └── run.py
├── frontend/               # Jinja2 Templates & Assets
│   ├── templates/
│   ├── static/
│   │   ├── css/           # Glassmorphism Design
│   │   ├── js/            # Vanilla JavaScript
│   │   └── images/
├── tests/                  # Unit & Integration Tests
├── docs/                   # Dokumentation
└── docker-compose.yml      # Entwicklungsumgebung
```

## 🔧 Installation & Setup

### Voraussetzungen
- Python 3.9+
- Firebase Account & Firestore Database
- Git

### 1. Repository klonen
```bash
git clone <repository-url>
cd ravetracker_v1
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Umgebungsvariablen konfigurieren
Erstellen Sie eine `.env` Datei im `backend/` Verzeichnis:

```env
# Flask Configuration
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Application Configuration
INVITE_CODES_PER_USER=5
DEFAULT_USER_ROLE=user
```

### 4. Firebase Setup
1. Erstellen Sie ein Firebase-Projekt in der [Firebase Console](https://console.firebase.google.com/)
2. Aktivieren Sie Firestore Database
3. Erstellen Sie einen Service Account und laden Sie die JSON-Datei herunter
4. Konfigurieren Sie die Umgebungsvariablen entsprechend

### 5. Anwendung starten
```bash
cd backend
python run.py
```

Die Anwendung ist dann unter `http://localhost:5000` verfügbar.

## 🗄️ Datenbank Schema (Firestore)

### Collections

#### `users`
```json
{
  "uid": "string",
  "email": "string",
  "username": "string",
  "role": "user|organizer|moderator|admin",
  "subscription_plan": "free|premium|pro|unlimited",
  "invite_codes_used": "array",
  "invite_codes_generated": "array",
  "created_at": "timestamp",
  "last_login": "timestamp"
}
```

#### `events`
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "genre": "goa|psytrance|dnb|hardcore",
  "organizer_id": "string",
  "date_start": "timestamp",
  "date_end": "timestamp",
  "location": "string",
  "price": "number",
  "is_public": "boolean",
  "attendees": "array",
  "interested": "array",
  "created_at": "timestamp"
}
```

#### `plans`
```json
{
  "id": "string",
  "name": "string",
  "price": "number",
  "events_limit": "number",
  "features": "array",
  "is_active": "boolean"
}
```

## 🎨 Frontend Design

Das Frontend verwendet ein **Glassmorphism Design** ohne Bootstrap:
- Transparente Elemente mit Blur-Effekten
- Responsive Design für alle Geräte
- Moderne Farbpalette passend zur elektronischen Musik-Szene
- Vanilla JavaScript für Interaktivität

## 🧪 Tests

### Unit Tests ausführen
```bash
cd tests
python -m pytest unit/
```

### Integration Tests ausführen
```bash
python -m pytest integration/
```

### Alle Tests ausführen
```bash
python -m pytest
```

## 🚀 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Produktions-Deployment
Siehe `docs/deployment.md` für detaillierte Anweisungen.

## 📚 API Dokumentation

Die vollständige API-Dokumentation finden Sie unter `docs/api.md`.

### Wichtige Endpunkte
- `GET /api/events` - Events auflisten
- `POST /api/events` - Event erstellen
- `POST /api/auth/register` - Registrierung mit Invite-Code
- `POST /api/reports` - Meldung erstellen

## 🤝 Beitragen

1. Fork das Repository
2. Erstellen Sie einen Feature Branch (`git checkout -b feature/amazing-feature`)
3. Committen Sie Ihre Änderungen (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffnen Sie eine Pull Request

## 📋 Roadmap

### Phase 1 (Aktuell)
- [x] Grundlegende Projektstruktur
- [x] Authentifizierung & RBAC
- [x] Event-Management
- [x] Basic Frontend

### Phase 2
- [ ] Geolocation & Maps
- [ ] E-Mail Benachrichtigungen
- [ ] Social Media Integration
- [ ] Payment Integration

### Phase 3
- [ ] Mehrsprachigkeit (i18n)
- [ ] Analytics Dashboard
- [ ] Dark Mode
- [ ] SEO Optimierung

## 📄 Lizenz

Dieses Projekt steht unter der [GNU General Public License v3.0](LICENSE).

## 👥 Contributors

- Hauptentwickler: [Ihr Name]

## 📞 Support

Bei Fragen oder Problemen erstellen Sie bitte ein [Issue](../../issues) oder nutzen Sie das integrierte Support-Ticketsystem.

---

**RaveTracker v1** - Verbinde die elektronische Musik-Community 🎵✨
