// Section Navigation and Loading Module

// Section mapping to HTML files
const sections = {
    dashboard: 'dashboard.html',
    inventory: 'inventory.html',
    network: 'network.html',
    gpus: 'gpus.html',
    hosts: 'hosts.html',
    kubernetes: 'kubernetes.html',
    infrastructure: 'infrastructure.html',
    topologies: 'topologies.html',
    events: 'events.html',
    automation: 'automation.html',
    applications: 'applications.html',
    analytics: 'analytics.html',
    security: 'security.html',
    system: 'system.html'
};

// Load section content dynamically
function loadSection(sectionName) {
    const contentArea = document.getElementById('content-area');
    const sectionFile = sections[sectionName];

    if (!sectionFile) {
        contentArea.innerHTML = '<div class="section-container"><h2 class="section-title">Error</h2><div class="section-content">Section not found.</div></div>';
        return;
    }

    // Add fade-out animation
    contentArea.style.opacity = '0';
    contentArea.style.transform = 'translateY(20px)';

    // Fetch the section HTML with cache-busting timestamp
    fetch(sectionFile + '?t=' + new Date().getTime())
        .then(response => {
            if (!response.ok) {
                throw new Error('Section not found');
            }
            return response.text();
        })
        .then(html => {
            setTimeout(() => {
                contentArea.innerHTML = html;

                // Add fade-in animation
                setTimeout(() => {
                    contentArea.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    contentArea.style.opacity = '1';
                    contentArea.style.transform = 'translateY(0)';
                }, 50);

                // Add entrance animations to elements
                const sectionContainer = contentArea.querySelector('.section-container');
                if (sectionContainer) {
                    sectionContainer.style.animation = 'fade-in-up 0.6s ease-out';
                }

                // Initialize section-specific content after DOM is ready
                setTimeout(() => {
                    if (sectionName === 'dashboard') {
                        initializeDashboard();
                    } else if (sectionName === 'network') {
                        // Network devices now loads in iframe, just init parallax
                        if (typeof initializeParallax === 'function') {
                            initializeParallax();
                        }
                    } else if (sectionName === 'gpus') {
                        if (typeof initializeGPUs === 'function') {
                            initializeGPUs();
                        }
                    } else if (sectionName === 'hosts') {
                        if (typeof initializeHosts === 'function') {
                            initializeHosts();
                        }
                    } else if (sectionName === 'kubernetes') {
                        if (typeof initializeKubernetes === 'function') {
                            initializeKubernetes();
                        }
                    } else if (sectionName === 'system') {
                        if (typeof initializeHealth === 'function') {
                            initializeHealth();
                        }
                        if (typeof initializeParallax === 'function') {
                            initializeParallax();
                        }
                    } else if (sectionName === 'security') {
                        if (typeof setupSystemTabSwitching === 'function') {
                            setupSystemTabSwitching();
                        }
                        if (typeof initializeParallax === 'function') {
                            initializeParallax();
                        }
                    } else if (sectionName === 'inventory') {
                        if (typeof initializeParallax === 'function') {
                            initializeParallax();
                        }
                    }
                }, 100);
            }, 200);
        })
        .catch(error => {
            contentArea.innerHTML = '<div class="section-container"><h2 class="section-title">Error</h2><div class="section-content">Failed to load section content.</div></div>';
            contentArea.style.opacity = '1';
            contentArea.style.transform = 'translateY(0)';
        });
}

// Logout function
function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    window.location.href = 'login.html';
}
