/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/

// AI Agent Module Configuration - Uses Layer8ModuleConfigFactory
Layer8ModuleConfigFactory.create({
    namespace: 'Aia',
    modules: {
        'agent': {
            label: 'Agent', icon: '🤖',
            services: [
                { key: 'chat', label: 'Chat', icon: '💬', endpoint: '/120/AgntChat', model: 'L8AgentChatConversation', customView: true },
                { key: 'conversations', label: 'Conversations', icon: '📄', endpoint: '/120/AgntConvo', model: 'L8AgentConversation' },
                { key: 'prompts', label: 'Prompts', icon: '📋', endpoint: '/120/AgntPrmpt', model: 'L8AgentPrompt' }
            ]
        }
    },
    submodules: ['AiaAgent']
});
