/*
RaveTracker v1 - Events Page JavaScript
GNU GPL v3 Licensed
*/

class EventsPage {
    constructor() {
        this.currentPage = 1;
        this.eventsPerPage = 12;
        this.currentFilters = {};
        this.currentSort = 'date_asc';
        this.currentView = 'grid';
        this.events = [];
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadEvents();
        this.checkUserAuthentication();
    }

    setupEventListeners() {
        // Filter controls
        document.getElementById('apply-filters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters')?.addEventListener('click', () => this.clearFilters());
        
        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeView(e.target.dataset.view));
        });
        
        // Sort control
        document.getElementById('sort-select')?.addEventListener('change', (e) => this.changeSort(e.target.value));
        
        // Pagination
        document.getElementById('prev-page')?.addEventListener('click', () => this.changePage(this.currentPage - 1));
        document.getElementById('next-page')?.addEventListener('click', () => this.changePage(this.currentPage + 1));
        
        // Quick actions
        document.getElementById('create-event-fab')?.addEventListener('click', () => this.createEvent());
        document.getElementById('create-event-btn')?.addEventListener('click', () => this.createEvent());
        
        // Modal controls
        document.getElementById('close-modal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('close-modal-footer')?.addEventListener('click', () => this.closeModal());
        document.getElementById('view-event-details')?.addEventListener('click', () => this.navigateToEventDetails());
        document.getElementById('event-modal')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });
        
        // Retry loading
        document.getElementById('retry-loading')?.addEventListener('click', () => this.loadEvents());
        
        // Filter inputs with enter key
        document.querySelectorAll('.filter-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyFilters();
                }
            });
        });
    }

    async checkUserAuthentication() {
        const token = localStorage.getItem('auth_token');
        const quickActions = document.getElementById('quick-actions');
        const createEventBtn = document.getElementById('create-event-btn');
        
        if (token) {
            try {
                // Verify token is still valid
                const response = await fetch('/api/auth/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    
                    // Show create event button for organizers and admins
                    if (userData.user.role === 'organizer' || userData.user.role === 'admin') {
                        if (quickActions) quickActions.style.display = 'block';
                        if (createEventBtn) createEventBtn.style.display = 'flex';
                    }
                }
            } catch (error) {
                console.log('User not authenticated');
            }
        }
    }

    async loadEvents() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.eventsPerPage,
                sort: this.currentSort,
                ...this.currentFilters
            });

            const response = await fetch(`/api/events?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.events = data.events || [];
            
            this.renderEvents();
            this.updatePagination(data.pagination || {});
            this.updateResultsCount();
            
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Error loading events:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
        }
    }

    showLoadingState() {
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('events-container').style.display = 'none';
        document.getElementById('no-results').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('pagination').style.display = 'none';
    }

    hideLoadingState() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('events-container').style.display = 'grid';
        document.getElementById('error-state').style.display = 'none';
    }

    showErrorState() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('events-container').style.display = 'none';
        document.getElementById('no-results').style.display = 'none';
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('pagination').style.display = 'none';
    }

    renderEvents() {
        const container = document.getElementById('events-container');
        
        if (this.events.length === 0) {
            container.style.display = 'none';
            document.getElementById('no-results').style.display = 'block';
            return;
        }

        document.getElementById('no-results').style.display = 'none';
        container.innerHTML = '';

        this.events.forEach(event => {
            const eventCard = this.createEventCard(event);
            container.appendChild(eventCard);
        });

        // Apply current view
        container.className = `events-container ${this.currentView}-view`;
    }

    createEventCard(event) {
        const card = document.createElement('div');
        card.className = `event-card ${this.currentView}-view`;
        card.addEventListener('click', () => this.showEventModal(event));

        const eventDate = new Date(event.date_start);
        const day = eventDate.getDate().toString().padStart(2, '0');
        const month = eventDate.toLocaleDateString('de-DE', { month: 'short' });

        const price = event.price === 0 ? 'Kostenlos' : `€${event.price.toFixed(2)}`;
        const priceClass = event.price === 0 ? 'free' : '';

        card.innerHTML = `
            <div class="event-header">
                <div class="event-date">
                    <span class="date-day">${day}</span>
                    <span class="date-month">${month}</span>
                </div>
                <div class="event-genre">${this.getGenreDisplayName(event.genre)}</div>
            </div>
            
            <div class="event-content">
                <h3 class="event-title">${this.escapeHtml(event.title)}</h3>
                <p class="event-description">${this.escapeHtml(event.description || '')}</p>
                
                <div class="event-details">
                    <div class="event-detail">
                        <span class="detail-icon">📍</span>
                        <span>${this.escapeHtml(event.location || 'TBA')}</span>
                    </div>
                    <div class="event-detail">
                        <span class="detail-icon">🕒</span>
                        <span>${this.formatEventTime(event)}</span>
                    </div>
                    ${event.organizer_name ? `
                        <div class="event-detail">
                            <span class="detail-icon">👤</span>
                            <span>von ${this.escapeHtml(event.organizer_name)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="event-footer">
                <div class="event-price ${priceClass}">${price}</div>
                <div class="event-stats">
                    <div class="stat ${this.getUserInterestStatus(event.id) ? 'user-marked' : ''}">
                        <span>❤️</span>
                        <span>${event.interested_count || 0}</span>
                    </div>
                    <div class="stat ${this.getUserAttendanceStatus(event.id) ? 'user-marked' : ''}">
                        <span>🎉</span>
                        <span>${event.attendees_count || 0}</span>
                    </div>
                </div>
                <div class="event-actions">
                    ${this.createEventActions(event)}
                </div>
            </div>
        `;

        return card;
    }

    createEventActions(event) {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            return '<span class="action-hint">Login für Interaktion</span>';
        }

        const isInterested = event.interested?.includes(this.getCurrentUserId()) || false;
        const isAttending = event.attendees?.includes(this.getCurrentUserId()) || false;

        return `
            <button class="action-btn ${isInterested ? 'active' : ''}" 
                    onclick="eventsPage.toggleInterest('${event.id}', event)"
                    data-event-id="${event.id}">
                ${isInterested ? '💖' : '🤍'}
            </button>
            <button class="action-btn ${isAttending ? 'active' : ''}" 
                    onclick="eventsPage.toggleAttendance('${event.id}', event)"
                    data-event-id="${event.id}">
                ${isAttending ? '✅' : '➕'}
            </button>
        `;
    }

    async toggleInterest(eventId, event) {
        event.stopPropagation();
        
        const token = localStorage.getItem('auth_token');
        if (!token) {
            this.showLoginPrompt();
            return;
        }

        try {
            const response = await fetch(`/api/events/${eventId}/interest`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Reload events to update the UI
                await this.loadEvents();
            } else {
                throw new Error('Failed to toggle interest');
            }
        } catch (error) {
            console.error('Error toggling interest:', error);
            alert('Fehler beim Aktualisieren des Interesse-Status');
        }
    }

    async toggleAttendance(eventId, event) {
        event.stopPropagation();
        
        const token = localStorage.getItem('auth_token');
        if (!token) {
            this.showLoginPrompt();
            return;
        }

        try {
            const response = await fetch(`/api/events/${eventId}/attend`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Reload events to update the UI
                await this.loadEvents();
            } else {
                throw new Error('Failed to toggle attendance');
            }
        } catch (error) {
            console.error('Error toggling attendance:', error);
            alert('Fehler beim Aktualisieren des Teilnahme-Status');
        }
    }

    showLoginPrompt() {
        if (confirm('Du musst angemeldet sein, um mit Events zu interagieren. Möchtest du dich jetzt anmelden?')) {
            window.location.href = '/login';
        }
    }

    getCurrentUserId() {
        // This would normally come from the JWT token or user session
        // For now, we'll return a placeholder
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.user_id;
            } catch (error) {
                return null;
            }
        }
        return null;
    }

    applyFilters() {
        this.currentFilters = {
            genre: document.getElementById('genre-filter').value,
            location: document.getElementById('location-filter').value,
            date: document.getElementById('date-filter').value,
            price_range: document.getElementById('price-filter').value
        };

        // Remove empty filters
        Object.keys(this.currentFilters).forEach(key => {
            if (!this.currentFilters[key]) {
                delete this.currentFilters[key];
            }
        });

        this.currentPage = 1;
        this.loadEvents();
    }

    clearFilters() {
        document.getElementById('genre-filter').value = '';
        document.getElementById('location-filter').value = '';
        document.getElementById('date-filter').value = '';
        document.getElementById('price-filter').value = '';
        
        this.currentFilters = {};
        this.currentPage = 1;
        this.loadEvents();
    }

    changeView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Update container class
        const container = document.getElementById('events-container');
        container.className = `events-container ${view}-view`;
    }

    changeSort(sort) {
        this.currentSort = sort;
        this.currentPage = 1;
        this.loadEvents();
    }

    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadEvents();
    }

    updatePagination(pagination) {
        const paginationDiv = document.getElementById('pagination');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');

        if (pagination.total_pages > 1) {
            paginationDiv.style.display = 'flex';
            
            prevBtn.disabled = this.currentPage <= 1;
            nextBtn.disabled = this.currentPage >= pagination.total_pages;
            
            pageInfo.textContent = `Seite ${this.currentPage} von ${pagination.total_pages}`;
        } else {
            paginationDiv.style.display = 'none';
        }
    }

    updateResultsCount() {
        const count = this.events.length;
        const countElement = document.getElementById('results-count');
        countElement.textContent = `${count} Event${count !== 1 ? 's' : ''} gefunden`;
    }

    showEventModal(event) {
        this.currentModalEvent = event; // Store current event for navigation
        const modal = document.getElementById('event-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        modalTitle.textContent = event.title;
        modalBody.innerHTML = this.createEventModalContent(event);
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('event-modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.currentModalEvent = null; // Clear current event
    }

    // Interest and Attendance Functions
    getUserInterestStatus(eventId) {
        const interests = JSON.parse(localStorage.getItem('user_interests') || '[]');
        return interests.includes(eventId);
    }

    getUserAttendanceStatus(eventId) {
        const attendances = JSON.parse(localStorage.getItem('user_attendances') || '[]');
        return attendances.includes(eventId);
    }

    async toggleInterest(eventId) {
        try {
            const currentStatus = this.getUserInterestStatus(eventId);
            const interests = JSON.parse(localStorage.getItem('user_interests') || '[]');
            
            if (currentStatus) {
                // Remove interest
                const index = interests.indexOf(eventId);
                if (index > -1) interests.splice(index, 1);
                this.showNotification('💔 Interesse entfernt', 'info');
                this.updateEventCounter(eventId, 'interest', -1);
            } else {
                // Add interest
                if (!interests.includes(eventId)) {
                    interests.push(eventId);
                }
                this.showNotification('❤️ Interesse gezeigt!', 'success');
                this.updateEventCounter(eventId, 'interest', 1);
            }
            
            localStorage.setItem('user_interests', JSON.stringify(interests));
            
            // Update button appearance
            this.updateInterestButton(eventId);
            
            // Send to backend if user is authenticated
            await this.syncInterestToBackend(eventId, !currentStatus);
            
        } catch (error) {
            console.error('Error toggling interest:', error);
            this.showNotification('❌ Fehler beim Speichern', 'error');
        }
    }

    async toggleAttendance(eventId) {
        try {
            const currentStatus = this.getUserAttendanceStatus(eventId);
            const attendances = JSON.parse(localStorage.getItem('user_attendances') || '[]');
            
            if (currentStatus) {
                // Remove attendance
                const index = attendances.indexOf(eventId);
                if (index > -1) attendances.splice(index, 1);
                this.showNotification('🚫 Teilnahme storniert', 'warning');
                this.updateEventCounter(eventId, 'attendance', -1);
            } else {
                // Add attendance
                if (!attendances.includes(eventId)) {
                    attendances.push(eventId);
                }
                this.showNotification('🎉 Teilnahme bestätigt!', 'success');
                this.updateEventCounter(eventId, 'attendance', 1);
            }
            
            localStorage.setItem('user_attendances', JSON.stringify(attendances));
            
            // Update button appearance
            this.updateAttendanceButton(eventId);
            
            // Send to backend if user is authenticated
            await this.syncAttendanceToBackend(eventId, !currentStatus);
            
        } catch (error) {
            console.error('Error toggling attendance:', error);
            this.showNotification('❌ Fehler beim Speichern', 'error');
        }
    }

    updateEventCounter(eventId, type, change) {
        // Update counter in modal
        const modalCounter = document.getElementById(`${type === 'interest' ? 'interest' : 'attend'}-count-${eventId}`);
        if (modalCounter) {
            const currentCount = parseInt(modalCounter.textContent) || 0;
            modalCounter.textContent = Math.max(0, currentCount + change);
        }

        // Update counter in event cards
        const eventCards = document.querySelectorAll(`[data-event-id="${eventId}"]`);
        eventCards.forEach(card => {
            const parentCard = card.closest('.event-card');
            if (parentCard) {
                const statElement = parentCard.querySelector(`.stat ${type === 'interest' ? ':first-child' : ':last-child'} span:last-child`);
                if (statElement) {
                    const currentCount = parseInt(statElement.textContent) || 0;
                    statElement.textContent = Math.max(0, currentCount + change);
                }
            }
        });

        // Update the event data in memory
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            if (type === 'interest') {
                event.interested_count = Math.max(0, (event.interested_count || 0) + change);
            } else {
                event.attendees_count = Math.max(0, (event.attendees_count || 0) + change);
            }
        }
    }

    updateInterestButton(eventId) {
        const button = document.querySelector(`.interest-btn[onclick*="${eventId}"]`);
        if (button) {
            const isActive = this.getUserInterestStatus(eventId);
            button.classList.toggle('active', isActive);
            button.title = isActive ? 'Interesse entfernen' : 'Interesse zeigen';
        }
    }

    updateAttendanceButton(eventId) {
        const button = document.querySelector(`.attend-btn[onclick*="${eventId}"]`);
        if (button) {
            const isActive = this.getUserAttendanceStatus(eventId);
            button.classList.toggle('active', isActive);
            button.innerHTML = `
                <span class="btn-icon">🎉</span>
                ${isActive ? 'Teilnahme stornieren' : 'Teilnehmen'}
            `;
        }
    }

    async syncInterestToBackend(eventId, isInterested) {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const response = await fetch('/api/events/interest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    event_id: eventId,
                    interested: isInterested
                })
            });

            if (!response.ok) {
                console.warn('Failed to sync interest to backend');
            }
        } catch (error) {
            console.warn('Error syncing interest to backend:', error);
        }
    }

    async syncAttendanceToBackend(eventId, isAttending) {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const response = await fetch('/api/events/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    event_id: eventId,
                    attending: isAttending
                })
            });

            if (!response.ok) {
                console.warn('Failed to sync attendance to backend');
            }
        } catch (error) {
            console.warn('Error syncing attendance to backend:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-text">${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Position and style
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--glass-bg);
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-md);
            padding: var(--spacing-md) var(--spacing-lg);
            color: var(--text-primary);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            max-width: 400px;
            box-shadow: var(--glass-shadow);
            animation: slideInRight 0.3s ease;
        `;

        // Add type-specific styling
        switch (type) {
            case 'success':
                notification.style.borderColor = '#2ecc71';
                break;
            case 'error':
                notification.style.borderColor = '#e74c3c';
                break;
            case 'warning':
                notification.style.borderColor = '#f39c12';
                break;
        }

        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }

    navigateToEventDetails() {
        if (this.currentModalEvent) {
            // Navigate to event detail page
            window.location.href = `/events/${this.currentModalEvent.id}`;
        }
    }

    createEventModalContent(event) {
        const eventDate = new Date(event.date_start);
        const endDate = event.date_end ? new Date(event.date_end) : null;
        
        // Check user's current status for this event
        const isInterested = this.getUserInterestStatus(event.id);
        const isAttending = this.getUserAttendanceStatus(event.id);
        
        return `
            <div class="event-modal-content">
                <div class="event-modal-header">
                    <div class="header-info">
                        <div class="event-genre">${this.getGenreDisplayName(event.genre)}</div>
                        <div class="event-date-full">
                            ${eventDate.toLocaleDateString('de-DE', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </div>
                    </div>
                </div>
                
                <div class="event-actions-row">
                    <button class="interest-btn ${isInterested ? 'active' : ''}" 
                            onclick="eventsPage.toggleInterest('${event.id}')" 
                            title="${isInterested ? 'Interesse entfernen' : 'Interesse zeigen'}">
                        <span class="heart-icon">❤️</span>
                        <span class="action-count" id="interest-count-${event.id}">${event.interested_count || 0}</span>
                    </button>
                    <button class="attend-btn ${isAttending ? 'active' : ''}" 
                            onclick="eventsPage.toggleAttendance('${event.id}')">
                        <span class="btn-icon">🎉</span>
                        <span class="action-text">${isAttending ? 'Teilnahme stornieren' : 'Teilnehmen'}</span>
                        <span class="action-count" id="attend-count-${event.id}">${event.attendees_count || 0}</span>
                    </button>
                </div>
                
                <div class="event-modal-body">
                    <h2>${this.escapeHtml(event.title)}</h2>
                    
                    ${event.description ? `
                        <div class="event-description-full">
                            <h3>Beschreibung</h3>
                            <p>${this.escapeHtml(event.description).replace(/\n/g, '<br>')}</p>
                        </div>
                    ` : ''}
                    
                    <div class="event-details-full">
                        <h3>Details</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <strong>📍 Ort:</strong>
                                <span>${this.escapeHtml(event.location || 'TBA')}</span>
                            </div>
                            <div class="detail-item">
                                <strong>🕒 Start:</strong>
                                <span>${eventDate.toLocaleString('de-DE')}</span>
                            </div>
                            ${endDate ? `
                                <div class="detail-item">
                                    <strong>🏁 Ende:</strong>
                                    <span>${endDate.toLocaleString('de-DE')}</span>
                                </div>
                            ` : ''}
                            <div class="detail-item">
                                <strong>💰 Preis:</strong>
                                <span>${event.price === 0 ? 'Kostenlos' : `€${event.price.toFixed(2)}`}</span>
                            </div>
                            ${event.organizer_name ? `
                                <div class="detail-item">
                                    <strong>👤 Veranstalter:</strong>
                                    <span>${this.escapeHtml(event.organizer_name)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="event-stats-full">
                        <div class="stat-item">
                            <span class="stat-number">${event.interested?.length || 0}</span>
                            <span class="stat-label">Interessiert</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${event.attendees?.length || 0}</span>
                            <span class="stat-label">Teilnehmer</span>
                        </div>
                    </div>
                </div>
                
                <div class="event-modal-actions">
                    ${this.createEventModalActions(event)}
                </div>
            </div>
        `;
    }

    createEventModalActions(event) {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            return `
                <div class="auth-prompt">
                    <p>Melde dich an, um mit diesem Event zu interagieren</p>
                    <a href="/login" class="btn btn-primary">Anmelden</a>
                    <a href="/register" class="btn btn-secondary">Registrieren</a>
                </div>
            `;
        }

        const isInterested = event.interested?.includes(this.getCurrentUserId()) || false;
        const isAttending = event.attendees?.includes(this.getCurrentUserId()) || false;

        return `
            <div class="modal-action-buttons">
                <button class="btn ${isInterested ? 'btn-primary' : 'btn-secondary'}" 
                        onclick="eventsPage.toggleInterest('${event.id}', event)">
                    ${isInterested ? '💖 Interesse entfernen' : '🤍 Interesse zeigen'}
                </button>
                <button class="btn ${isAttending ? 'btn-primary' : 'btn-secondary'}" 
                        onclick="eventsPage.toggleAttendance('${event.id}', event)">
                    ${isAttending ? '✅ Teilnahme absagen' : '➕ Teilnehmen'}
                </button>
            </div>
        `;
    }

    createEvent() {
        window.location.href = '/events/create';
    }

    getGenreDisplayName(genre) {
        const genreMap = {
            'goa': 'Goa Trance',
            'psytrance': 'Psytrance',
            'dnb': 'Drum & Bass',
            'hardcore': 'Hardcore',
            'techno': 'Techno',
            'house': 'House',
            'trance': 'Trance',
            'breakbeat': 'Breakbeat'
        };
        return genreMap[genre] || genre;
    }

    formatEventTime(event) {
        const start = new Date(event.date_start);
        const end = event.date_end ? new Date(event.date_end) : null;
        
        const startTime = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        
        if (end) {
            const endTime = end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            return `${startTime} - ${endTime}`;
        }
        
        return `ab ${startTime}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize events page
let eventsPage;
document.addEventListener('DOMContentLoaded', () => {
    eventsPage = new EventsPage();
});
