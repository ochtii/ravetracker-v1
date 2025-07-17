/**
 * Event Detail JavaScript for RaveTracker v1
 * GNU GPL v3 Licensed
 */

class EventDetail {
    constructor() {
        this.eventId = window.eventId;
        this.eventData = null;
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        if (!this.eventId) {
            this.showError();
            return;
        }

        // Setup auth state listener
        this.setupAuth();
        
        // Load event data
        await this.loadEvent();
        
        // Setup event handlers
        this.setupEventHandlers();
    }

    setupAuth() {
        // Wait for Firebase to be ready
        const waitForFirebase = () => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                const auth = firebase.auth();
                auth.onAuthStateChanged((user) => {
                    this.currentUser = user;
                    this.updateAuthDependentUI();
                    console.log('Auth state changed:', user ? user.email : 'Not logged in');
                });
            } else {
                // Retry after a short delay
                setTimeout(waitForFirebase, 100);
            }
        };
        
        waitForFirebase();
    }

    async loadEvent() {
        try {
            const response = await fetch(`/api/events/${this.eventId}`);
            
            if (!response.ok) {
                throw new Error(`Event not found: ${response.status}`);
            }
            
            const data = await response.json();
            this.eventData = data.event;
            
            this.renderEvent();
            this.updateViews();
            
        } catch (error) {
            console.error('Error loading event:', error);
            this.showError();
        }
    }

    renderEvent() {
        const event = this.eventData;
        
        // Hide loading, show content
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('event-content').style.display = 'block';
        
        // Update page title
        document.title = `${event.title} - RaveTracker v1`;
        
        // Event Header
        this.updateElement('event-genre', event.genre, (el, value) => {
            el.textContent = value;
            el.className = `genre-tag ${value.toLowerCase()}`;
        });
        
        this.updateElement('event-type', event.type);
        this.updateElement('event-title', event.title);
        this.updateElement('event-location', `${event.location}, ${event.city}`);
        this.updateElement('event-date', this.formatEventDate(event));
        
        // Description
        this.updateElement('event-description', event.description, (el, value) => {
            el.innerHTML = value.replace(/\n/g, '<br>');
        });
        
        // Artists
        this.renderArtists(event);
        
        // Special info
        if (event.special_info) {
            this.updateElement('special-info', event.special_info, (el, value) => {
                el.innerHTML = value.replace(/\n/g, '<br>');
            });
            document.getElementById('special-info-section').style.display = 'block';
        }
        
        // Sidebar info
        this.renderSidebarInfo(event);
        
        // Features
        this.renderFeatures(event);
        
        // Links
        this.renderLinks(event);
        
        // Stats
        this.updateElement('views-count', event.views || 0);
        this.updateElement('interested-count', event.interested_count || 0);
        
        // Organizer
        this.updateElement('organizer-name', event.created_by_name || 'Unbekannt');
        this.updateElement('created-date', this.formatCreatedDate(event.created_at));
        
        // Setup sharing
        this.setupSharing(event);
    }

    renderArtists(event) {
        if (!event.artists || event.artists.length === 0) return;
        
        const artistsGrid = document.getElementById('artists-grid');
        const artistsSection = document.getElementById('artists-section');
        
        // Render artists
        event.artists.forEach(artist => {
            const artistItem = document.createElement('div');
            artistItem.className = 'artist-item';
            artistItem.textContent = artist;
            artistsGrid.appendChild(artistItem);
        });
        
        // Headliner
        if (event.headliner) {
            this.updateElement('headliner-name', event.headliner);
            document.getElementById('headliner-section').style.display = 'block';
        }
        
        artistsSection.style.display = 'block';
    }

    renderSidebarInfo(event) {
        // Time info
        if (event.start_datetime) {
            this.updateElement('start-time', this.formatDateTime(event.start_datetime));
        }
        
        if (event.end_datetime) {
            this.updateElement('end-time', this.formatDateTime(event.end_datetime));
            document.getElementById('end-time-item').style.display = 'flex';
        }
        
        // Price
        if (event.price !== undefined) {
            const priceText = event.price === 0 ? 'Kostenlos' : `${event.price}€`;
            this.updateElement('event-price', priceText);
            document.getElementById('price-item').style.display = 'flex';
        }
        
        // Capacity
        if (event.capacity) {
            this.updateElement('event-capacity', `${event.capacity} Personen`);
            document.getElementById('capacity-item').style.display = 'flex';
        }
        
        // Stages
        if (event.stages) {
            const stagesText = event.stages === 1 ? '1 Stage' : `${event.stages} Stages`;
            this.updateElement('event-stages', stagesText);
            document.getElementById('stages-item').style.display = 'flex';
        }
        
        // Location details
        this.updateElement('location-name', event.location);
        if (event.address) {
            this.updateElement('location-address', event.address);
        }
        this.updateElement('location-city', `${event.city}${event.state ? `, ${event.state}` : ''}`);
    }

    renderFeatures(event) {
        const features = [];
        
        if (event.age_restriction) {
            features.push({ icon: 'fa-id-card', text: '18+ Event' });
        }
        
        if (event.camping) {
            features.push({ icon: 'fa-campground', text: 'Camping möglich' });
        }
        
        if (features.length > 0) {
            const featuresList = document.getElementById('features-list');
            features.forEach(feature => {
                const featureItem = document.createElement('div');
                featureItem.className = 'feature-item';
                featureItem.innerHTML = `
                    <i class="fas ${feature.icon}"></i>
                    <span>${feature.text}</span>
                `;
                featuresList.appendChild(featureItem);
            });
            document.getElementById('features-card').style.display = 'block';
        }
    }

    renderLinks(event) {
        const links = [];
        
        if (event.ticket_url) {
            links.push({ 
                url: event.ticket_url, 
                icon: 'fa-ticket-alt', 
                text: 'Tickets kaufen' 
            });
        }
        
        if (event.website) {
            links.push({ 
                url: event.website, 
                icon: 'fa-globe', 
                text: 'Website besuchen' 
            });
        }
        
        if (links.length > 0) {
            const linksList = document.getElementById('links-list');
            links.forEach(link => {
                const linkItem = document.createElement('a');
                linkItem.className = 'link-item';
                linkItem.href = link.url;
                linkItem.target = '_blank';
                linkItem.innerHTML = `
                    <i class="fas ${link.icon}"></i>
                    ${link.text}
                `;
                linksList.appendChild(linkItem);
            });
            document.getElementById('links-card').style.display = 'block';
        }
    }

    setupSharing(event) {
        const currentUrl = window.location.href;
        const shareText = `${event.title} - ${event.location}, ${event.city}`;
        
        // Update share links
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + currentUrl)}`;
        
        document.getElementById('share-facebook').href = facebookUrl;
        document.getElementById('share-twitter').href = twitterUrl;
        document.getElementById('share-whatsapp').href = whatsappUrl;
        document.getElementById('share-link-input').value = currentUrl;
    }

    setupEventHandlers() {
        // Share button
        const shareBtn = document.getElementById('share-btn');
        const shareModal = document.getElementById('share-modal');
        const closeShareModal = document.getElementById('close-share-modal');
        
        shareBtn.addEventListener('click', () => {
            shareModal.style.display = 'flex';
        });
        
        closeShareModal.addEventListener('click', () => {
            shareModal.style.display = 'none';
        });
        
        // Copy link
        const copyLinkBtn = document.getElementById('copy-link-btn');
        copyLinkBtn.addEventListener('click', async () => {
            const linkInput = document.getElementById('share-link-input');
            try {
                await navigator.clipboard.writeText(linkInput.value);
                copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Kopiert!';
                setTimeout(() => {
                    copyLinkBtn.innerHTML = '<i class="fas fa-link"></i> Link kopieren';
                }, 2000);
            } catch (err) {
                // Fallback for older browsers
                linkInput.select();
                document.execCommand('copy');
                copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Kopiert!';
                setTimeout(() => {
                    copyLinkBtn.innerHTML = '<i class="fas fa-link"></i> Link kopieren';
                }, 2000);
            }
        });
        
        // Interested button
        const interestedBtn = document.getElementById('interested-btn');
        interestedBtn.addEventListener('click', () => {
            this.toggleInterested();
        });
        
        // Close modal on outside click
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                shareModal.style.display = 'none';
            }
        });
    }

    async toggleInterested() {
        if (!this.currentUser) {
            window.location.href = '/login';
            return;
        }
        
        // TODO: Implement interested functionality
        const interestedBtn = document.getElementById('interested-btn');
        const interestedText = document.getElementById('interested-text');
        
        // Mock toggle for now
        if (interestedText.textContent === 'Interessiert') {
            interestedText.textContent = 'Nicht mehr interessiert';
            interestedBtn.classList.add('interested');
        } else {
            interestedText.textContent = 'Interessiert';
            interestedBtn.classList.remove('interested');
        }
    }

    async updateViews() {
        try {
            await fetch(`/api/events/${this.eventId}/view`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error updating views:', error);
        }
    }

    updateAuthDependentUI() {
        // Show/hide auth-dependent buttons
        const interestedBtn = document.getElementById('interested-btn');
        if (this.currentUser) {
            interestedBtn.style.display = 'flex';
        } else {
            interestedBtn.style.display = 'none';
        }
    }

    showError() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'flex';
    }

    updateElement(id, value, customUpdater = null) {
        const element = document.getElementById(id);
        if (element && value !== undefined) {
            if (customUpdater) {
                customUpdater(element, value);
            } else {
                element.textContent = value;
            }
        }
    }

    formatEventDate(event) {
        if (!event.start_datetime) return 'Datum TBA';
        
        const date = new Date(event.start_datetime);
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        
        return date.toLocaleDateString('de-DE', options);
    }

    formatDateTime(datetime) {
        const date = new Date(datetime);
        const dateOptions = { 
            weekday: 'short',
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
        };
        const timeOptions = { 
            hour: '2-digit', 
            minute: '2-digit'
        };
        
        return `${date.toLocaleDateString('de-DE', dateOptions)} um ${date.toLocaleTimeString('de-DE', timeOptions)}`;
    }

    formatCreatedDate(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const options = { 
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
        };
        
        return `Erstellt am ${date.toLocaleDateString('de-DE', options)}`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EventDetail();
});
