# RaveTracker v1 - Administration Scripts

This directory contains various administrative tools and scripts for managing the RaveTracker platform.

## 📋 Available Scripts

### 🔧 create_admin.py
**Interactive Admin Creation Tool**

Creates the first admin user from existing registered users with an interactive selection interface.

#### Features:
- ✅ Lists all registered users with details
- ✅ Interactive navigation (number selection + n/m keys)
- ✅ Windows/Unix compatible input handling
- ✅ Colorized output with role indicators
- ✅ Safety confirmations before promotion
- ✅ Automatic admin privilege assignment

#### Usage:
```bash
cd scripts
python create_admin.py
```

#### Navigation:
- **Numbers (1-N)**: Direct user selection
- **n**: Move selection up
- **m**: Move selection down  
- **ENTER**: Select current highlighted user
- **q**: Quit without changes

#### Requirements:
- `firebase-key.json` in project root
- `colorama` package (auto-installed)
- Existing registered users in Firestore

#### Admin Privileges Granted:
- Full platform management
- User management and moderation
- Event approval and moderation
- System configuration access
- Database administration

---

## 🚀 Setup Instructions

1. **Ensure Firebase Key**: Place `firebase-key.json` in the project root directory
2. **Install Dependencies**: Scripts will auto-install required packages
3. **Run Scripts**: Execute from the `/scripts` directory

## 🔐 Security Notes

⚠️ **Important**: These scripts grant significant privileges. Use carefully and only for trusted users.

- Admin users have full platform access
- Changes are permanent and cannot be easily reverted
- Always verify user identity before promotion

## 📝 Future Scripts

Planned administrative tools:

- [ ] User management bulk operations
- [ ] Database backup and restore
- [ ] Event moderation tools
- [ ] Analytics and reporting
- [ ] System health checks

---

**RaveTracker v1** - GNU GPL v3 Licensed
