// Professional NOC Tree View Component
// Reusable tree with expand/collapse functionality

class ProblerTree {
    constructor(containerId, config) {
        this.containerId = containerId;
        this.config = {
            data: config.data || {},
            expandAll: config.expandAll || false,
            maxHeight: config.maxHeight || '500px',
            onNodeClick: config.onNodeClick || null
        };

        this.expandedNodes = new Set();
        this.init();
    }

    init() {
        if (this.config.expandAll) {
            this.expandAllNodes(this.config.data);
        }
        this.render();
    }

    expandAllNodes(node, path = '') {
        if (typeof node === 'object' && node !== null) {
            this.expandedNodes.add(path);

            if (Array.isArray(node)) {
                node.forEach((item, index) => {
                    this.expandAllNodes(item, `${path}[${index}]`);
                });
            } else {
                Object.keys(node).forEach(key => {
                    this.expandAllNodes(node[key], path ? `${path}.${key}` : key);
                });
            }
        }
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        let html = '<div class="tree-view-container" style="max-height: ' + this.config.maxHeight + '; overflow-y: auto;">';
        html += this.renderNode(this.config.data, '', 0, '', true);
        html += '</div>';

        container.innerHTML = html;
        this.attachEventListeners();
    }

    renderNode(node, path, level, parentKey = '', isRoot = false) {
        let html = '';

        if (node === null || node === undefined) {
            return `<div class="tree-leaf" style="margin-left: ${level * 20}px;">
                <span class="tree-value tree-null">null</span>
            </div>`;
        }

        if (typeof node !== 'object') {
            // Leaf node (primitive value)
            return `<div class="tree-leaf" style="margin-left: ${level * 20}px;">
                <span class="tree-value">${this.formatValue(node)}</span>
            </div>`;
        }

        if (Array.isArray(node)) {
            // Array node
            if (node.length === 0) {
                return `<div class="tree-leaf" style="margin-left: ${level * 20}px;">
                    <span class="tree-value tree-empty">[]</span>
                </div>`;
            }

            node.forEach((item, index) => {
                const itemPath = `${path}[${index}]`;
                const isExpanded = this.expandedNodes.has(itemPath);
                const hasChildren = typeof item === 'object' && item !== null;

                html += `<div class="tree-node" data-path="${itemPath}" data-level="${level}">`;

                if (hasChildren) {
                    // Generate label from parent key (remove trailing 's' and add index)
                    // But if item has an "id" attribute, use that instead
                    let labelSuffix = index;
                    if (item.id !== undefined) {
                        labelSuffix = item.id;
                    } else if (item.Id !== undefined) {
                        labelSuffix = item.Id;
                    } else if (item.ID !== undefined) {
                        labelSuffix = item.ID;
                    }

                    const singularLabel = this.getSingularLabel(parentKey, labelSuffix);
                    const emoji = this.getEmojiForLabel(singularLabel);

                    html += `<div class="tree-node-header" style="margin-left: ${level * 20}px;">
                        <span class="tree-expand-icon ${isExpanded ? 'expanded' : ''}">${isExpanded ? '▼' : '▶'}</span>
                        <span class="tree-emoji">${emoji}</span>
                        <span class="tree-key">${singularLabel}</span>
                    </div>`;

                    if (isExpanded) {
                        html += `<div class="tree-children">`;
                        html += this.renderNode(item, itemPath, level + 1, '', false);
                        html += `</div>`;
                    }
                } else {
                    html += `<div class="tree-node-header" style="margin-left: ${level * 20}px;">
                        <span class="tree-expand-icon tree-no-children"></span>
                        <span class="tree-key">[${index}]:</span>
                        <span class="tree-value">${this.formatValue(item)}</span>
                    </div>`;
                }

                html += `</div>`;
            });
        } else {
            // Object node
            const keys = Object.keys(node);

            if (keys.length === 0) {
                return `<div class="tree-leaf" style="margin-left: ${level * 20}px;">
                    <span class="tree-value tree-empty">{}</span>
                </div>`;
            }

            keys.forEach(key => {
                // Skip rendering id/Id/ID attributes as they're used in the parent label
                if (key === 'id' || key === 'Id' || key === 'ID') {
                    return;
                }

                const value = node[key];
                const itemPath = path ? `${path}.${key}` : key;
                const isExpanded = this.expandedNodes.has(itemPath);
                const hasChildren = typeof value === 'object' && value !== null;

                html += `<div class="tree-node" data-path="${itemPath}" data-level="${level}">`;

                if (hasChildren) {
                    const childCount = Array.isArray(value) ? value.length : Object.keys(value).length;
                    // Get the label - remove suffix if it's a single-key map
                    let displayLabel = key;
                    if (keys.length === 1 && !Array.isArray(value)) {
                        // Check if value has an id attribute (but not for root)
                        let idValue = null;
                        if (!isRoot) {
                            if (value.id !== undefined) {
                                idValue = value.id;
                            } else if (value.Id !== undefined) {
                                idValue = value.Id;
                            } else if (value.ID !== undefined) {
                                idValue = value.ID;
                            }
                        }

                        if (idValue !== null) {
                            // Remove the key suffix and add the id value
                            const baseKey = key.replace(/-\d+$/, '');
                            displayLabel = `${baseKey}-${idValue}`;
                        } else {
                            // Remove "-0", "-1", etc. suffix from the key
                            displayLabel = key.replace(/-\d+$/, '');
                        }
                    }
                    const emoji = isRoot ? '📋' : this.getEmojiForLabel(displayLabel);

                    html += `<div class="tree-node-header" style="margin-left: ${level * 20}px;">
                        <span class="tree-expand-icon ${isExpanded ? 'expanded' : ''}">${isExpanded ? '▼' : '▶'}</span>
                        <span class="tree-emoji">${emoji}</span>
                        <span class="tree-key">${this.capitalizeLabel(displayLabel)}</span>
                    </div>`;

                    if (isExpanded) {
                        html += `<div class="tree-children">`;
                        html += this.renderNode(value, itemPath, level + 1, Array.isArray(value) ? key : '', false);
                        html += `</div>`;
                    }
                } else {
                    const emoji = isRoot ? '📋' : this.getEmojiForLabel(key);
                    html += `<div class="tree-node-header" style="margin-left: ${level * 20}px;">
                        <span class="tree-expand-icon tree-no-children"></span>
                        <span class="tree-emoji">${emoji}</span>
                        <span class="tree-key">${this.capitalizeLabel(key)}:</span>
                        <span class="tree-value">${this.formatValue(value)}</span>
                    </div>`;
                }

                html += `</div>`;
            });
        }

        return html;
    }

