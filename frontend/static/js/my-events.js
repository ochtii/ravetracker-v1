/*
My Events JavaScript - RaveTracker v1
GNU GPL v3 Licensed
*/

class MyEventsManager {
    constructor() {
        this.events = {
            attending: [],
            created: [],
            interested: []
        };
        this.user = null;
        this.activeTab = 'attending';
        
        this.init();
    }

    async init() {
        try {
            // Warte auf Auth-Initialisierung
            if (typeof window.authManager !== 'undefined') {
                await window.authManager.waitForAuth();
                this.user = window.authManager.getCurrentUser();
            }
            
            this.setupTabs();
            this.updateTabVisibility();
            await this.loadEvents();
            this.updateTabCounts();
        } catch (error) {
            console.error('Error initializing MyEventsManager:', error);
            this.showError('Fehler beim Laden der Events');
        }
    }

    updateTabVisibility() {
        const createdTab = document.querySelector('[data-tab="created"]');
        const createdTabContent = document.getElementById('created-events');
        
        if (this.user && ['organizer', 'moderator', 'admin'].includes(this.user.role)) {
            if (createdTab) createdTab.style.display = 'flex';
            if (createdTabContent) createdTabContent.style.display = 'block';
        } else {
            if (createdTab) createdTab.style.display = 'none';
            if (createdTabContent) createdTabContent.style.display = 'none';
        }
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = button.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // Tab Buttons aktualisieren
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Tab Content aktualisieren
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabId}-events`);
        });

        this.activeTab = tabId;
        this.renderActiveTab();
    }

    async loadEvents() {
        try {
            this.showLoading();
            
            // Lade Events vom localStorage
            const storedData = localStorage.getItem('userEvents');
            if (storedData) {
                const userData = JSON.parse(storedData);
                this.events = {
                    attending: userData.attending || [],
                    created: userData.created || [],
                    interested: userData.interested || []
                };
            }

            // Lade alle Events und filtere die relevanten
            const response = await fetch('/api/events');
            if (!response.ok) throw new Error('Fehler beim Laden der Events');
            
            const allEvents = await response.json();
            await this.categorizeEvents(allEvents);
            
            this.hideLoading();
            this.renderActiveTab();
            
        } catch (error) {
            console.error('Error loading events:', error);
            this.hideLoading();
            this.showError('Fehler beim Laden der Events');
        }
    }

    async categorizeEvents(allEvents) {
        if (!this.user) return;

        const userEventIds = {
            attending: new Set(this.events.attending),
            interested: new Set(this.events.interested)
        };

        // Kategorisiere Events basierend auf User-Daten
        this.events.attending = allEvents.filter(event => userEventIds.attending.has(event.id));
        this.events.interested = allEvents.filter(event => userEventIds.interested.has(event.id));
        
        // Lade erstellte Events
        if (this.user.uid) {
            this.events.created = allEvents.filter(event => event.organizer_id === this.user.uid);
        }
    }

    renderActiveTab() {
        const tabPane = document.getElementById(`${this.activeTab}-events`);
        if (!tabPane) return;

        const eventsContainer = tabPane.querySelector('.events-grid') || 
                               tabPane.querySelector('.events-container');
        
        if (!eventsContainer) {
            console.error('Events container not found for tab:', this.activeTab);
            return;
        }

        const events = this.events[this.activeTab];
        
        if (events.length === 0) {
            this.renderEmptyState(eventsContainer);
        } else {
            this.renderEvents(eventsContainer, events);
        }
    }

    renderEvents(container, events) {
        container.innerHTML = events.map(event => this.createEventCard(event)).join('');
        
        // Event Listeners für die Event Cards hinzufügen
        container.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.event-actions')) {
                    const eventId = card.dataset.eventId;
                    this.openEventModal(eventId);
                }
            });
        });
    }

    createEventCard(event) {
        const date = new Date(event.date);
        const formattedDate = date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const formattedTime = date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const isUserInterested = this.events.interested.some(e => e.id === event.id);
        const isUserAttending = this.events.attending.some(e => e.id === event.id);
        const isCreator = this.events.created.some(e => e.id === event.id);

        return `
            <div class="event-card" data-event-id="${event.id}">
                <div class="event-header">
                    <h3 class="event-title">${event.name}</h3>
                    ${isCreator ? '<span class="creator-badge">Erstellt</span>' : ''}
                </div>
                
                <div class="event-meta">
                    <div class="event-date">
                        <i class="fas fa-calendar"></i>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="event-time">
                        <i class="fas fa-clock"></i>
                        <span>${formattedTime}</span>
                    </div>
                    <div class="event-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${event.location}</span>
                    </div>
                </div>

                <div class="event-genre">
                    <span class="genre-tag genre-${event.genre}">${event.genre}</span>
                </div>

                <div class="event-stats">
                    <div class="stat ${isUserInterested ? 'user-marked' : ''}">
                        <i class="fas fa-heart"></i>
                        <span>${event.interested_count || 0}</span>
                    </div>
                    <div class="stat ${isUserAttending ? 'user-marked' : ''}">
                        <i class="fas fa-calendar-check"></i>
                        <span>${event.attending_count || 0}</span>
                    </div>
                </div>

