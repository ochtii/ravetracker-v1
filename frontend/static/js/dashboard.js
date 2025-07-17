/**
 * Dashboard JavaScript for RaveTracker v1
 * GNU GPL v3 Licensed
 */

class Dashboard {
    constructor() {
        this.currentTip = 0;
        this.tips = [
            {
                icon: "💧",
                title: "Hydration ist Key!",
                text: "Trinke alle 30 Minuten Wasser - auch wenn du noch nicht durstig bist. Dein Future-Self wird es dir danken!",
                category: "Gesundheit"
            },
            {
                icon: "👟",
                title: "Bequeme Schuhe sind Gold wert",
                text: "12 Stunden tanzen in neuen Sneakern? Das ist ein Rezept für Blasen. Nimm deine bewährten Tanzschuhe!",
                category: "Komfort"
            },
            {
                icon: "🔋",
                title: "Powerbank & Kabel nicht vergessen",
                text: "Nichts ist schlimmer als ein toter Akku um 3 Uhr morgens. Pack eine Powerbank ein - und das passende Kabel!",
                category: "Tech"
            },
            {
                icon: "🥜",
                title: "Snacks für den Energy-Boost",
                text: "Nüsse, Trockenfrüchte oder Energieriegel halten dich fit. Verteile sie in verschiedenen Taschen!",
                category: "Energie"
            },
            {
                icon: "🧻",
                title: "Klopapier ist Währung",
                text: "Auf Festivals ist Klopapier wertvoller als Gold. Pack eine Rolle ein und werde zum Helden der Toiletten!",
                category: "Festival"
            },
            {
                icon: "👂",
                title: "Ohrstöpsel retten dein Gehör",
                text: "Tinnitus ist nicht cool. Hochwertige Ohrstöpsel lassen die Musik durch, schützen aber vor Schäden.",
                category: "Gesundheit"
            },
            {
                icon: "🧥",
                title: "Zwiebellook ist angesagt",
                text: "Morgens kalt, mittags heiß, nachts wieder kalt. Zieh dich in Schichten an - du wirst es brauchen!",
                category: "Kleidung"
            },
            {
                icon: "📱",
                title: "Screenshots von wichtigen Infos",
                text: "Kein Netz? Kein Problem! Speichere Anfahrt, Zeitplan und Notfallnummern als Screenshots ab.",
                category: "Organisation"
            },
            {
                icon: "🤝",
                title: "Buddy-System aktivieren",
                text: "Verliert euch nie aus den Augen! Bestimmt einen Treffpunkt und checkt regelmäßig ein. Safety first!",
                category: "Sicherheit"
            },
            {
                icon: "💸",
                title: "Bargeld ist King",
                text: "Nicht alle Stände akzeptieren Karten. Pack genug Bargeld ein - aber verstecke es gut in verschiedenen Taschen!",
                category: "Geld"
            },
            {
                icon: "🕶️",
                title: "Sonnenbrille nicht vergessen",
                text: "Outdoor-Events ohne Sonnenbrille? Autsch! Schütze deine Augen und sieh dabei noch cool aus.",
                category: "Komfort"
            },
            {
                icon: "🧴",
                title: "Sonnencreme ist Pflicht",
                text: "LSF 30+ auch bei bewölktem Himmel! Ein Sonnenbrand ruiniert das ganze Wochenende. Creme dich alle 2h neu ein.",
                category: "Gesundheit"
            },
            {
                icon: "🎒",
                title: "Bauchtasche > Rucksack",
                text: "In der Crowd ist eine Bauchtasche viel praktischer. Du hast alles im Blick und kommst besser durch die Menge!",
                category: "Organisation"
            },
            {
                icon: "🌙",
                title: "Stirnlampe für die Nacht",
                text: "Wenn du nachts dein Zelt suchst oder aufs Klo musst, ist eine Stirnlampe Gold wert. Hände bleiben frei zum Tanzen!",
                category: "Festival"
            },
            {
                icon: "🚿",
                title: "Trockenshampoo ist Magic",
                text: "3 Tage keine Dusche? Trockenshampoo zaubert dir frische Haare und du fühlst dich wieder menschlich!",
                category: "Hygiene"
            },
            {
                icon: "🧽",
                title: "Feuchttücher für alles",
                text: "Hände, Gesicht, Schuhe - Feuchttücher lösen alle Probleme! Pack mehrere Pakete ein, du wirst sie brauchen.",
                category: "Hygiene"
            },
            {
                icon: "🔦",
                title: "Taschenlampe mit rotem Licht",
                text: "Rotes Licht stört andere nicht beim Schlafen und ruiniert nicht die Night-Vision. Sehr respektvoll!",
                category: "Festival"
            },
            {
                icon: "💊",
                title: "Mini-Apotheke mitnehmen",
                text: "Kopfschmerztabletten, Pflaster, Desinfektionsmittel - die Basics können dir (und anderen) den Tag retten!",
                category: "Gesundheit"
            },
            {
                icon: "🧦",
                title: "Ersatzsocken sind Luxus",
                text: "Nasse Füße? Frische Socken verwandeln dich zurück in einen Menschen! Pack mindestens 2 Paar extra ein.",
                category: "Komfort"
            },
            {
                icon: "📍",
                title: "Zelt-Koordinaten notieren",
                text: "Zelt-Nummer, Reihe, markante Punkte - schreib alles auf! Nach 12h feiern sieht alles gleich aus.",
                category: "Organisation"
            },
            {
                icon: "🔌",
                title: "Mehrfachstecker ist Teamwork",
                text: "Ein Mehrfachstecker macht dich zum Helden an jeder Ladestation. Sharing is caring!",
                category: "Tech"
            },
            {
                icon: "🥤",
                title: "Elektrolyte auffüllen",
                text: "Isotonische Getränke oder Elektrolyt-Tabletten helfen gegen den Kater und halten dich fit!",
                category: "Gesundheit"
            },
            {
                icon: "🎭",
                title: "Gesichtsmaske gegen Staub",
                text: "Bandana oder Buff schützen vor Staub und sehen noch dazu cool aus. Deine Lunge wird es dir danken!",
                category: "Gesundheit"
            },
            {
                icon: "🧳",
                title: "Packliste zweimal checken",
                text: "Schreib alles auf und hak ab! Nichts ist schlimmer als 200km vom Festival zu merken, dass du was vergessen hast.",
                category: "Organisation"
            }
        ];
        
        this.init();
    }

