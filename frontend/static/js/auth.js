/*
RaveTracker v1 - Authentication JavaScript
GNU GPL v3 Licensed
*/

class AuthHandler {
    constructor(type) {
        this.type = type; // 'login' or 'register'
        this.init();
    }

    init() {
        this.setupFormHandlers();
        
        if (this.type === 'register') {
            this.setupPasswordValidation();
            this.setupInviteCodeFormatting();
        }
    }

    setupFormHandlers() {
        const form = document.getElementById(`${this.type}-form`);
        if (!form) return;

        // Setup form validation
        window.raveTracker.setupFormValidation(form);

        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit(form);
        });
    }

    setupPasswordValidation() {
        const passwordInput = document.getElementById('password');
        const confirmInput = document.getElementById('password_confirm');
        
        if (!passwordInput) return;

        passwordInput.addEventListener('input', () => {
            this.validatePassword(passwordInput.value);
        });

        if (confirmInput) {
            confirmInput.addEventListener('input', () => {
                this.validatePasswordConfirm(passwordInput.value, confirmInput.value);
            });
        }
    }

    setupInviteCodeFormatting() {
        const inviteInput = document.getElementById('invite_code');
        if (!inviteInput) return;

        inviteInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    validatePassword(password) {
        const requirements = window.raveTracker.validatePassword(password);
        
        // Update requirement indicators
        const reqElements = {
            length: document.getElementById('req-length'),
            uppercase: document.getElementById('req-uppercase'),
            lowercase: document.getElementById('req-lowercase'),
            number: document.getElementById('req-number'),
            special: document.getElementById('req-special')
        };

        Object.keys(requirements).forEach(req => {
            const element = reqElements[req];
            if (element) {
                if (requirements[req]) {
                    element.classList.add('valid');
                } else {
                    element.classList.remove('valid');
                }
            }
        });

        return Object.values(requirements).every(valid => valid);
    }

    validatePasswordConfirm(password, confirmPassword) {
        const confirmInput = document.getElementById('password_confirm');
        
        if (password !== confirmPassword) {
            window.raveTracker.showInputError(confirmInput, 'Passwörter stimmen nicht überein');
            return false;
        } else {
            window.raveTracker.clearInputError(confirmInput);
            return true;
        }
    }

    async handleSubmit(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Validate form
        if (!this.validateForm(data)) {
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner"></div> Laden...';

        try {
            const endpoint = this.type === 'login' ? '/auth/login' : '/auth/register';
            const response = await window.raveTracker.post(endpoint, data);
            const result = await response.json();

            if (response.ok) {
                this.handleSuccess(result);
            } else {
                this.handleError(result.error || 'Ein Fehler ist aufgetreten');
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.handleError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    validateForm(data) {
        let isValid = true;

        if (this.type === 'register') {
            // Validate invite code
            if (!data.invite_code || data.invite_code.length < 5) {
                this.showError('Bitte geben Sie einen gültigen Invite-Code ein.');
                isValid = false;
            }

            // Validate username
            if (!data.username || data.username.length < 3) {
                this.showError('Benutzername muss mindestens 3 Zeichen lang sein.');
                isValid = false;
            }

            // Validate password
            if (!this.validatePassword(data.password)) {
                this.showError('Passwort erfüllt nicht alle Anforderungen.');
                isValid = false;
            }

            // Validate password confirmation
            if (data.password !== data.password_confirm) {
                this.showError('Passwörter stimmen nicht überein.');
                isValid = false;
            }
        }

        // Validate email
        if (!window.raveTracker.validateEmail(data.email)) {
            this.showError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
            isValid = false;
        }

        // Validate password length
        if (!data.password || data.password.length < 8) {
            this.showError('Passwort muss mindestens 8 Zeichen lang sein.');
            isValid = false;
        }

        return isValid;
    }

    handleSuccess(result) {
        // Store auth token
        if (result.token) {
            localStorage.setItem('auth_token', result.token);
        }

        // Show success message
        this.showSuccess(result.message || 'Erfolgreich angemeldet!');

        // Update UI
        if (result.user) {
            window.raveTracker.currentUser = result.user;
            window.raveTracker.updateUIForLoggedIn();
        }

        // Redirect after short delay
        setTimeout(() => {
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
            window.location.href = redirectUrl;
        }, 1500);
    }

    handleError(errorMessage) {
        this.showError(errorMessage);
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        const successElement = document.getElementById('success-message');

        if (successElement) successElement.style.display = 'none';

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        // Also show as notification
        window.raveTracker.showNotification(message, 'error');
    }

    showSuccess(message) {
        const errorElement = document.getElementById('error-message');
        const successElement = document.getElementById('success-message');

        if (errorElement) errorElement.style.display = 'none';

        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
        }

        // Also show as notification
        window.raveTracker.showNotification(message, 'success');
    }
}
