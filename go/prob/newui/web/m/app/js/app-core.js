/**
 * Mobile App - Core JavaScript
 * Authentication, routing, and navigation
 * Uses: MobileConfig, MobileAuth, MobilePopup, MobileConfirm
 */

// Section mapping - using absolute paths to ensure correct loading
const sections = {
    'dashboard': '/m/app/sections/dashboard.html',
    'network': '/m/app/sections/network.html',
    'kubernetes': '/m/app/sections/kubernetes.html',
    'events': '/m/app/sections/events.html',
    // Secondary sections (accessible via More menu)
    'inventory': '/m/app/sections/inventory.html',
    'gpus': '/m/app/sections/gpus.html',
    'hosts': '/m/app/sections/hosts.html',
    'security': '/m/app/sections/security.html',
    'system': '/m/app/sections/system.html'
};

// Primary nav sections (shown in bottom nav)
const primarySections = ['dashboard', 'network', 'kubernetes', 'events'];

// Current loaded section
let currentSection = 'dashboard';

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication using MobileAuth
    if (!MobileAuth.requireAuth()) {
        return;
    }

    // Load configuration
    await MobileConfig.load();

    // Set username in header
    const username = MobileAuth.getUsername();
    const usernameEl = document.querySelector('.username');
    if (usernameEl) {
        usernameEl.textContent = username;
    }

    // Initialize navigation
    initBottomNav();
    initMoreMenu();

    // Load default section
    loadSection('dashboard');
});

// Initialize bottom navigation
function initBottomNav() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            navigateToSection(section);
        });
    });
}

// Initialize more menu
function initMoreMenu() {
    const moreBtn = document.querySelector('.nav-item-more');
    const moreDrawer = document.querySelector('.more-drawer');
    const closeBtn = document.querySelector('.close-drawer-btn');
    const menuItems = document.querySelectorAll('.more-menu-item[data-section]');

    if (moreBtn && moreDrawer) {
        // Open drawer
        moreBtn.addEventListener('click', function() {
            moreDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
        });

        // Close drawer on backdrop click
        moreDrawer.addEventListener('click', function(e) {
            if (e.target === moreDrawer) {
                closeMoreDrawer();
            }
        });

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', closeMoreDrawer);
        }

        // Menu item clicks
        menuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                closeMoreDrawer();
                navigateToSection(section);
            });
        });
    }
}

// Close more drawer
function closeMoreDrawer() {
    const moreDrawer = document.querySelector('.more-drawer');
    if (moreDrawer) {
        moreDrawer.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Navigate to a section
function navigateToSection(section) {
    if (section === currentSection) return;

    // Update nav active states
    updateNavActiveState(section);

    // Load section content
    loadSection(section);
}

// Update navigation active state
function updateNavActiveState(section) {
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.nav-item-more').forEach(item => {
        item.classList.remove('active');
    });

    // Add active to current section
    const activeNav = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    } else {
        // Section is in More menu, highlight More button
        const moreBtn = document.querySelector('.nav-item-more');
        if (moreBtn) {
            moreBtn.classList.add('active');
        }
    }

    // Update More menu items
    document.querySelectorAll('.more-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === section) {
            item.classList.add('active');
        }
    });
}

// Load section content
async function loadSection(section) {
    const contentArea = document.getElementById('content-area');
    if (!contentArea) return;

    const sectionUrl = sections[section];
    if (!sectionUrl) {
        console.error('Unknown section:', section);
        return;
    }

    // Show loading state
    contentArea.innerHTML = '<div class="loading">Loading</div>';
    contentArea.style.opacity = '0.5';

    try {
        // Fetch section HTML with cache busting
        const response = await fetch(sectionUrl + '?t=' + new Date().getTime());
        if (!response.ok) {
            throw new Error('Failed to load section');
        }

        const html = await response.text();

        // Fade out, update content, fade in
        contentArea.style.opacity = '0';

        setTimeout(() => {
            contentArea.innerHTML = html;
            contentArea.style.opacity = '1';
            currentSection = section;

            // Execute script tags that were loaded via innerHTML
            executeScripts(contentArea);

            // Execute any section-specific initialization
            initSectionScripts(section);
        }, 150);

    } catch (error) {
        console.error('Error loading section:', error);
        contentArea.innerHTML = `
            <div class="section-error">
                <p>Failed to load section</p>
                <button onclick="loadSection('${section}')" class="retry-btn">Retry</button>
            </div>
        `;
        contentArea.style.opacity = '1';
    }
}

// Execute script tags loaded via innerHTML
function executeScripts(container) {
    const scripts = container.querySelectorAll('script');
    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');

        // Copy all attributes
        Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });

        // Copy the script content
        newScript.textContent = oldScript.textContent;

        // Replace old script with new one to execute it
        oldScript.parentNode.replaceChild(newScript, oldScript);
    });
}

// Initialize section-specific scripts
function initSectionScripts(section) {
    // Call section-specific initialization functions if they exist
    switch (section) {
        case 'dashboard':
            if (typeof initMobileDashboard === 'function') {
                initMobileDashboard();
            }
            break;
        case 'network':
            if (typeof initMobileNetwork === 'function') {
                initMobileNetwork();
            }
            break;
        case 'kubernetes':
            if (typeof initMobileKubernetes === 'function') {
                initMobileKubernetes();
            }
            break;
        case 'events':
            if (typeof initMobileEvents === 'function') {
                initMobileEvents();
            }
            break;
        case 'inventory':
            if (typeof initMobileInventory === 'function') {
                initMobileInventory();
            }
            break;
        case 'gpus':
            if (typeof initMobileGpus === 'function') {
                initMobileGpus();
            }
            break;
        case 'hosts':
            if (typeof initMobileHosts === 'function') {
                initMobileHosts();
            }
            break;
        case 'security':
            if (typeof initMobileSecurity === 'function') {
                initMobileSecurity();
            }
            break;
        case 'system':
            if (typeof initMobileSystem === 'function') {
                initMobileSystem();
            }
            break;
    }

    // Scroll to top of content
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        contentArea.scrollTop = 0;
    }
}

// Logout function - delegates to MobileAuth
function logout() {
    MobileAuth.logout();
}

// Switch to desktop version
function switchToDesktop() {
    localStorage.setItem('preferDesktop', 'true');
    window.location.href = '../app.html';
}

// Get current section name
function getCurrentSection() {
    return currentSection;
}

// Add CSS for section transitions
const style = document.createElement('style');
style.textContent = `
    #content-area {
        transition: opacity 0.15s ease;
    }
    .section-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: var(--text-muted);
        text-align: center;
        padding: var(--spacing-lg);
    }
    .retry-btn {
        margin-top: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--primary-blue);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
    }
    .retry-btn:active {
        opacity: 0.8;
    }
`;
document.head.appendChild(style);
