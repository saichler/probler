/* Mobile App Components - Shared Utilities */

// ============================================
// TOAST NOTIFICATIONS
// ============================================

// Create toast container if not exists
function ensureToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

// Show a toast notification
function showToast(message, type = 'info', duration = 3000) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    const icons = {
        'success': '✓',
        'error': '✕',
        'warning': '⚠',
        'info': 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${escapeHtmlGlobal(message)}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
}

// ============================================
// PULL TO REFRESH
// ============================================

let pullStartY = 0;
let pullMoveY = 0;
let isPulling = false;
let pullIndicator = null;

function initPullToRefresh(containerSelector, onRefresh) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    container.addEventListener('touchstart', (e) => {
        if (container.scrollTop === 0) {
            pullStartY = e.touches[0].pageY;
            isPulling = true;
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!isPulling) return;

        pullMoveY = e.touches[0].pageY;
        const pullDistance = pullMoveY - pullStartY;

        if (pullDistance > 0 && pullDistance < 100) {
            if (!pullIndicator) {
                pullIndicator = document.createElement('div');
                pullIndicator.className = 'pull-indicator';
                pullIndicator.innerHTML = '<span>↓ Pull to refresh</span>';
                container.insertBefore(pullIndicator, container.firstChild);
            }

            if (pullDistance > 60) {
                pullIndicator.innerHTML = '<span>↑ Release to refresh</span>';
            }
        }
    }, { passive: true });

    container.addEventListener('touchend', () => {
        if (!isPulling) return;

        const pullDistance = pullMoveY - pullStartY;

        if (pullDistance > 60 && pullIndicator) {
            pullIndicator.innerHTML = '<div class="spinner"></div><span>Refreshing...</span>';
            onRefresh().finally(() => {
                if (pullIndicator) {
                    pullIndicator.remove();
                    pullIndicator = null;
                }
            });
        } else if (pullIndicator) {
            pullIndicator.remove();
            pullIndicator = null;
        }

        isPulling = false;
        pullStartY = 0;
        pullMoveY = 0;
    });
}

// ============================================
// INFINITE SCROLL
// ============================================

function initInfiniteScroll(containerSelector, onLoadMore, threshold = 200) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    let isLoading = false;

    container.addEventListener('scroll', () => {
        if (isLoading) return;

        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;

        if (scrollTop + clientHeight >= scrollHeight - threshold) {
            isLoading = true;
            onLoadMore().finally(() => {
                isLoading = false;
            });
        }
    });
}

// ============================================
// HAPTIC FEEDBACK (if available)
// ============================================

function hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
        const patterns = {
            'light': [10],
            'medium': [20],
            'heavy': [30],
            'success': [10, 50, 10],
            'error': [30, 50, 30]
        };
        navigator.vibrate(patterns[type] || patterns.light);
    }
}

// ============================================
// SWIPE ACTIONS
// ============================================

function initSwipeAction(element, onSwipeLeft, onSwipeRight, threshold = 80) {
    let startX = 0;
    let startY = 0;
    let moveX = 0;

    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX;
        startY = e.touches[0].pageY;
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        moveX = e.touches[0].pageX;
        const deltaX = moveX - startX;
        const deltaY = Math.abs(e.touches[0].pageY - startY);

        // Only horizontal swipes
        if (deltaY < 30 && Math.abs(deltaX) > 20) {
            element.style.transform = `translateX(${deltaX * 0.5}px)`;
            element.style.transition = 'none';
        }
    }, { passive: true });

    element.addEventListener('touchend', () => {
        const deltaX = moveX - startX;
        element.style.transition = 'transform 0.3s ease';
        element.style.transform = '';

        if (Math.abs(deltaX) > threshold) {
            if (deltaX > 0 && onSwipeRight) {
                onSwipeRight(element);
            } else if (deltaX < 0 && onSwipeLeft) {
                onSwipeLeft(element);
            }
        }

        startX = 0;
        moveX = 0;
    });
}

// ============================================
// CONFIRM DIALOG
// ============================================