    async init() {
        try {
            this.setupCarousel();
            this.loadUserData();
            this.loadRecentActivities();
            this.setupEventHandlers();
            this.setupQuickstartGuide();
            this.loadDashboardData();
            this.initializeTips();
            this.updateStats();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    }

    setupQuickstartGuide() {
        // Der Click-Handler ist jetzt direkt im HTML als onclick-Attribut
        // Diese Methode stellt sicher, dass dashboardManager global verfügbar ist
        window.dashboardManager = this;
    }

    startQuickstartGuide() {
        // Check if user has completed guide before
        const hasCompletedGuide = localStorage.getItem('quickstart_completed');
        
        if (hasCompletedGuide) {
            this.showGuideOptions();
        } else {
            this.showWelcomeStep();
        }
    }

    showWelcomeStep() {
        const modal = this.createGuideModal({
            title: '🚀 Willkommen bei RaveTracker!',
            content: `
                <p>Lass uns zusammen RaveTracker entdecken!</p>
                <p>In nur 3 Schritten zeigen wir dir, wie du das Beste aus der Plattform herausholst.</p>
                <div class="guide-preview">
                    <div class="preview-step">
                        <span class="preview-number">1</span>
                        <span>Events entdecken</span>
                    </div>
                    <div class="preview-step">
                        <span class="preview-number">2</span>
                        <span>Interesse zeigen</span>
                    </div>
                    <div class="preview-step">
                        <span class="preview-number">3</span>
                        <span>Community beitreten</span>
                    </div>
                </div>
            `,
            buttons: [
                { text: 'Guide starten', action: () => this.showStep1(), primary: true },
                { text: 'Später', action: () => this.closeModal() }
            ]
        });
        
        document.body.appendChild(modal);
    }

    showStep1() {
        const modal = this.createGuideModal({
            title: '🔍 Schritt 1: Events entdecken',
            content: `
                <p>Entdecke die heißesten Raves und Events!</p>
                <ul class="guide-features">
                    <li>🎯 Filtere nach Genre, Location und Datum</li>
                    <li>🗺️ Finde Events in deiner Nähe</li>
                    <li>⭐ Sortiere nach Beliebtheit</li>
                </ul>
            `,
            buttons: [
                { text: 'Weiter', action: () => this.showStep2(), primary: true },
                { text: 'Events ansehen', action: () => window.location.href = '/events' }
            ],
            step: '1/3'
        });
        
        this.replaceModal(modal);
    }

    showStep2() {
        const modal = this.createGuideModal({
            title: '❤️ Schritt 2: Interesse zeigen',
            content: `
                <p>Zeige dein Interesse und bestätige deine Teilnahme!</p>
                <ul class="guide-features">
                    <li>💖 Markiere interessante Events</li>
                    <li>📅 Bestätige deine Teilnahme</li>
                    <li>📊 Verfolge Event-Statistiken</li>
                </ul>
            `,
            buttons: [
                { text: 'Weiter', action: () => this.showStep3(), primary: true },
                { text: 'Zurück', action: () => this.showStep1() }
            ],
            step: '2/3'
        });
        
        this.replaceModal(modal);
    }

    showStep3() {
        const modal = this.createGuideModal({
            title: '👥 Schritt 3: Community beitreten',
            content: `
                <p>Werde Teil der RaveTracker Community!</p>
                <ul class="guide-features">
                    <li>📝 Teile deine Erfahrungen</li>
                    <li>🌟 Bewerte Events</li>
                    <li>💬 Vernetze dich mit Ravern</li>
                </ul>
                <div class="guide-completion">
                    <h4>🎉 Du bist bereit!</h4>
                    <p>Zeit, dein erstes Event zu finden!</p>
                </div>
            `,
            buttons: [
                { text: 'Los geht\'s!', action: () => this.completeGuide(), primary: true },
                { text: 'Zurück', action: () => this.showStep2() }
            ],
            step: '3/3'
        });
        
        this.replaceModal(modal);
    }

    completeGuide() {
        localStorage.setItem('quickstart_completed', 'true');
        this.closeModal();
        window.location.href = '/events';
    }

    showGuideOptions() {
        const modal = this.createGuideModal({
            title: '🎯 Quickstart Optionen',
            content: `
                <p>Du hast den Guide bereits abgeschlossen! Was möchtest du tun?</p>
                <div class="guide-options">
                    <div class="option-card" onclick="window.location.href='/events'">
                        <span class="option-icon">🔍</span>
                        <span class="option-text">Events entdecken</span>
                    </div>
                    <div class="option-card" onclick="window.location.href='/my-events'">
                        <span class="option-icon">📅</span>
                        <span class="option-text">Meine Events</span>
                    </div>
                    <div class="option-card" onclick="dashboardManager.resetAndStartGuide()">
                        <span class="option-icon">🔄</span>
                        <span class="option-text">Guide wiederholen</span>
                    </div>
                </div>
            `,
            buttons: [
                { text: 'Schließen', action: () => this.closeModal() }
            ]
        });
        
        document.body.appendChild(modal);
    }

    resetAndStartGuide() {
        localStorage.removeItem('quickstart_completed');
        this.closeModal();
        setTimeout(() => this.showWelcomeStep(), 300);
    }

    createGuideModal({ title, content, buttons, step }) {
        const modal = document.createElement('div');
        modal.className = 'guide-modal-overlay';
        
        modal.innerHTML = `
            <div class="guide-modal">
                <div class="guide-modal-header">
                    <h2>${title}</h2>
                    ${step ? `<span class="guide-step">${step}</span>` : ''}
                </div>
                <div class="guide-modal-body">
                    ${content}
                </div>
                <div class="guide-modal-footer">
                    ${buttons.map((btn, i) => `
                        <button class="guide-btn ${btn.primary ? 'primary' : ''}" data-action="${i}">
                            ${btn.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        // Add event listeners
        buttons.forEach((btn, index) => {
            const button = modal.querySelector(`[data-action="${index}"]`);
            button.addEventListener('click', btn.action);
        });

        return modal;
    }

    replaceModal(newModal) {
        const existingModal = document.querySelector('.guide-modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }
        document.body.appendChild(newModal);
    }

    closeModal() {
        const modal = document.querySelector('.guide-modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    setupCarousel() {
        const carouselTrack = document.getElementById('tips-carousel');
        const dotsContainer = document.getElementById('carousel-dots');
        
        if (!carouselTrack || !dotsContainer) return;

        // Create tip cards
        this.tips.forEach((tip, index) => {
            const tipCard = this.createTipCard(tip);
            carouselTrack.appendChild(tipCard);
            
            // Create dot
            const dot = document.createElement('div');
            dot.className = 'carousel-dot';
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => this.goToTip(index));
            dotsContainer.appendChild(dot);
        });

        // Auto-rotate carousel
        setInterval(() => this.nextTip(), 8000);
    }

    createTipCard(tip) {
        const card = document.createElement('div');
        card.className = 'tip-card';
        card.innerHTML = `
            <div class="tip-icon">${tip.icon}</div>
            <h3 class="tip-title">${tip.title}</h3>
            <p class="tip-text">${tip.text}</p>
            <span class="tip-category">${tip.category}</span>
        `;
        return card;
    }

    goToTip(index) {
        this.currentTip = index;
        this.updateCarousel();
    }

    nextTip() {
        this.currentTip = (this.currentTip + 1) % this.tips.length;
        this.updateCarousel();
    }

    prevTip() {
        this.currentTip = this.currentTip === 0 ? this.tips.length - 1 : this.currentTip - 1;
        this.updateCarousel();
    }

    updateCarousel() {
        const track = document.getElementById('tips-carousel');
        const dots = document.querySelectorAll('.carousel-dot');
        
        if (track) {
            track.style.transform = `translateX(-${this.currentTip * 100}%)`;
        }
        
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentTip);
        });
    }

