/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/

// AI Agent Section Configuration for Layer8SectionGenerator
(function() {
    'use strict';

    Layer8SectionConfigs.register('aia', {
        title: 'AI Agent',
        subtitle: 'AI-Powered Assistant for Data Analysis and Operations',
        icon: '🤖',
        svgContent: Layer8SvgFactory.generate('aia'),
        initFn: 'initializeAia',
        modules: [
            {
                key: 'agent', label: 'Agent', icon: '🤖', isDefault: true,
                services: [
                    { key: 'chat', label: 'Chat', icon: '💬', isDefault: true },
                    { key: 'conversations', label: 'Conversations', icon: '📄' },
                    { key: 'prompts', label: 'Prompts', icon: '📋' }
                ]
            }
        ]
    });
})();
