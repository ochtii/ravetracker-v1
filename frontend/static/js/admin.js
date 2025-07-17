/**
 * Admin Panel JavaScript - RaveTracker v1
 * GNU GPL v3 Licensed
 */

class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAdminAccess();
        this.loadAdminStats();
        this.loadRecentActivity();
        this.setupEventHandlers();
    }

    async checkAdminAccess() {
        const auth = window.getFirebaseAuth();
        if (!auth) {
            window.location.href = '/login';
            return;
        }

        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '/login';
                return;
            }

            // Check if user has admin role
            try {
                const db = window.getFirebaseDB();
                if (db) {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        if (userData.role !== 'admin') {
                            // User is not admin, redirect to dashboard
                            window.location.href = '/dashboard';
                            return;
                        }
                        this.currentUser = { ...userData, uid: user.uid };
                    } else {
                        // User document doesn't exist, redirect to dashboard
                        window.location.href = '/dashboard';
                        return;
                    }
                }
            } catch (error) {
                console.error('Error checking admin access:', error);
                window.location.href = '/dashboard';
            }
        });
    }

    async loadAdminStats() {
        try {
            // Simulate loading stats (replace with real data)
            await this.sleep(1000);

            const totalUsers = Math.floor(Math.random() * 1000) + 500;
            const totalEvents = Math.floor(Math.random() * 200) + 50;
            const pendingReports = Math.floor(Math.random() * 15) + 2;

            this.animateCounter('total-users', totalUsers);
            this.animateCounter('total-events', totalEvents);
            this.animateCounter('pending-reports', pendingReports);

        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    async loadRecentActivity() {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        try {
            // Simulate loading time
            await this.sleep(1500);

            const activities = [
                {
                    icon: '👤',
                    text: 'Neuer Benutzer registriert: DJ_Psytrance_2025',
                    time: 'vor 5 Min'
                },
                {
                    icon: '🎉',
                    text: 'Event genehmigt: Psychedelic Forest Gathering',
                    time: 'vor 12 Min'
                },
                {
                    icon: '🚨',
                    text: 'Report eingegangen: Spam-Verdacht bei Event',
                    time: 'vor 23 Min'
                },
                {
                    icon: '⚙️',
                    text: 'System-Backup erfolgreich abgeschlossen',
                    time: 'vor 1 Std'
                },
                {
                    icon: '👥',
                    text: 'Benutzer-Rolle geändert: Moderator → Admin',
                    time: 'vor 2 Std'
                },
                {
                    icon: '📊',
                    text: 'Wöchentlicher Analytics-Report generiert',
                    time: 'vor 3 Std'
                }
            ];

            // Clear loading indicator
            activityList.innerHTML = '';

            // Add activities
            activities.forEach((activity, index) => {
                setTimeout(() => {
                    const activityItem = document.createElement('div');
                    activityItem.className = 'activity-item';
                    activityItem.innerHTML = `
                        <span class="activity-icon">${activity.icon}</span>
                        <span class="activity-text">${activity.text}</span>
                        <span class="activity-time">${activity.time}</span>
                    `;
                    activityList.appendChild(activityItem);
                    
                    // Add entrance animation
                    setTimeout(() => {
                        activityItem.style.opacity = '0';
                        activityItem.style.transform = 'translateX(-20px)';
                        activityItem.style.transition = 'all 0.3s ease';
                        setTimeout(() => {
                            activityItem.style.opacity = '1';
                            activityItem.style.transform = 'translateX(0)';
                        }, 50);
                    }, 50);
                }, index * 200);
            });

        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    setupEventHandlers() {
        // User Management
        document.getElementById('view-users')?.addEventListener('click', () => {
            this.showNotification('👥 Benutzerverwaltung wird geladen...', 'info');
        });

        document.getElementById('export-users')?.addEventListener('click', () => {
            this.showNotification('📥 Benutzer-Export wird vorbereitet...', 'success');
        });

        // Event Management
        document.getElementById('view-events')?.addEventListener('click', () => {
            this.showNotification('🎉 Event-Management wird geladen...', 'info');
        });

        document.getElementById('pending-events')?.addEventListener('click', () => {
            this.showNotification('⏳ Warteschlange wird angezeigt...', 'info');
        });

        // Reports & Moderation
        document.getElementById('view-reports')?.addEventListener('click', () => {
            this.showNotification('🚨 Reports werden geladen...', 'info');
        });

        document.getElementById('ban-appeals')?.addEventListener('click', () => {
            this.showNotification('⚖️ Ban-Appeals werden angezeigt...', 'info');
        });

        // System Settings
        document.getElementById('system-config')?.addEventListener('click', () => {
            this.showNotification('⚙️ Systemeinstellungen werden geladen...', 'info');
        });

        document.getElementById('backup-system')?.addEventListener('click', () => {
            this.showNotification('💾 System-Backup wird gestartet...', 'warning');
        });

        // Analytics
        document.getElementById('view-analytics')?.addEventListener('click', () => {
            this.showNotification('📊 Analytics Dashboard wird geladen...', 'info');
        });

        document.getElementById('generate-report')?.addEventListener('click', () => {
            this.showNotification('📋 Bericht wird generiert...', 'success');
        });

        // Security
        document.getElementById('security-settings')?.addEventListener('click', () => {
            this.showNotification('🔒 Sicherheitseinstellungen werden geladen...', 'info');
        });

        document.getElementById('audit-logs')?.addEventListener('click', () => {
            this.showNotification('📜 Audit-Logs werden angezeigt...', 'info');
        });
    }

    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        let currentValue = 0;
        const increment = targetValue / 50;
        const duration = 2000; // 2 seconds
        const stepTime = duration / 50;

        const counter = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(counter);
            }
            element.textContent = Math.floor(currentValue).toLocaleString();
        }, stepTime);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-text">${message}</span>
            <button class="notification-close">&times;</button>
        `;

        // Add styles
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
            animation: slideIn 0.3s ease;
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Add notification animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }

    .notification-close {
        background: none;
        border: none;
        color: var(--text-primary);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .notification-close:hover {
        color: var(--text-secondary);
    }
`;
document.head.appendChild(style);

// Initialize Admin Panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
});
