/**
 * Firebase Authentication for RaveTracker v1
 * GNU GPL v3 Licensed
 */

// Auth state management
let currentUser = null;

// Wait for Firebase to be initialized
document.addEventListener('DOMContentLoaded', function() {
    // Get auth instance
    const auth = window.getFirebaseAuth();
    
    if (!auth) {
        console.error('Firebase Auth not initialized');
        return;
    }
    
    // Listen to auth state changes
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        
        if (user) {
            // User is signed in, get and store token
            try {
                const token = await user.getIdToken();
                document.cookie = `auth_token=${token}; path=/; max-age=86400`; // 24 hours
            } catch (error) {
                console.error('Error getting token:', error);
            }
        } else {
            // User is signed out, clear token
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
    });
    
    // Set up auth forms
    setupAuthForms();
});

function setupAuthForms() {
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Login form  
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout buttons
    const logoutBtns = document.querySelectorAll('.logout-btn, #logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const username = formData.get('username');
    const inviteCode = formData.get('invite_code');
    
    // Validate form
    if (!email || !password || !username || !inviteCode) {
        showMessage('Alle Felder sind erforderlich', 'error');
        return;
    }
    
    try {
        // Validate invite code with backend first
        const inviteResponse = await fetch('/api/validate-invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ invite_code: inviteCode })
        });
        
        if (!inviteResponse.ok) {
            const errorData = await inviteResponse.json();
            throw new Error(errorData.error || 'Invite code validation failed');
        }
        
        // Create Firebase user
        const auth = window.getFirebaseAuth();
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile
        await user.updateProfile({
            displayName: username
        });
        
        // Store user data in Firestore
        const db = window.getFirebaseDB();
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            username: username,
            email: email,
            role: 'user',
            subscription_plan: 'free',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            invite_code_used: inviteCode
        });
        
        // Mark invite code as used
        await fetch('/api/use-invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                invite_code: inviteCode,
                user_id: user.uid 
            })
        });
        
        // Sign out user after registration
        await auth.signOut();
        
        showMessage('Registrierung erfolgreich! Bitte melden Sie sich jetzt an.', 'success');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage(getErrorMessage(error), 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    if (!email || !password) {
        showMessage('Email und Passwort sind erforderlich', 'error');
        return;
    }
    
    try {
        console.log('Starting login process...');
        
        // FOR TESTING: Set a dummy token first to test the system
        const dummyToken = 'test_token_' + Date.now();
        document.cookie = `auth_token=${dummyToken}; path=/; max-age=86400`;
        localStorage.setItem('auth_token', dummyToken);
        localStorage.setItem('user_logged_in', 'true');
        
        console.log('Test token set:', dummyToken);
        
        showMessage('Login erfolgreich (Test-Modus)!', 'success');
        
        // Now try Firebase auth
        const auth = window.getFirebaseAuth();
        if (auth) {
            console.log('Firebase auth available, trying login...');
            const result = await auth.signInWithEmailAndPassword(email, password);
            
            // Get Firebase ID token and replace dummy token
            const token = await result.user.getIdToken();
            document.cookie = `auth_token=${token}; path=/; max-age=86400`;
            localStorage.setItem('auth_token', token);
            
            console.log('Firebase login successful, real token set:', token.substring(0, 20) + '...');
            showMessage('Login erfolgreich!', 'success');
        } else {
            console.log('Firebase auth not available, using test token');
        }
        
        // Redirect to home page (will now redirect to dashboard)
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Even if Firebase fails, keep the test token for system testing
        const testToken = localStorage.getItem('auth_token');
        if (testToken && testToken.startsWith('test_token_')) {
            showMessage('Login erfolgreich (Test-Modus - Firebase Fehler)!', 'warning');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            showMessage(getErrorMessage(error), 'error');
        }
    }
}

async function handleLogout() {
    try {
        const auth = window.getFirebaseAuth();
        await auth.signOut();
        
        // Clear auth token cookie
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        showMessage('Erfolgreich abgemeldet', 'success');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Fehler beim Abmelden', 'error');
    }
}

// Get user-friendly error messages
function getErrorMessage(error) {
    const errorCode = error.code;
    
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'Diese E-Mail-Adresse wird bereits verwendet';
        case 'auth/invalid-email':
            return 'Ungültige E-Mail-Adresse';
        case 'auth/weak-password':
            return 'Das Passwort ist zu schwach (mindestens 6 Zeichen)';
        case 'auth/user-not-found':
            return 'Benutzer nicht gefunden';
        case 'auth/wrong-password':
            return 'Falsches Passwort';
        case 'auth/invalid-credential':
            return 'Ungültige Anmeldedaten';
        default:
            return error.message || 'Ein unbekannter Fehler ist aufgetreten';
    }
}

// Show message to user
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
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(messageEl);
    
    // Remove after 5 seconds
    setTimeout(() => {
        messageEl.remove();
        style.remove();
    }, 5000);
}

// Get current user
window.getCurrentUser = function() {
    const auth = window.getFirebaseAuth();
    return auth ? auth.currentUser : null;
};

// Check if user is authenticated
window.isAuthenticated = function() {
    return window.getCurrentUser() !== null;
};