function showConfirmDialog(title, message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
        <div class="confirm-dialog">
            <h3 class="confirm-title">${escapeHtmlGlobal(title)}</h3>
            <p class="confirm-message">${escapeHtmlGlobal(message)}</p>
            <div class="confirm-actions">
                <button class="confirm-btn cancel">Cancel</button>
                <button class="confirm-btn confirm">Confirm</button>
            </div>
        </div>
    `;

    // Add dialog styles
    const dialog = overlay.querySelector('.confirm-dialog');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 16px;
        padding: 24px;
        width: 90%;
        max-width: 320px;
        text-align: center;
        z-index: 1002;
    `;

    overlay.querySelector('.confirm-title').style.cssText = `
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--text-dark);
    `;

    overlay.querySelector('.confirm-message').style.cssText = `
        font-size: 0.9rem;
        color: var(--text-muted);
        margin-bottom: 20px;
    `;

    overlay.querySelector('.confirm-actions').style.cssText = `
        display: flex;
        gap: 12px;
    `;

    overlay.querySelectorAll('.confirm-btn').forEach(btn => {
        btn.style.cssText = `
            flex: 1;
            padding: 12px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            border: none;
        `;
    });

    overlay.querySelector('.confirm-btn.cancel').style.cssText += `
        background: var(--bg-light);
        color: var(--text-muted);
    `;

    overlay.querySelector('.confirm-btn.confirm').style.cssText += `
        background: var(--primary-blue);
        color: white;
    `;

    // Event handlers
    overlay.querySelector('.cancel').addEventListener('click', () => {
        overlay.remove();
        if (onCancel) onCancel();
    });

    overlay.querySelector('.confirm').addEventListener('click', () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    });

    document.body.appendChild(overlay);
}

// ============================================
// LOADING OVERLAY
// ============================================

let loadingOverlay = null;

function showLoading(message = 'Loading...') {
    if (loadingOverlay) return;

    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <div class="spinner" style="width: 40px; height: 40px; border-width: 4px;"></div>
            <span style="margin-top: 12px; color: white; font-size: 0.9rem;">${escapeHtmlGlobal(message)}</span>
        </div>
    `;

    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;

    loadingOverlay.querySelector('.loading-content').style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
    `;

    document.body.appendChild(loadingOverlay);
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.remove();
        loadingOverlay = null;
    }
}

// ============================================
// COPY TO CLIPBOARD
// ============================================

async function copyToClipboard(text) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        showToast('Copied to clipboard', 'success');
        hapticFeedback('success');
        return true;
    } catch (err) {
        showToast('Failed to copy', 'error');
        return false;
    }
}

// ============================================
// DATE/TIME FORMATTING
// ============================================

function formatRelativeTime(timestamp) {
    if (!timestamp) return '--';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
}

function formatDateTime(timestamp) {
    if (!timestamp) return '--';

    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================
// NUMBER FORMATTING
// ============================================

function formatNumber(num) {
    if (num === null || num === undefined) return '--';

    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatBytes(bytes) {
    if (!bytes) return '--';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;

    while (bytes >= 1024 && unitIndex < units.length - 1) {
        bytes /= 1024;
        unitIndex++;
    }

    return `${bytes.toFixed(1)} ${units[unitIndex]}`;
}

function formatPercentage(value, decimals = 0) {
    if (value === null || value === undefined) return '--';
    return `${value.toFixed(decimals)}%`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Global HTML escape function
function escapeHtmlGlobal(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Check if device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if device is in dark mode
function isDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Get network status
function isOnline() {
    return navigator.onLine;
}

// ============================================
// NETWORK STATUS LISTENER
// ============================================

window.addEventListener('online', () => {
    showToast('Back online', 'success');
});

window.addEventListener('offline', () => {
    showToast('You are offline', 'warning', 5000);
});

// ============================================
// KEYBOARD HANDLING (for modals)
// ============================================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close any open modal
        const openModal = document.querySelector('.modal-overlay.open');
        if (openModal) {
            const closeBtn = openModal.querySelector('.modal-close-btn');
            if (closeBtn) closeBtn.click();
        }
    }
});

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showToast,
        showConfirmDialog,
        showLoading,
        hideLoading,
        copyToClipboard,
        formatRelativeTime,
        formatDateTime,
        formatNumber,
        formatBytes,
        formatPercentage,
        hapticFeedback,
        debounce,
        throttle,
        isMobileDevice,
        isDarkMode,
        isOnline
    };
}
