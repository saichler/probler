// Authentication and Login Management

// Helper function to get authorization headers for API calls
function getAuthHeaders() {
    const token = sessionStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

// Helper function to make authenticated API calls
async function authenticatedFetch(url, options = {}) {
    // Merge auth headers with any provided headers
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {})
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Check if token is expired or invalid (401 Unauthorized)
        if (response.status === 401) {
            // Clear session and redirect to login
            sessionStorage.removeItem('authenticated');
            sessionStorage.removeItem('username');
            sessionStorage.removeItem('authToken');
            showLoginScreen();
            showNotification('⚠️ Session expired. Please login again.', 'warning');
            throw new Error('Authentication required');
        }

        return response;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

function logout() {
    // Clear session storage
    sessionStorage.removeItem('authenticated');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('authToken');

    // Show logout notification
    showNotification('🚪 Logging out...', 'info');

    // Show login screen after a short delay
    setTimeout(() => {
        showLoginScreen();
    }, 1000);
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    // Focus username field when login screen is shown
    setTimeout(() => {
        document.getElementById('username').focus();
    }, 100);
}

function hideLoginScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    // Clear previous error
    errorMessage.style.display = 'none';

    // Add loading state
    loginBtn.classList.add('loading');

    try {
        // Make authentication request to REST API
        const response = await fetch('/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user: username,
                pass: password
            })
        });

        const data = await response.json();

        // Check if authentication was successful
        if (data.token) {
            // Success - store token and user info
            sessionStorage.setItem('authenticated', 'true');
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('authToken', data.token);

            // Show success and hide login
            showLoginSuccessAndHide();
        } else {
            // Failed authentication - empty response means failure
            loginBtn.classList.remove('loading');
            errorMessage.style.display = 'block';
            errorMessage.textContent = 'Invalid username or password. Please try again.';

            // Shake animation for error
            errorMessage.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                errorMessage.style.animation = '';
            }, 500);

            // Clear password field
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    } catch (error) {
        // Network or server error
        loginBtn.classList.remove('loading');
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Authentication service unavailable. Please try again later.';

        // Shake animation for error
        errorMessage.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            errorMessage.style.animation = '';
        }, 500);

        console.error('Login error:', error);

        // Clear password field
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    }
}

function showLoginSuccessAndHide() {
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.classList.remove('loading');
    loginBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
    loginBtn.innerHTML = '✓ Login Successful';

    setTimeout(async () => {
        hideLoginScreen();
        loadUsername(); // Update username display
        showNotification('✓ Welcome to Open Network Automation', 'success');

        // Add a small delay to ensure session is fully established before loading dashboard data
        setTimeout(() => {
            console.log('🔍 Auth: Loading dashboard stats after session establishment...');
            loadDashboardStats();
            loadAlarms();
        }, 500); // 500ms delay to ensure session cookies are set

        // Reset login form
        document.getElementById('loginForm').reset();
        loginBtn.style.background = '';
        loginBtn.innerHTML = 'Login';
    }, 1000);
}

function loadUsername() {
    const username = sessionStorage.getItem('username') || 'admin';
    document.getElementById('currentUsername').textContent = username;
}

function initializeAuth() {
    // Check authentication - show login screen if not authenticated
    if (sessionStorage.getItem('authenticated') !== 'true') {
        showLoginScreen();
    } else {
        hideLoginScreen();
    }
    
    // Set up login form event listener
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        
        // Focus username field when login screen is shown
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        
        if (usernameField) {
            usernameField.focus();
        }
        
        // Enter key handling - trigger form submission when Enter is pressed
        const handleEnterKey = (e) => {
            if (e.key === 'Enter' && !document.getElementById('loginBtn').classList.contains('loading')) {
                e.preventDefault(); // Prevent any default behavior
                // Create and dispatch a proper submit event
                const submitEvent = new Event('submit', { 
                    bubbles: true, 
                    cancelable: true 
                });
                loginForm.dispatchEvent(submitEvent);
            }
        };
        
        // Add Enter key listeners to both input fields
        if (usernameField) {
            usernameField.addEventListener('keydown', handleEnterKey);
        }
        if (passwordField) {
            passwordField.addEventListener('keydown', handleEnterKey);
        }
    }
}