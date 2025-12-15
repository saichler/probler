// System Tab Switching Module
// Handles tab navigation for System and Security sections

// Initialize System section
function initializeHealth() {
    setupSystemTabSwitching();
}

// Set up system tab switching
function setupSystemTabSwitching() {
    const systemTabs = document.querySelectorAll('.resource-tab[data-tab]');
    systemTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');

            // Update active tab button
            systemTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active tab content
            const tabContents = document.querySelectorAll('.resource-content[data-tab-content]');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.getAttribute('data-tab-content') === tabName) {
                    content.classList.add('active');
                }
            });

            // Lazy load iframes when their tab is selected
            lazyLoadIframe(tabName);
        });
    });

    // Load the initial active tab's iframe
    const activeTab = document.querySelector('.resource-tab.active');
    if (activeTab) {
        const activeTabName = activeTab.getAttribute('data-tab');
        lazyLoadIframe(activeTabName);
    }
}

// Lazy load iframe when tab is selected
function lazyLoadIframe(tabName) {
    const iframeMap = {
        'health': 'health-iframe',
        'users': 'users-iframe',
        'roles': 'roles-iframe',
        'logs': 'logs-iframe',
        'credentials': 'credentials-iframe'
    };

    const iframeId = iframeMap[tabName];
    if (!iframeId) return;

    const iframe = document.getElementById(iframeId);
    if (iframe && iframe.dataset.src && !iframe.getAttribute('src')) {
        iframe.src = iframe.dataset.src;
    }
}

// Export functions for external use
window.initializeHealth = initializeHealth;
window.setupSystemTabSwitching = setupSystemTabSwitching;
