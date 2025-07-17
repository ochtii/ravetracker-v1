/*
RaveTracker v1 - Base JavaScript
GNU GPL v3 Licensed
*/

class RaveTracker {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentUser = null;
        this.firebaseConfig = null;
        this.init();
    }

    init() {
        this.loadFirebaseConfig();
        this.setupNavigation();
        this.checkAuthStatus();
        this.setupGlobalEventListeners();
    }

    // Firebase Configuration
    loadFirebaseConfig() {
        // Load Firebase config if available
        if (typeof window.firebaseConfig !== 'undefined') {
            this.firebaseConfig = window.firebaseConfig;
            console.log('Firebase config loaded');
        }
    }

    // Authentication Management
    checkAuthStatus() {
        const token = localStorage.getItem('auth_token');
        
        if (token) {
            this.verifyToken(token);
        } else {
            this.updateUIForLoggedOut();
        }
    }

    async verifyToken(token) {
        try {
            const response = await fetch('/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateUIForLoggedIn();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            this.logout();
        }
    }

    updateUIForLoggedIn() {
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const usernameSpan = document.getElementById('username');
        const myEventsLink = document.getElementById('my-events-link');

        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'block';
        if (usernameSpan && this.currentUser) {
            usernameSpan.textContent = this.currentUser.username;
        }

        // Show my events for all authenticated users
        if (myEventsLink) {
            myEventsLink.style.display = 'flex';
        }

        // Show role-specific menu items
        this.updateRoleSpecificUI();
    }

    updateUIForLoggedOut() {
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const myEventsLink = document.getElementById('my-events-link');
        const createEventNav = document.getElementById('create-event-nav');

        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        
        // Hide authenticated user features
        if (myEventsLink) myEventsLink.style.display = 'none';
        if (createEventNav) createEventNav.style.display = 'none';
    }

    updateRoleSpecificUI() {
        if (!this.currentUser) return;

        const organizerLink = document.getElementById('organizer-link');
        const moderatorLink = document.getElementById('moderator-link');
        const adminLink = document.getElementById('admin-link');
        const createEventNav = document.getElementById('create-event-nav');

        // Show links based on user role
        if (organizerLink && ['organizer', 'moderator', 'admin'].includes(this.currentUser.role)) {
            organizerLink.style.display = 'block';
            organizerLink.href = '/organizer';
        }

        if (moderatorLink && ['moderator', 'admin'].includes(this.currentUser.role)) {
            moderatorLink.style.display = 'block';
            moderatorLink.href = '/moderator';
        }

        if (adminLink && this.currentUser.role === 'admin') {
            adminLink.style.display = 'block';
            adminLink.href = '/admin';
        }

        // Show create event for organizers and admins
        if (createEventNav && ['organizer', 'moderator', 'admin'].includes(this.currentUser.role)) {
            createEventNav.style.display = 'flex';
        }
    }

    logout() {
        localStorage.removeItem('auth_token');
        this.currentUser = null;
        this.updateUIForLoggedOut();
        
        // Redirect to home if on protected page
        if (window.location.pathname.includes('/dashboard') || 
            window.location.pathname.includes('/organizer') ||
            window.location.pathname.includes('/moderator') ||
            window.location.pathname.includes('/admin')) {
            window.location.href = '/';
        }
    }

    // Navigation
    setupNavigation() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking on links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navToggle && navMenu) {
                    navToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            });
        });
    }

    setupGlobalEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            const dropdowns = document.querySelectorAll('.dropdown');
            dropdowns.forEach(dropdown => {
                if (!dropdown.contains(e.target)) {
                    const content = dropdown.querySelector('.dropdown-content');
                    if (content) {
                        content.style.opacity = '0';
                        content.style.visibility = 'hidden';
                        content.style.transform = 'translateY(-10px)';
                    }
                }
            });
        });
    }

    // API Helper Methods
    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('auth_token');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(endpoint, finalOptions);
            
            if (response.status === 401) {
                this.logout();
                throw new Error('Authentication required');
            }

            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async get(endpoint) {
        return this.apiRequest(endpoint);
    }

    async post(endpoint, data) {
        return this.apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.apiRequest(endpoint, {
            method: 'DELETE'
        });
    }

    // Utility Methods
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 10000;
            padding: 16px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        // Set background based on type
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(67, 160, 71, 0.9))';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, rgba(244, 67, 54, 0.9), rgba(229, 57, 53, 0.9))';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(135deg, rgba(255, 152, 0, 0.9), rgba(251, 140, 0, 0.9))';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, rgba(33, 150, 243, 0.9), rgba(30, 136, 229, 0.9))';
        }

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove after 5 seconds
        const autoRemove = setTimeout(() => {
            this.removeNotification(notification);
        }, 5000);

        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeNotification(notification);
        });
    }

    removeNotification(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    showLoading(element) {
        if (element) {
            element.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Laden...</p>
                </div>
            `;
        }
    }

    hideLoading(element) {
        if (element) {
            const spinner = element.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    }

    // Genre utilities
    getGenreColor(genre) {
        const colors = {
            'goa': '#ff6b6b',
            'psytrance': '#4ecdc4',
            'dnb': '#45b7d1',
            'hardcore': '#f39c12',
            'techno': '#9b59b6',
            'trance': '#e74c3c'
        };
        return colors[genre] || '#666';
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
        return icons[genre] || '🎵';
    }

    // Form validation
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePassword(password) {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
    }

    // Event handlers for common form interactions
    setupFormValidation(formElement) {
        if (!formElement) return;

        const inputs = formElement.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateInput(input);
            });

            input.addEventListener('input', () => {
                this.clearInputError(input);
            });
        });
    }

    validateInput(input) {
        const value = input.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (input.type) {
            case 'email':
                if (!this.validateEmail(value)) {
                    isValid = false;
                    errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
                }
                break;
            case 'password':
                if (value.length < 8) {
                    isValid = false;
                    errorMessage = 'Das Passwort muss mindestens 8 Zeichen lang sein.';
                }
                break;
            default:
                if (input.required && !value) {
                    isValid = false;
                    errorMessage = 'Dieses Feld ist erforderlich.';
                }
        }

        if (!isValid) {
            this.showInputError(input, errorMessage);
        } else {
            this.clearInputError(input);
        }

        return isValid;
    }

    showInputError(input, message) {
        this.clearInputError(input);
        
        input.classList.add('error');
        
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #f44336;
            font-size: 0.8rem;
            margin-top: 4px;
            display: block;
        `;
        
        input.parentNode.appendChild(errorElement);
    }

    clearInputError(input) {
        input.classList.remove('error');
        
        const errorElement = input.parentNode.querySelector('.form-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
}

// Initialize RaveTracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.raveTracker = new RaveTracker();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RaveTracker;
}
