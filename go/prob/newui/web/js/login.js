// Login page functionality

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    // Parallax mouse movement effect
    document.addEventListener('mousemove', function(e) {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        // Move parallax layers
        const layer1 = document.querySelector('.parallax-layer-1');
        const layer2 = document.querySelector('.parallax-layer-2');
        const layer3 = document.querySelector('.parallax-layer-3');
        const networkIllustration = document.querySelector('.network-illustration');
        const loginContainer = document.querySelector('.login-container');

        if (layer1) {
            layer1.style.transform = `translate(${mouseX * 20}px, ${mouseY * 20}px)`;
        }
        if (layer2) {
            layer2.style.transform = `translate(${mouseX * -15}px, ${mouseY * -15}px)`;
        }
        if (layer3) {
            layer3.style.transform = `translate(${mouseX * 10}px, ${mouseY * -10}px)`;
        }
        if (networkIllustration) {
            networkIllustration.style.transform = `translate(${mouseX * -5}px, ${mouseY * -5}px)`;
        }
        if (loginContainer) {
            loginContainer.style.transform = `perspective(1000px) rotateY(${(mouseX - 0.5) * 2}deg) rotateX(${(mouseY - 0.5) * -2}deg)`;
        }
    });

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }

        try {
            // Make REST API call to authenticate
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

            // Check if login was successful
            if (data.token) {
                // Store bearer token and login state
                sessionStorage.setItem('bearerToken', data.token);
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('username', username);

                // Redirect to main application
                window.location.href = '/';
            } else {
                // Empty response body {} indicates failed login
                alert('Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    });

    // Check if already logged in
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = '/';
    }
});