                <div class="event-actions">
                    ${this.renderEventActions(event, isUserInterested, isUserAttending)}
                </div>
            </div>
        `;
    }

    renderEventActions(event, isInterested, isAttending) {
        if (this.activeTab === 'created') {
            return `
                <button class="btn btn-secondary" onclick="myEventsManager.editEvent('${event.id}')">
                    <i class="fas fa-edit"></i> Bearbeiten
                </button>
                <button class="btn btn-outline" onclick="myEventsManager.viewEventStats('${event.id}')">
                    <i class="fas fa-chart-bar"></i> Statistiken
                </button>
            `;
        }

        return `
            <button class="interest-btn ${isInterested ? 'active' : ''}" 
                    onclick="myEventsManager.toggleInterest('${event.id}', event)">
                <i class="fas fa-heart"></i>
                ${isInterested ? 'Interessiert' : 'Interesse'}
            </button>
            <button class="attend-btn ${isAttending ? 'active' : ''}" 
                    onclick="myEventsManager.toggleAttendance('${event.id}', event)">
                <i class="fas fa-calendar-check"></i>
                ${isAttending ? 'Nehme teil' : 'Teilnehmen'}
            </button>
        `;
    }

    renderEmptyState(container) {
        const emptyStates = {
            attending: {
                icon: 'fas fa-calendar-times',
                title: 'Keine Events mit Teilnahme',
                text: 'Du hast noch bei keinem Event deine Teilnahme bestätigt.',
                action: `<a href="/events" class="btn btn-primary">Events entdecken</a>`
            },
            created: {
                icon: 'fas fa-plus-circle',
                title: 'Keine Events erstellt',
                text: 'Du hast noch keine Events erstellt.',
                action: `<a href="/create-event" class="btn btn-primary">Erstes Event erstellen</a>`
            },
            interested: {
                icon: 'fas fa-heart',
                title: 'Keine Interessensbekundungen',
                text: 'Du hast noch kein Interesse an Events bekundet.',
                action: `<a href="/events" class="btn btn-primary">Events entdecken</a>`
            }
        };

        const state = emptyStates[this.activeTab];
        
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="${state.icon}"></i>
                </div>
                <h3>${state.title}</h3>
                <p>${state.text}</p>
                ${state.action}
            </div>
        `;
    }

    updateTabCounts() {
        Object.keys(this.events).forEach(tabType => {
            const countElement = document.querySelector(`[data-tab="${tabType}"] .tab-count`);
            if (countElement) {
                const count = this.events[tabType].length;
                countElement.textContent = count;
                countElement.style.display = count > 0 ? 'inline' : 'none';
            }
        });
    }

    async toggleInterest(eventId, event) {
        event.stopPropagation();
        
        try {
            const isCurrentlyInterested = this.events.interested.some(e => e.id === eventId);
            
            if (isCurrentlyInterested) {
                this.events.interested = this.events.interested.filter(e => e.id !== eventId);
            } else {
                // Event zur Interested-Liste hinzufügen
                const eventData = await this.getEventData(eventId);
                if (eventData) {
                    this.events.interested.push(eventData);
                }
            }
            
            this.saveUserEventsToStorage();
            this.updateTabCounts();
            this.renderActiveTab();
            
            // Optional: Backend Update
            await this.syncWithBackend('interest', eventId, !isCurrentlyInterested);
            
        } catch (error) {
            console.error('Error toggling interest:', error);
        }
    }

    async toggleAttendance(eventId, event) {
        event.stopPropagation();
        
        try {
            const isCurrentlyAttending = this.events.attending.some(e => e.id === eventId);
            
            if (isCurrentlyAttending) {
                this.events.attending = this.events.attending.filter(e => e.id !== eventId);
            } else {
                // Event zur Attending-Liste hinzufügen
                const eventData = await this.getEventData(eventId);
                if (eventData) {
                    this.events.attending.push(eventData);
                }
            }
            
            this.saveUserEventsToStorage();
            this.updateTabCounts();
            this.renderActiveTab();
            
            // Optional: Backend Update
            await this.syncWithBackend('attendance', eventId, !isCurrentlyAttending);
            
        } catch (error) {
            console.error('Error toggling attendance:', error);
        }
    }

    async getEventData(eventId) {
        try {
            const response = await fetch(`/api/events/${eventId}`);
            if (!response.ok) throw new Error('Event not found');
            return await response.json();
        } catch (error) {
            console.error('Error fetching event data:', error);
            return null;
        }
    }

    saveUserEventsToStorage() {
        const userData = {
            attending: this.events.attending.map(e => e.id),
            interested: this.events.interested.map(e => e.id),
            timestamp: Date.now()
        };
        localStorage.setItem('userEvents', JSON.stringify(userData));
    }

    async syncWithBackend(action, eventId, state) {
        try {
            const response = await fetch(`/api/events/${eventId}/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ state })
            });
            
            if (!response.ok) {
                console.warn(`Backend sync failed for ${action}:`, response.statusText);
            }
        } catch (error) {
            console.warn('Backend sync error:', error);
        }
    }

    openEventModal(eventId) {
        // Verwende den globalen Event Manager falls verfügbar
        if (typeof window.eventManager !== 'undefined') {
            window.eventManager.openEventModal(eventId);
        } else {
            // Fallback: Öffne Event Detail Seite
            window.location.href = `/events/${eventId}`;
        }
    }

    editEvent(eventId) {
        window.location.href = `/events/${eventId}/edit`;
    }

    viewEventStats(eventId) {
        window.location.href = `/events/${eventId}/stats`;
    }

    showLoading() {
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Events werden geladen...</p>
                </div>
            `;
        });
    }

    hideLoading() {
        // Loading wird durch renderActiveTab() ersetzt
    }

    showError(message) {
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Fehler</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Erneut versuchen
                    </button>
                </div>
            `;
        });
    }
}

// Initialisiere My Events Manager wenn Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'my-events') {
        window.myEventsManager = new MyEventsManager();
    }
});

// Export für andere Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MyEventsManager;
}
