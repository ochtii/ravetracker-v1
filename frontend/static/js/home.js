/*
RaveTracker v1 - Home Page JavaScript
GNU GPL v3 Licensed
*/

class HomePage {
    constructor() {
        this.init();
    }

    // Utility functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    getGenreColor(genre) {
        const colors = {
            'goa': '#ff6b6b',
            'psytrance': '#4ecdc4', 
            'dnb': '#45b7d1',
            'hardcore': '#f39c12',
            'techno': '#9b59b6',
            'trance': '#e74c3c'
        };
        return colors[genre?.toLowerCase()] || '#667eea';
    }

    getGenreIcon(genre) {
        const icons = {
            'goa': '🌀',
            'psytrance': '🎭',
            'dnb': '⚡',
            'hardcore': '🔥',
            'techno': '🤖',
            'trance': '✨'
        };
        return icons[genre?.toLowerCase()] || '🎵';
    }

    init() {
        this.loadUpcomingEvents();
        this.loadGenreStats();
        this.setupAnimations();
    }

    async loadUpcomingEvents() {
        const container = document.getElementById('upcoming-events');
        if (!container) return;

        try {
            const response = await fetch('/api/events/?per_page=6&sort=date_asc');
            
            if (response.ok) {
                const data = await response.json();
                this.renderUpcomingEvents(data.events, container);
            } else {
                throw new Error('Failed to load events');
            }
        } catch (error) {
            console.error('Error loading upcoming events:', error);
            container.innerHTML = `
                <div class="error-message">
                    <p>Fehler beim Laden der Events. Bitte versuchen Sie es später erneut.</p>
                </div>
            `;
        }
    }

    renderUpcomingEvents(events, container) {
        if (!events || events.length === 0) {
            container.innerHTML = `
                <div class="no-events">
                    <div class="no-events-icon">📅</div>
                    <h3>Keine kommenden Events</h3>
                    <p>Derzeit sind keine Events geplant. Schauen Sie später wieder vorbei!</p>
                    <a href="/register" class="btn btn-primary">Event erstellen</a>
                </div>
            `;
            return;
        }

        const eventsHTML = events.map(event => this.createEventCard(event)).join('');
        
        container.innerHTML = `
            <div class="events-grid">
                ${eventsHTML}
            </div>
        `;

        // Add click handlers
        this.setupEventCardHandlers(container);
    }

    createEventCard(event) {
        const eventDate = new Date(event.date_start);
        const formattedDate = this.formatDate(event.date_start);
        const genreColor = this.getGenreColor(event.genre);
        const genreIcon = this.getGenreIcon(event.genre);

        return `
            <div class="event-card glass" data-event-id="${event.id}">
                <div class="event-header">
                    <div class="event-date">
                        <div class="date-day">${eventDate.getDate()}</div>
                        <div class="date-month">${eventDate.toLocaleDateString('de-DE', { month: 'short' })}</div>
                    </div>
                    <div class="event-genre">
                        <span class="genre-tag ${event.genre}" style="background-color: ${genreColor};">
                            ${genreIcon} ${event.genre.toUpperCase()}
                        </span>
                    </div>
                </div>
                
                <div class="event-content">
                    <h3 class="event-title">${event.title}</h3>
                    <p class="event-description">${this.truncateText(event.description, 100)}</p>
                    
                    <div class="event-details">
                        <div class="event-detail">
                            <span class="detail-icon">📍</span>
                            <span class="detail-text">${event.location}</span>
                        </div>
                        <div class="event-detail">
                            <span class="detail-icon">🕒</span>
                            <span class="detail-text">${formattedDate}</span>
                        </div>
                        ${event.price > 0 ? `
                            <div class="event-detail">
                                <span class="detail-icon">💰</span>
                                <span class="detail-text">${event.price}€</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="event-footer">
                    <div class="event-stats">
                        <span class="stat">
                            <span class="stat-icon">👥</span>
                            <span class="stat-count">${event.attendees ? event.attendees.length : 0}</span>
                        </span>
                        <span class="stat">
                            <span class="stat-icon">❤️</span>
                            <span class="stat-count">${event.interested ? event.interested.length : 0}</span>
                        </span>
                    </div>
                    
                    <button class="btn btn-outline btn-small view-event-btn">
                        Details anzeigen
                    </button>
                </div>
            </div>
        `;
    }

    setupEventCardHandlers(container) {
        const eventCards = container.querySelectorAll('.event-card');
        
        eventCards.forEach(card => {
            const viewBtn = card.querySelector('.view-event-btn');
            const eventId = card.dataset.eventId;
            
            if (viewBtn && eventId) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = `/events/${eventId}`;
                });
            }
            
            // Make entire card clickable
            card.addEventListener('click', () => {
                if (eventId) {
                    window.location.href = `/events/${eventId}`;
                }
            });
        });
    }

    async loadGenreStats() {
        try {
            // Load stats for each genre
            const genres = ['goa', 'psytrance', 'dnb', 'hardcore'];
            
            for (const genre of genres) {
                const response = await fetch(`/api/events/?genre=${genre}&per_page=100`);
                
                if (response.ok) {
                    const data = await response.json();
                    const count = data.events ? data.events.length : 0;
                    
                    // Update the count in the UI
                    const countElement = document.getElementById(`${genre}-events`);
                    if (countElement) {
                        this.animateCounter(countElement, count);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading genre stats:', error);
        }
    }

    animateCounter(element, targetCount) {
        let currentCount = 0;
        const increment = Math.ceil(targetCount / 20) || 1;
        const duration = 1000; // 1 second
        const stepTime = duration / 20;

        const timer = setInterval(() => {
            currentCount += increment;
            
            if (currentCount >= targetCount) {
                currentCount = targetCount;
                clearInterval(timer);
            }
            
            element.textContent = currentCount;
        }, stepTime);
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in');
                }
            });
        }, observerOptions);

        // Observe sections for animation
        const sections = document.querySelectorAll('.features-section, .genres-section, .upcoming-events-section, .cta-section');
        sections.forEach(section => observer.observe(section));

        // Parallax effect for hero section
        this.setupParallax();
    }

    setupParallax() {
        const hero = document.querySelector('.hero-section');
        if (!hero) return;

        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = scrolled * 0.1; // Reduced parallax effect
            
            hero.style.transform = `translateY(${parallax}px)`;
        });
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HomePage();
});
