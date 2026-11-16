/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// AI Agent - Chat Component Initialization for L8ERP
// Hooks into the module navigation to render the ChatGPT-like chat UI
// instead of a standard table when the "chat" service is active.

(function() {
    'use strict';

    window.AiaAgent = window.AiaAgent || {};

    AiaAgent.initChat = function() {
        if (typeof L8AgentChat !== 'undefined') {
            L8AgentChat.init({
                containerId: 'agent-chat-table-container',
                chatEndpoint: '/120/AgntChat',
                promptEndpoint: '/120/AgntPrmpt'
            });
        }
    };

    // Override the module initializer to also init the chat UI
    var origInit = window.initializeAia;
    window.initializeAia = function() {
        if (origInit) origInit();

        // Initialize chat when the chat service view becomes active
        var chatView = document.querySelector('.l8-service-view[data-service="chat"]');
        if (chatView) {
            if (chatView.classList.contains('active')) {
                AiaAgent.initChat();
            }
            var observer = new MutationObserver(function() {
                if (chatView.classList.contains('active')) {
                    AiaAgent.initChat();
                }
            });
            observer.observe(chatView, { attributes: true, attributeFilter: ['class'] });
        }
    };
})();
