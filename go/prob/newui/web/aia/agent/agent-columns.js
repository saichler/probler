/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// AI Agent - Column Definitions
// Reuses the shared l8agent column definitions

(function() {
    'use strict';

    window.AiaAgent = window.AiaAgent || {};

    // Add mobile-specific primary/secondary markers for card display
    AiaAgent.columns = {
        L8AgentConversation: L8Agent.columns.L8AgentConversation.map(function(col) {
            if (col.key === 'title') return Object.assign({}, col, { primary: true });
            if (col.key === 'status') return Object.assign({}, col, { secondary: true });
            return col;
        }),
        L8AgentPrompt: L8Agent.columns.L8AgentPrompt.map(function(col) {
            if (col.key === 'name') return Object.assign({}, col, { primary: true });
            if (col.key === 'category') return Object.assign({}, col, { secondary: true });
            return col;
        })
    };
    AiaAgent.primaryKeys = L8Agent.primaryKeys;
})();