    setupEventHandlers() {
        // Carousel navigation buttons
        const prevBtn = document.getElementById('tips-prev');
        const nextBtn = document.getElementById('tips-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevTip());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextTip());
        }
    }

    async loadUserData() {
        const auth = window.getFirebaseAuth();
        if (!auth) {
            // Firebase not loaded yet, redirect to login
            window.location.href = '/login';
            return;
        }

        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                // User not logged in, redirect to login
                window.location.href = '/login';
                return;
            }

            const displayName = user.displayName || user.email.split('@')[0];
            const userDisplayElement = document.getElementById('user-display-name');
            if (userDisplayElement) {
                userDisplayElement.textContent = displayName;
                this.animateText(userDisplayElement);
            }

            // Load user stats from Firestore
            await this.loadUserStats(user.uid);
        });
    }

    async loadUserStats(userId) {
        try {
            const db = window.getFirebaseDB();
            if (!db) return;

            // Get user profile
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Update stats with real data
                this.updateStatCard('favorite-genre', userData.favorite_genre || 'Psytrance');
                this.updateStatCard('party-score', (userData.party_score || 8.5).toFixed(1));
            }

            // Get user events attendance (mock data for now)
            this.updateStatCard('events-attended', Math.floor(Math.random() * 25) + 5);
            this.updateStatCard('upcoming-events', Math.floor(Math.random() * 8) + 1);

        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            this.animateCounter(element, value);
        }
    }

    animateCounter(element, targetValue) {
        const isNumeric = !isNaN(parseFloat(targetValue));
        
        if (isNumeric) {
            const target = parseFloat(targetValue);
            const duration = 2000;
            const steps = 60;
            const increment = target / steps;
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                
                if (Number.isInteger(target)) {
                    element.textContent = Math.floor(current);
                } else {
                    element.textContent = current.toFixed(1);
                }
            }, duration / steps);
        } else {
            element.textContent = targetValue;
        }
    }

    animateText(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 100);
    }

    async loadRecentActivities() {
        const activitiesContainer = document.getElementById('recent-activities');
        if (!activitiesContainer) return;

        // Mock activities for now
        const activities = [
            {
                icon: "🎵",
                title: "Du hast das Goa Festival 2025 als interessant markiert",
                meta: "Waldlichtung am Chiemsee, Bayern",
                time: "vor 2 Stunden"
            },
            {
                icon: "⭐",
                title: "Neue Events in deinem Lieblings-Genre verfügbar",
                meta: "3 neue Psytrance Events",
                time: "vor 1 Tag"
            },
            {
                icon: "🎟️",
                title: "Erinnerung: Drum & Bass Underground heute Abend",
                meta: "Industrial Warehouse, Berlin",
                time: "vor 2 Tagen"
            }
        ];

        activities.forEach(activity => {
            const activityElement = this.createActivityElement(activity);
            activitiesContainer.appendChild(activityElement);
        });
    }

    createActivityElement(activity) {
        const element = document.createElement('div');
        element.className = 'activity-item';
        element.innerHTML = `
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-details">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-meta">${activity.meta}</div>
            </div>
            <div class="activity-time">${activity.time}</div>
        `;
        return element;
    }

    loadDashboardData() {
        // Lade Dashboard-spezifische Daten
        console.log('Loading dashboard data...');
    }

    initializeTips() {
        // Initialisiere Tipps-System
        this.setupCarousel();
    }

    updateStats() {
        // Aktualisiere Statistiken
        console.log('Updating stats...');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new Dashboard();
});
