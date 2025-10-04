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

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // For now, simple validation (will be replaced with actual authentication later)
        if (username && password) {
            // Store login state
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('username', username);

            // Redirect to main application
            window.location.href = 'index.html';
        } else {
            alert('Please enter both username and password');
        }
    });

    // Check if already logged in
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = 'index.html';
    }
});
