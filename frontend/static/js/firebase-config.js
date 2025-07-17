/**
 * Firebase Web Configuration for RaveTracker v1
 * GNU GPL v3 Licensed
 */

// Firebase Web App Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDNK4wiEnbpadvAbbFTGVDBxlwV_zJ0Dg0",
    authDomain: "ravetracker-v1.firebaseapp.com",
    projectId: "ravetracker-v1",
    storageBucket: "ravetracker-v1.firebasestorage.app",
    messagingSenderId: "817342219915",
    appId: "1:817342219915:web:6a270b72c8066b20f6368e",
    measurementId: "G-18KVQEZLKJ"
};

// Initialize Firebase
let app, auth, db;
let authInitialized = false;

// Set loading state for auth elements
function setLoadingState(isLoading) {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (isLoading) {
        if (authButtons) {
            authButtons.classList.add('loading');
        }
        if (userMenu) {
            userMenu.classList.add('loading');
        }
    } else {
        if (authButtons) {
            authButtons.classList.remove('loading');
        }
        if (userMenu) {
            userMenu.classList.remove('loading');
        }
    }
}

// Update navbar based on auth state
function updateNavbar(isLoggedIn, user = null) {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    // Remove loading classes
    if (authButtons) authButtons.classList.remove('loading');
    if (userMenu) userMenu.classList.remove('loading');
    
    if (isLoggedIn && user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'block';
            const userName = userMenu.querySelector('.user-name');
            if (userName) {
                userName.textContent = user.displayName || user.email;
            }
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Wait for Firebase SDKs to load
document.addEventListener('DOMContentLoaded', function() {
    // Check for cached user data immediately to prevent flicker
    const cachedUser = sessionStorage.getItem('currentUser');
    if (cachedUser) {
        try {
            const user = JSON.parse(cachedUser);
            // Immediately show logged in state while Firebase initializes
            updateNavbar(true, user);
        } catch (e) {
            sessionStorage.removeItem('currentUser');
            setLoadingState(true);
        }
    } else {
        // Initially hide navigation elements until auth state is determined
        setLoadingState(true);
    }
    
    if (typeof firebase !== 'undefined') {
        // Initialize Firebase App
        app = firebase.initializeApp(firebaseConfig);
        
        // Initialize Firebase Auth
        auth = firebase.auth();
        
        // Initialize Firestore
        db = firebase.firestore();
        
        // Set auth persistence
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        // Set up auth state listener
        auth.onAuthStateChanged(function(user) {
            authInitialized = true;
            setLoadingState(false);
            
            if (user) {
                // User is signed in
                console.log('User authenticated:', user.uid);
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                };
                sessionStorage.setItem('currentUser', JSON.stringify(userData));
                updateNavbar(true, user);
            } else {
                // User is signed out
                console.log('User not authenticated');
                sessionStorage.removeItem('currentUser');
                updateNavbar(false);
            }
        });
        
        // Set up logout button event listener
        document.addEventListener('click', function(e) {
            if (e.target.id === 'logout-btn' || e.target.classList.contains('logout-btn')) {
                e.preventDefault();
                logout();
            }
        });
        
        console.log('Firebase initialized successfully');
    } else {
        console.error('Firebase SDK not loaded');
    }
});

// Global logout function
window.logout = function() {
    if (auth) {
        auth.signOut().then(() => {
            window.location.href = '/';
        }).catch((error) => {
            console.error('Logout error:', error);
        });
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.firebaseConfig = firebaseConfig;
    window.getFirebaseAuth = () => auth;
    window.getFirebaseDB = () => db;
}
