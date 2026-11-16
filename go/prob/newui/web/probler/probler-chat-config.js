/*
© 2025 Sharon Aicler (saichler@gmail.com)

Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0
*/

// Chat (l8chat) endpoints, shared by the desktop and mobile shells. l8chat
// names no service; the adopter passes them all (l8ai plan §6.8).
(function() {
    'use strict';
    window.PROBLER_CHAT_ENDPOINTS = {
        msg: '/81/ChatMsg',
        conv: '/81/ChatConv',
        peer: '/81/ChatPeer',
        sync: '/81/ChatSync',
        stat: '/81/ChatStat',
        group: '/81/ChatGroup',
        users: '/73/users',
        llmProf: '/79/LlmProf'
    };
})();
