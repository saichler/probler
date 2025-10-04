// Main application initialization

// Add click logging to help identify elements
document.body.addEventListener('click', function(e) {
    const target = e.target;
    const computedStyle = window.getComputedStyle(target);
}, true);

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // Set username in header
    const username = sessionStorage.getItem('username') || 'Admin';
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
});
