// Section Navigation and Loading Module

// Section mapping to HTML files
const sections = {
    dashboard: 'sections/dashboard.html',
    inventory: 'sections/inventory.html',
    network: 'sections/network.html',
    gpus: 'sections/gpus.html',
    hosts: 'sections/hosts.html',
    kubernetes: 'sections/kubernetes.html',
    infrastructure: 'sections/infrastructure.html',
    topologies: 'sections/topologies.html',
    alarms: 'sections/alarms.html',
    automation: 'sections/automation.html',
    applications: 'sections/applications.html',
    analytics: 'sections/analytics.html',
    system: 'sections/sys.html'
};

function normalizeSectionVisuals(contentArea) {
    const headerRoots = contentArea.querySelectorAll('.l8-header-frame, .system-header-frame, .hcm-header-frame');

    headerRoots.forEach(root => {
        root.classList.remove('parallax-container');
        root.querySelectorAll('.parallax-layer').forEach(layer => {
            layer.classList.remove('parallax-layer');
            layer.style.transform = '';
            layer.removeAttribute('data-speed');
        });

        root.querySelectorAll('animate, animateTransform, animateMotion').forEach(node => node.remove());

        root.querySelectorAll('.network-link, .data-particle, .rack-server, .rack-critical').forEach(node => {
            node.style.animation = 'none';
        });

        root.querySelectorAll('[stroke-dasharray]').forEach(node => {
            node.setAttribute('stroke-dasharray', 'none');
        });

        root.querySelectorAll('[style*="animation-delay"]').forEach(node => {
            node.style.animationDelay = '';
        });
    });
}

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
                normalizeSectionVisuals(contentArea);

                // Handle section generator placeholder pattern
                const placeholder = contentArea.querySelector('[id$="-section-placeholder"]');
                if (placeholder && window.Layer8SectionGenerator) {
                    const generatedHtml = Layer8SectionGenerator.generate(sectionName);
                    const temp = document.createElement('div');
                    temp.innerHTML = generatedHtml;
                    placeholder.replaceWith(...temp.children);
                }

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
                        if (typeof initializeDashboard === 'function') {
                            initializeDashboard();
                        }
                    } else if (sectionName === 'network') {
                        if (typeof initializeNetworkDevices === 'function') {
                            initializeNetworkDevices();
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
                        if (typeof initializeL8Sys === 'function') {
                            initializeL8Sys();
                        }
                    } else if (sectionName === 'alarms') {
                        if (typeof initializeAlm === 'function') {
                            initializeAlm();
                        }
                    }

                    // Apply module filter to hide disabled sub-modules/services
                    if (window.Layer8DModuleFilter) {
                        Layer8DModuleFilter.applyToSection(sectionName);
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

// Logout function (delegates to app.js logout which shows error modal if reason provided)
// Kept for backward compatibility — app.js defines the primary logout()
