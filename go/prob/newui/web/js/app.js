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

function clearAuthAndRedirectToLogin() {
    sessionStorage.removeItem('bearerToken');
    localStorage.removeItem('bearerToken');
    localStorage.removeItem('rememberedUser');
    window.location.href = 'l8ui/login/index.html';
}

// Show error modal before logout so the user can see what went wrong
function showErrorAndLogout(reason, details) {
    // Prevent multiple modals
    if (document.getElementById('error-before-logout-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'error-before-logout-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.35);backdrop-filter:blur(2px);z-index:100000;display:flex;align-items:center;justify-content:center;padding:24px;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#ffffff;color:#334155;border:1px solid #e2e8f0;border-radius:12px;padding:24px;max-width:640px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 18px 40px rgba(15,23,42,0.16);font-family:Figtree,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;';

    var title = document.createElement('h2');
    title.style.cssText = 'margin:0 0 12px 0;color:#0f172a;font-size:22px;font-weight:700;letter-spacing:-0.01em;';
    title.textContent = 'Session ended';

    var reasonEl = document.createElement('div');
    reasonEl.style.cssText = 'margin-bottom:16px;font-size:14px;line-height:1.6;color:#475569;';
    reasonEl.textContent = reason || 'An unexpected error occurred.';

    modal.appendChild(title);
    modal.appendChild(reasonEl);

    if (details) {
        var detailsEl = document.createElement('pre');
        detailsEl.style.cssText = 'background:#f8fafc;color:#475569;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow-y:auto;margin-bottom:16px;';
        detailsEl.textContent = details;
        modal.appendChild(detailsEl);
    }

    var btn = document.createElement('button');
    btn.style.cssText = 'background:#0f172a;color:#ffffff;border:1px solid #0f172a;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;';
    btn.textContent = 'Go to Login';
    btn.onclick = clearAuthAndRedirectToLogin;
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
    clearAuthAndRedirectToLogin();
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

    // Broadcast theme changes to all iframes so embedded sections (dashboard, targets, topo)
    // pick up light/dark mode switches from the top-level theme switcher.
    function broadcastTheme() {
        var theme = document.documentElement.getAttribute('data-theme') || null;
        var iframes = document.querySelectorAll('iframe');
        iframes.forEach(function(iframe) {
            try {
                iframe.contentWindow.postMessage({ type: 'probler-theme-change', theme: theme }, '*');
            } catch (e) { /* iframe not ready or cross-origin */ }
        });
    }
    var themeObserver = new MutationObserver(broadcastTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('load', function(event) {
        if (event.target && event.target.tagName === 'IFRAME') {
            try {
                var theme = document.documentElement.getAttribute('data-theme') || null;
                event.target.contentWindow.postMessage({ type: 'probler-theme-change', theme: theme }, '*');
            } catch (e) { /* ignore */ }
        }
    }, true);

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
