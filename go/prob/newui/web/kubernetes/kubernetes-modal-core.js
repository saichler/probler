// Kubernetes Modal Core Functions
// Modal tab switching and close handlers

// Modal Tab Switching for K8s Resources (Pods, Deployments, etc.)
function setupK8sModalTabs(content) {
    const tabs = content.querySelectorAll('.modal-tab');
    const tabContents = content.querySelectorAll('.modal-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(tc => {
                tc.classList.remove('active');
                if (tc.getAttribute('data-tab-content') === tabName) {
                    tc.classList.add('active');
                }
            });
        });
    });
}

// Node Modal Tab Switching
function setupNodeModalTabs(content) {
    const tabs = content.querySelectorAll('.modal-tab');
    const tabContents = content.querySelectorAll('.modal-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(tc => {
                tc.classList.remove('active');
                if (tc.getAttribute('data-tab-content') === tabName) {
                    tc.classList.add('active');
                }
            });
        });
    });
}

// Close Modal Functions
function closeK8sDetailModal() {
    const modal = document.getElementById('k8s-detail-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function closeNodeDetailModal() {
    const modal = document.getElementById('node-detail-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    const k8sModal = document.getElementById('k8s-detail-modal');
    const nodeModal = document.getElementById('node-detail-modal');

    if (k8sModal && e.target === k8sModal) {
        closeK8sDetailModal();
    }

    if (nodeModal && e.target === nodeModal) {
        closeNodeDetailModal();
    }
});
