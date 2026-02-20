// Shared Helper Functions for Kubernetes Modals

// Helper function to format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to get condition status CSS class
function getConditionStatusClass(type, status) {
    if (type === 'Ready') {
        return status === 'True' ? 'status-operational' : 'status-critical';
    } else {
        return status === 'False' ? 'status-operational' : 'status-warning';
    }
}
