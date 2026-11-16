/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
/**
 * Mobile AIA Agent - Chat Component Initialization for L8ERP
 * Initializes L8AgentChatMobile with ERP-specific endpoints
 */
(function() {
    'use strict';

    window.AiaAgent = window.AiaAgent || {};

    // Called by customInit pattern in layer8m-nav.js
    AiaAgent.initialize = function() {
        if (typeof L8AgentChatMobile !== 'undefined') {
            L8AgentChatMobile.init({
                containerId: 'aia-chat-container',
                chatEndpoint: '/120/AgntChat',
                convoEndpoint: '/120/AgntConvo',
                promptEndpoint: '/120/AgntPrmpt'
            });
        }
    };
})();
