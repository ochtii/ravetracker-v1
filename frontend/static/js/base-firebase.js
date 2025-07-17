/**
 * Base JavaScript for RaveTracker v1 with Firebase Auth
 * GNU GPL v3 Licensed
 */

// Global app state
window.App = {
    currentUser: null,
    isAuthenticated: false
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupMobileMenu();
    
    // Wait for Firebase to initialize
    const checkFirebase = setInterval(() => {
        if (window.getFirebaseAuth) {
            clearInterval(checkFirebase);
            initializeAuth();
        }
    }, 100);
}

function initializeAuth() {
    const auth = window.getFirebaseAuth();
    if (auth) {
        auth.onAuthStateChanged((user) => {
            App.currentUser = user;
            App.isAuthenticated = !!user;
            updateNavigation(user);
        });
    }
}

function updateNavigation(user) {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (user) {
        // User is logged in
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            const userName = userMenu.querySelector('.user-name');
            if (userName) {
                userName.textContent = user.displayName || user.email.split('@')[0];
            }
        }
    } else {
        // User is not logged in
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

function setupNavigation() {
    // Genre filter buttons
    const genreButtons = document.querySelectorAll('.genre-btn');
    genreButtons.forEach(button => {
        button.addEventListener('click', function() {
            const genre = this.dataset.genre;
            filterByGenre(genre);
        });
    });
    
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Logout functionality
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });
}

function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navbar = document.querySelector('.navbar');
    
    if (menuToggle && navbar) {
        menuToggle.addEventListener('click', function() {
            navbar.classList.toggle('mobile-open');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navbar.contains(e.target)) {
                navbar.classList.remove('mobile-open');
            }
        });
    }
}

function filterByGenre(genre) {
    // Update active button
    const genreButtons = document.querySelectorAll('.genre-btn');
    genreButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.genre === genre);
    });
    
    // Filter events if on events page
    if (window.location.pathname.includes('/events') && window.eventsPage) {
        window.eventsPage.filterByGenre(genre);
    }
}

function handleSearch(event) {
    const query = event.target.value.trim();
    
    // Search events if on events page
    if (window.location.pathname.includes('/events') && window.eventsPage) {
        window.eventsPage.search(query);
    }
}

async function handleLogout() {
    try {
        const auth = window.getFirebaseAuth();
        if (auth) {
            await auth.signOut();
            showMessage('Erfolgreich abgemeldet', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Fehler beim Abmelden', 'error');
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    
    // Add styles
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
        backdrop-filter: blur(10px);
    `;
    
    // Add animation
    if (!document.querySelector('#message-animations')) {
        const style = document.createElement('style');
        style.id = 'message-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to page
    document.body.appendChild(messageEl);
    
    // Remove after 5 seconds
    setTimeout(() => {
        messageEl.remove();
    }, 5000);
}

// API helpers with Firebase Auth
async function apiRequest(url, options = {}) {
    const auth = window.getFirebaseAuth();
    
    // Get Firebase ID token for authenticated requests
    if (auth && auth.currentUser) {
        try {
            const token = await auth.currentUser.getIdToken();
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };
        } catch (error) {
            console.warn('Could not get Firebase token:', error);
        }
    }
    
    // Set default headers
    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
}

// Export API helpers
window.api = {
    get: (url) => apiRequest(url),
    post: (url, data) => apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    put: (url, data) => apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (url) => apiRequest(url, {
        method: 'DELETE'
    })
};

// Export utility functions
window.showMessage = showMessage;
