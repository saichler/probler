// Main application initialization

// Get authentication headers (used by Layer8DTable for server-side fetching)
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const bearerToken = sessionStorage.getItem('bearerToken');
    if (bearerToken) {
        headers['Authorization'] = 'Bearer ' + bearerToken;
    }
    return headers;
}

// Show error modal before logout so the user can see what went wrong
function showErrorAndLogout(reason, details) {
    // Prevent multiple modals
    if (document.getElementById('error-before-logout-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'error-before-logout-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:100000;display:flex;align-items:center;justify-content:center;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1a2e;color:#e0e0e0;border-radius:12px;padding:32px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;';

    var title = document.createElement('h2');
    title.style.cssText = 'margin:0 0 16px 0;color:#ff6b6b;font-size:20px;';
    title.textContent = 'Error — Session Ending';

    var reasonEl = document.createElement('div');
    reasonEl.style.cssText = 'margin-bottom:16px;font-size:15px;line-height:1.5;';
    reasonEl.textContent = reason || 'An unexpected error occurred.';

    modal.appendChild(title);
    modal.appendChild(reasonEl);

    if (details) {
        var detailsEl = document.createElement('pre');
        detailsEl.style.cssText = 'background:#111;color:#ccc;padding:12px;border-radius:8px;font-size:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow-y:auto;margin-bottom:16px;';
        detailsEl.textContent = details;
        modal.appendChild(detailsEl);
    }

    var btn = document.createElement('button');
    btn.style.cssText = 'background:#ff6b6b;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:14px;cursor:pointer;';
    btn.textContent = 'OK — Go to Login';
    btn.onclick = function() {
        sessionStorage.removeItem('bearerToken');
        localStorage.removeItem('bearerToken');
        localStorage.removeItem('rememberedUser');
        window.location.href = 'l8ui/login/index.html';
    };
    modal.appendChild(btn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// Utility function for making authenticated API calls
async function makeAuthenticatedRequest(url, options = {}) {
    const bearerToken = sessionStorage.getItem('bearerToken');

    if (!bearerToken) {
        console.error('No bearer token found');
        showErrorAndLogout('No authentication token found.', 'bearerToken is missing from sessionStorage.');
        return;
    }

    // Add Authorization header with bearer token
    const headers = {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: headers
        });

        // If unauthorized, show error before redirecting to login
        if (response.status === 401) {
            var bodyText = '';
            try { bodyText = await response.text(); } catch(e) {}
            showErrorAndLogout(
                'Session expired or unauthorized (HTTP 401).',
                'URL: ' + url + '\nStatus: 401\nResponse: ' + bodyText
            );
            return;
        }

        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Logout function
function logout(reason) {
    if (reason) {
        showErrorAndLogout(reason);
        return;
    }
    // Clear bearer token from sessionStorage and localStorage
    sessionStorage.removeItem('bearerToken');
    localStorage.removeItem('bearerToken');
    localStorage.removeItem('rememberedUser');

    // Redirect to login page
    window.location.href = 'l8ui/login/index.html';
}

// Global error handlers to catch uncaught errors and show them before they cause silent failures
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Uncaught error:', message, source, lineno, colno, error);
    showErrorAndLogout(
        'Uncaught JavaScript error',
        'Message: ' + message + '\nSource: ' + source + ':' + lineno + ':' + colno +
        (error && error.stack ? '\n\nStack:\n' + error.stack : '')
    );
    return true;
};

window.onunhandledrejection = function(event) {
    var reason = event.reason;
    console.error('Unhandled promise rejection:', reason);
    showErrorAndLogout(
        'Unhandled promise rejection',
        reason instanceof Error
            ? 'Message: ' + reason.message + '\n\nStack:\n' + reason.stack
            : String(reason)
    );
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Check if bearer token exists (user is logged in)
    // Using sessionStorage so session is cleared when browser tab is closed
    const bearerToken = sessionStorage.getItem('bearerToken');
    if (!bearerToken) {
        window.location.href = 'l8ui/login/index.html';
        return;
    }

    // Sync bearer token to localStorage so iframes can access it
    localStorage.setItem('bearerToken', bearerToken);
    // Also expose on window for iframes that check parent
    window.bearerToken = bearerToken;

    // Load l8ui configuration (apiPrefix, dateFormat, etc.)
    await Layer8DConfig.load();

    // Set username in header from current session
    const username = sessionStorage.getItem('currentUser') || 'Admin';
    document.querySelector('.username').textContent = username;

    // Load default section (dashboard)
    loadSection('dashboard');

    // Add event listeners to navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            // Load the selected section
            const section = this.getAttribute('data-section');
            loadSection(section);
        });
    });

    // Parallax scroll effect for main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('scroll', function() {
            const scrollPosition = this.scrollTop;

            // Parallax for dashboard hero
            const dashboardHero = this.querySelector('.dashboard-hero .hero-illustration');
            if (dashboardHero) {
                const parallaxOffset = scrollPosition * 0.3;
                dashboardHero.style.transform = `translateY(${parallaxOffset}px)`;
            }

            // Parallax for network hero
            const networkHero = this.querySelector('.network-hero .hero-illustration');
            if (networkHero) {
                const parallaxOffset = scrollPosition * 0.3;
                networkHero.style.transform = `translateY(${parallaxOffset}px)`;
            }
        });
    }

    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Only handle valid anchor links (not just '#')
            if (href && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Listen for modal open/close events from iframes
    window.addEventListener('message', function(event) {
        if (!event.data || !event.data.type) return;

        switch (event.data.type) {
            case 'modal-open': {
                const iframe = document.getElementById(event.data.iframeId);
                if (iframe) {
                    iframe.classList.add('modal-active');
                    document.body.classList.add('iframe-modal-active');
                }
                break;
            }
            case 'modal-close': {
                const iframe = document.getElementById(event.data.iframeId);
                if (iframe) {
                    iframe.classList.remove('modal-active');
                    document.body.classList.remove('iframe-modal-active');
                }
                break;
            }
            // PostMessage bridge: forward iframe popup requests to Layer8DPopup
            case 'probler-popup-show':
                if (typeof Layer8DPopup !== 'undefined') {
                    Layer8DPopup.show(event.data.config);
                }
                break;
            case 'probler-popup-close':
                if (typeof Layer8DPopup !== 'undefined') {
                    Layer8DPopup.close();
                }
                break;
            case 'probler-popup-update':
                if (typeof Layer8DPopup !== 'undefined') {
                    Layer8DPopup.updateContent(event.data.content);
                }
                break;
        }
    });
});
