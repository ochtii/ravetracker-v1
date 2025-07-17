/**
 * Create Event JavaScript for RaveTracker v1
 * GNU GPL v3 Licensed
 */

class CreateEvent {
    constructor() {
        this.form = document.getElementById('create-event-form');
        this.isSubmitting = false;
        this.isDraft = false;
        
        this.init();
    }

    init() {
        this.setupFormValidation();
        this.setupEventHandlers();
        this.setupDateTimeDefaults();
        this.checkUserPermissions();
    }

    checkUserPermissions() {
        const auth = window.getFirebaseAuth();
        if (!auth) {
            window.location.href = '/login?redirect=/create-event';
            return;
        }

        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '/login?redirect=/create-event';
                return;
            }

            // Check if user has organizer role or higher
            try {
                const db = window.getFirebaseDB();
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const allowedRoles = ['organizer', 'moderator', 'admin'];
                    
                    if (!allowedRoles.includes(userData.role)) {
                        this.showPermissionError();
                        return;
                    }
                }
            } catch (error) {
                console.error('Error checking user permissions:', error);
            }
        });
    }

    showPermissionError() {
        const container = document.querySelector('.create-event-container');
        if (container) {
            container.innerHTML = `
                <div class="permission-error">
                    <div class="error-content">
                        <i class="fas fa-lock"></i>
                        <h2>Berechtigung erforderlich</h2>
                        <p>Du benötigst Organizer-Rechte, um Events zu erstellen.</p>
                        <p>Kontaktiere einen Administrator, um deine Rechte zu erweitern.</p>
                        <a href="/" class="btn btn-primary">Zurück zur Startseite</a>
                    </div>
                </div>
            `;
        }
    }

    setupDateTimeDefaults() {
        const dateInput = document.getElementById('event-date');
        const timeInput = document.getElementById('event-time');
        
        // Set minimum date to today
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            
            // Set default date to next weekend (Friday)
            const nextFriday = this.getNextFriday();
            dateInput.value = nextFriday.toISOString().split('T')[0];
        }
        
        // Set default time to 22:00
        if (timeInput) {
            timeInput.value = '22:00';
        }
        
        // Update end date when start date changes
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                const endDateInput = document.getElementById('event-end-date');
                if (endDateInput && !endDateInput.value) {
                    // Set end date to next day for multi-day events
                    const startDate = new Date(dateInput.value);
                    const endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 1);
                    endDateInput.value = endDate.toISOString().split('T')[0];
                }
            });
        }
    }

    getNextFriday() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + (daysUntilFriday || 7));
        return nextFriday;
    }

    setupFormValidation() {
        // Real-time validation for required fields
        const requiredFields = [
            'event-title',
            'event-description', 
            'event-genre',
            'event-type',
            'event-date',
            'event-location',
            'event-city'
        ];

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateField(field));
                field.addEventListener('input', () => this.clearFieldError(field));
            }
        });

        // URL validation
        const urlFields = ['event-ticket-url', 'event-website'];
        urlFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateURL(field));
            }
        });

        // Price validation
        const priceField = document.getElementById('event-price');
        if (priceField) {
            priceField.addEventListener('input', () => this.validatePrice(priceField));
        }
    }

    validateField(field) {
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required');
        
        if (isRequired && !value) {
            this.showFieldError(field, 'Dieses Feld ist erforderlich');
            return false;
        }
        
        // Specific validations
        switch (field.id) {
            case 'event-title':
                if (value.length < 5) {
                    this.showFieldError(field, 'Titel muss mindestens 5 Zeichen lang sein');
                    return false;
                }
                break;
                
            case 'event-description':
                if (value.length < 20) {
                    this.showFieldError(field, 'Beschreibung muss mindestens 20 Zeichen lang sein');
                    return false;
                }
                break;
                
            case 'event-date':
                const selectedDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (selectedDate < today) {
                    this.showFieldError(field, 'Event-Datum kann nicht in der Vergangenheit liegen');
                    return false;
                }
                break;
        }
        
        this.showFieldSuccess(field);
        return true;
    }

    validateURL(field) {
        const value = field.value.trim();
        if (!value) return true; // Optional field
        
        try {
            new URL(value);
            this.showFieldSuccess(field);
            return true;
        } catch {
            this.showFieldError(field, 'Bitte gib eine gültige URL ein');
            return false;
        }
    }

    validatePrice(field) {
        const value = parseFloat(field.value);
        if (isNaN(value) || value < 0) {
            this.showFieldError(field, 'Preis muss eine positive Zahl sein');
            return false;
        }
        
        this.showFieldSuccess(field);
        return true;
    }

    showFieldError(field, message) {
        this.clearFieldStatus(field);
        field.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        
        field.parentNode.appendChild(errorDiv);
    }

    showFieldSuccess(field) {
        this.clearFieldStatus(field);
        field.classList.add('success');
    }

    clearFieldError(field) {
        field.classList.remove('error');
        this.removeFieldError(field);
    }

    clearFieldStatus(field) {
        field.classList.remove('error', 'success');
        this.removeFieldError(field);
    }

    removeFieldError(field) {
        const existingError = field.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
    }

    setupEventHandlers() {
        // Form submission
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Save draft button
        const saveDraftBtn = document.getElementById('save-draft-btn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }

        // Preview button
        const previewBtn = document.getElementById('preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.showPreview());
        }

        // Modal handlers
        const viewEventBtn = document.getElementById('view-event-btn');
        const createAnotherBtn = document.getElementById('create-another-btn');
        
        if (viewEventBtn) {
            viewEventBtn.addEventListener('click', () => this.viewCreatedEvent());
        }
        
        if (createAnotherBtn) {
            createAnotherBtn.addEventListener('click', () => this.createAnotherEvent());
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        // Validate form
        if (!this.validateForm()) {
            this.scrollToFirstError();
            return;
        }
        
        this.isSubmitting = true;
        this.isDraft = false;
        this.showLoading();
        
        try {
            const eventData = this.collectFormData();
            const response = await this.submitEvent(eventData);
            
            if (response.success) {
                this.showSuccessModal(response.event_id);
            } else {
                throw new Error(response.message || 'Unbekannter Fehler');
            }
        } catch (error) {
            console.error('Error submitting event:', error);
            this.showError('Fehler beim Erstellen des Events: ' + error.message);
        } finally {
            this.isSubmitting = false;
            this.hideLoading();
        }
    }

    async saveDraft() {
        if (this.isSubmitting) return;
        
        this.isSubmitting = true;
        this.isDraft = true;
        this.showLoading();
        
        try {
            const eventData = this.collectFormData();
            eventData.status = 'draft';
            
            const response = await this.submitEvent(eventData);
            
            if (response.success) {
                this.showNotification('Entwurf gespeichert', 'success');
            } else {
                throw new Error(response.message || 'Fehler beim Speichern');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            this.showError('Fehler beim Speichern des Entwurfs: ' + error.message);
        } finally {
            this.isSubmitting = false;
            this.isDraft = false;
            this.hideLoading();
        }
    }

    validateForm() {
        const requiredFields = [
            'event-title',
            'event-description',
            'event-genre', 
            'event-type',
            'event-date',
            'event-location',
            'event-city'
        ];
        
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        });
        
        // Validate URLs
        const urlFields = ['event-ticket-url', 'event-website'];
        urlFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !this.validateURL(field)) {
                isValid = false;
            }
        });
        
        // Validate price
        const priceField = document.getElementById('event-price');
        if (priceField && !this.validatePrice(priceField)) {
            isValid = false;
        }
        
        return isValid;
    }

    collectFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        // Basic form data
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }
        
        // Process artists (split by newlines or commas)
        if (data.artists) {
            data.artists = data.artists
                .split(/[\n,]+/)
                .map(artist => artist.trim())
                .filter(artist => artist.length > 0);
        }
        
        // Convert numeric fields
        if (data.price) data.price = parseFloat(data.price) || 0;
        if (data.capacity) data.capacity = parseInt(data.capacity) || null;
        if (data.stages) data.stages = parseInt(data.stages) || 1;
        
        // Convert boolean fields
        data.age_restriction = document.getElementById('event-age-restriction').checked;
        data.camping = document.getElementById('event-camping').checked;
        
        // Combine date and time
        if (data.date && data.time) {
            data.start_datetime = `${data.date}T${data.time}`;
        } else if (data.date) {
            data.start_datetime = `${data.date}T22:00`;
        }
        
        if (data.end_date && data.end_time) {
            data.end_datetime = `${data.end_date}T${data.end_time}`;
        } else if (data.end_date) {
            data.end_datetime = `${data.end_date}T06:00`;
        }
        
        // Set status
        data.status = this.isDraft ? 'draft' : 'published';
        
        return data;
    }

    async submitEvent(eventData) {
        const auth = window.getFirebaseAuth();
        const user = auth.currentUser;
        
        if (!user) {
            throw new Error('Benutzer nicht angemeldet');
        }
        
        const token = await user.getIdToken();
        
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(eventData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }
        
        return await response.json();
    }

    scrollToFirstError() {
        const firstError = document.querySelector('.form-input.error, .form-select.error, .form-textarea.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        }
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showSuccessModal(eventId) {
        const modal = document.getElementById('success-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.lastCreatedEventId = eventId;
        }
    }

    showPreview() {
        const eventData = this.collectFormData();
        
        // Create preview window
        const previewWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (previewWindow) {
            previewWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Event Vorschau - ${eventData.title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                        .preview { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
                        .title { color: #8b4513; font-size: 24px; margin-bottom: 10px; }
                        .meta { color: #666; margin-bottom: 20px; }
                        .section { margin-bottom: 20px; }
                        .section h3 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                        .artists { background: #f8f9fa; padding: 15px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="preview">
                        <h1 class="title">${eventData.title}</h1>
                        <div class="meta">
                            ${eventData.genre} • ${eventData.type} • ${eventData.location}, ${eventData.city}
                        </div>
                        
                        <div class="section">
                            <h3>Beschreibung</h3>
                            <p>${eventData.description}</p>
                        </div>
                        
                        <div class="section">
                            <h3>Details</h3>
                            <p><strong>Datum:</strong> ${eventData.start_datetime}</p>
                            ${eventData.end_datetime ? `<p><strong>Ende:</strong> ${eventData.end_datetime}</p>` : ''}
                            <p><strong>Preis:</strong> ${eventData.price ? eventData.price + '€' : 'Kostenlos'}</p>
                            ${eventData.capacity ? `<p><strong>Kapazität:</strong> ${eventData.capacity} Personen</p>` : ''}
                        </div>
                        
                        ${eventData.artists && eventData.artists.length > 0 ? `
                        <div class="section">
                            <h3>Artists</h3>
                            <div class="artists">
                                ${eventData.artists.map(artist => `<div>• ${artist}</div>`).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        ${eventData.special_info ? `
                        <div class="section">
                            <h3>Besondere Hinweise</h3>
                            <p>${eventData.special_info}</p>
                        </div>
                        ` : ''}
                    </div>
                </body>
                </html>
            `);
        }
    }

    viewCreatedEvent() {
        if (this.lastCreatedEventId) {
            window.location.href = `/events/${this.lastCreatedEventId}`;
        }
    }

    createAnotherEvent() {
        window.location.reload();
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'error' ? 'fa-exclamation-triangle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#4ade80' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            z-index: 10001;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CreateEvent();
});
