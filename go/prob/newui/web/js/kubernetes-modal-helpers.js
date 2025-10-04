// Shared Helper Functions for Kubernetes Modals

function generateNodeResourceDetails(node) {
    const cpuUsagePercent = parseFloat(node.cpuUsage);
    const memoryUsagePercent = parseFloat(node.memoryUsage);

    return `
        <div class="detail-grid">
            <div class="detail-item">
                <span class="detail-label">CPU Capacity:</span>
                <span class="detail-value">${node.cpuCapacity} cores</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">CPU Usage:</span>
                <span class="detail-value">${node.cpuUsage}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Memory Capacity:</span>
                <span class="detail-value">${node.memoryCapacity}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Memory Usage:</span>
                <span class="detail-value">${node.memoryUsage}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Pods Capacity:</span>
                <span class="detail-value">110</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Pods Running:</span>
                <span class="detail-value">${Math.floor(Math.random() * 80) + 20}</span>
            </div>
        </div>
    `;
}

function generateNodeConditions(status) {
    const conditions = [
        { type: 'Ready', status: status === 'Ready' ? 'True' : 'False', reason: status === 'Ready' ? 'KubeletReady' : 'KubeletNotReady' },
        { type: 'MemoryPressure', status: 'False', reason: 'KubeletHasSufficientMemory' },
        { type: 'DiskPressure', status: 'False', reason: 'KubeletHasNoDiskPressure' },
        { type: 'PIDPressure', status: 'False', reason: 'KubeletHasSufficientPID' },
        { type: 'NetworkUnavailable', status: 'False', reason: 'RouteCreated' }
    ];

    let html = '<table class="detail-table"><thead><tr><th>Type</th><th>Status</th><th>Reason</th></tr></thead><tbody>';
    conditions.forEach(condition => {
        html += `
            <tr>
                <td>${condition.type}</td>
                <td><span class="status-badge ${condition.status === 'True' && condition.type === 'Ready' || condition.status === 'False' && condition.type !== 'Ready' ? 'status-operational' : 'status-critical'}">${condition.status}</span></td>
                <td>${condition.reason}</td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    return html;
}

function generateNodeEvents(status) {
    const events = [];
    if (status === 'Ready') {
        events.push({ type: 'Normal', reason: 'NodeReady', message: 'Node is ready', age: '1h' });
        events.push({ type: 'Normal', reason: 'RegisteredNode', message: 'Node registered in API Server', age: '2h' });
    } else {
        events.push({ type: 'Warning', reason: 'NodeNotReady', message: 'Node is not ready', age: '5m' });
    }

    let html = '<table class="detail-table"><thead><tr><th>Type</th><th>Reason</th><th>Message</th><th>Age</th></tr></thead><tbody>';
    events.forEach(event => {
        html += `
            <tr>
                <td><span class="status-badge ${event.type === 'Normal' ? 'status-operational' : 'status-warning'}">${event.type}</span></td>
                <td>${event.reason}</td>
                <td>${event.message}</td>
                <td>${event.age}</td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    return html;
}