    getSingularLabel(parentKey, index) {
        if (!parentKey) {
            return `[${index}]`;
        }

        // Remove trailing 's' to get singular form
        let singular = parentKey;
        if (parentKey.endsWith('s')) {
            singular = parentKey.slice(0, -1);
        }

        // Capitalize first letter
        singular = singular.charAt(0).toUpperCase() + singular.slice(1);

        return `${singular} ${index}`;
    }

    capitalizeLabel(label) {
        if (!label || label.length === 0) return label;
        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    getEmojiForLabel(label) {
        if (!label) return '📄';

        const lowerLabel = label.toLowerCase();

        // Hardware components
        if (lowerLabel.includes('physical')) return '🔧';
        if (lowerLabel.includes('chassis')) return '🖥️';
        if (lowerLabel.includes('module')) return '🔌';
        if (lowerLabel.includes('port')) return '🔌';
        if (lowerLabel.includes('interface')) return '🔗';
        if (lowerLabel.includes('cpu')) return '⚙️';
        if (lowerLabel.includes('memory')) return '💾';
        if (lowerLabel.includes('disk') || lowerLabel.includes('storage')) return '💿';
        if (lowerLabel.includes('power') || lowerLabel.includes('psu')) return '🔋';
        if (lowerLabel.includes('fan') || lowerLabel.includes('cooling')) return '💨';
        if (lowerLabel.includes('sensor')) return '🌡️';
        if (lowerLabel.includes('temperature')) return '🌡️';

        // Network
        if (lowerLabel.includes('network')) return '🌐';
        if (lowerLabel.includes('router')) return '🔀';
        if (lowerLabel.includes('switch')) return '🔀';
        if (lowerLabel.includes('gateway')) return '🚪';

        // Properties
        if (lowerLabel.includes('id')) return '🆔';
        if (lowerLabel.includes('name')) return '📛';
        if (lowerLabel.includes('type')) return '📋';
        if (lowerLabel.includes('status')) return '📊';
        if (lowerLabel.includes('model')) return '📦';
        if (lowerLabel.includes('serial')) return '🔢';
        if (lowerLabel.includes('version') || lowerLabel.includes('firmware')) return '📌';
        if (lowerLabel.includes('description')) return '📝';
        if (lowerLabel.includes('vendor') || lowerLabel.includes('manufacturer')) return '🏭';
        if (lowerLabel.includes('location')) return '📍';
        if (lowerLabel.includes('address') || lowerLabel.includes('ip')) return '🌐';

        // Measurements
        if (lowerLabel.includes('frequency')) return '📡';
        if (lowerLabel.includes('size') || lowerLabel.includes('capacity')) return '📏';
        if (lowerLabel.includes('speed')) return '⚡';
        if (lowerLabel.includes('utilization') || lowerLabel.includes('usage')) return '📈';
        if (lowerLabel.includes('core')) return '⚙️';
        if (lowerLabel.includes('architecture')) return '🏗️';

        // Generic
        return '📄';
    }

    getTypeLabel(value, count) {
        if (Array.isArray(value)) {
            return `<span class="tree-count">Array(${count})</span>`;
        } else if (typeof value === 'object' && value !== null) {
            return `<span class="tree-count">Object(${count})</span>`;
        }
        return '';
    }

    formatValue(value) {
        if (typeof value === 'string') {
            return `<span class="tree-string">"${value}"</span>`;
        } else if (typeof value === 'number') {
            return `<span class="tree-number">${value}</span>`;
        } else if (typeof value === 'boolean') {
            return `<span class="tree-boolean">${value}</span>`;
        } else if (value === null) {
            return `<span class="tree-null">null</span>`;
        } else if (value === undefined) {
            return `<span class="tree-undefined">undefined</span>`;
        }
        return String(value);
    }

    attachEventListeners() {
        const container = document.getElementById(this.containerId);

        // Handle expand/collapse clicks
        container.querySelectorAll('.tree-expand-icon:not(.tree-no-children)').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const header = icon.parentElement;
                const node = header.parentElement;
                const path = node.dataset.path;

                this.toggleNode(path);
            });
        });

        // Handle node header clicks (optional callback)
        if (this.config.onNodeClick) {
            container.querySelectorAll('.tree-node-header').forEach(header => {
                header.addEventListener('click', (e) => {
                    const node = header.parentElement;
                    const path = node.dataset.path;
                    this.config.onNodeClick(path, this.getNodeValue(path));
                });
            });
        }
    }

    toggleNode(path) {
        if (this.expandedNodes.has(path)) {
            // Collapsing: remove this node and all descendant nodes
            this.expandedNodes.delete(path);
            this.collapseDescendants(path);
        } else {
            // Expanding: just add this node
            this.expandedNodes.add(path);
        }
        this.render();
    }

    collapseDescendants(parentPath) {
        // Remove all expanded nodes that are descendants of parentPath
        const toDelete = [];
        for (const nodePath of this.expandedNodes) {
            if (nodePath.startsWith(parentPath + '.') || nodePath.startsWith(parentPath + '[')) {
                toDelete.push(nodePath);
            }
        }
        toDelete.forEach(path => this.expandedNodes.delete(path));
    }

    getNodeValue(path) {
        const parts = path.split(/\.|\[|\]/).filter(p => p);
        let current = this.config.data;

        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }

        return current;
    }

    expandAll() {
        this.expandAllNodes(this.config.data);
        this.render();
    }

    collapseAll() {
        this.expandedNodes.clear();
        this.render();
    }

    updateData(newData) {
        this.config.data = newData;
        this.render();
    }
}
