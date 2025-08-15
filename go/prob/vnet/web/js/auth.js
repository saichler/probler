// Authentication and Login Management

function logout() {
    // Clear session storage
    sessionStorage.removeItem('authenticated');
    sessionStorage.removeItem('username');
    
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

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');
    
    // Clear previous error
    errorMessage.style.display = 'none';
    
    // Add loading state
    loginBtn.classList.add('loading');
    
    // Simulate authentication delay
    setTimeout(() => {
        // Check credentials
        if (username === 'admin' && password === 'admin') {
            // Success - hide login screen
            sessionStorage.setItem('authenticated', 'true');
            sessionStorage.setItem('username', username);
            
            // Show success and hide login
            showLoginSuccessAndHide();
        } else {
            // Failed authentication
            loginBtn.classList.remove('loading');
            errorMessage.style.display = 'block';
            
            // Shake animation for error
            errorMessage.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                errorMessage.style.animation = '';
            }, 500);
            
            // Clear password field
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    }, 1500); // 1.5 second delay to simulate server authentication
}

function showLoginSuccessAndHide() {
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.classList.remove('loading');
    loginBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
    loginBtn.innerHTML = '✓ Login Successful';
    
    setTimeout(() => {
        hideLoginScreen();
        loadUsername(); // Update username display
        showNotification('✓ Welcome to Open Network Automation', 'success');
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
        if (usernameField) {
            usernameField.focus();
        }
        
        // Add enter key handling for better UX
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !document.getElementById('loginScreen').classList.contains('hidden')) {
                if (!document.getElementById('loginBtn').classList.contains('loading')) {
                    loginForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }
}