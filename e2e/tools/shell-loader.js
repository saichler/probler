/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// Headless loader for an ERP web shell (app.html / m/app.html).
//
// Loads every <script src> the shell declares, in declared order, into a bare
// DOM stub. Used by generate-inventory.js to read the REAL module configs
// rather than a hand-maintained list, and by the includes audit to surface any
// script that throws at load time.
//
// This is deliberately NOT a browser: the goal is to execute the config/enum/
// column/form IIFEs, which are pure data. Anything that genuinely needs a DOM
// is exercised by the Playwright specs against the real deployed app.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeElement() {
    return {
        style: {}, dataset: {}, children: [], parentNode: null,
        innerHTML: '', outerHTML: '', textContent: '', value: '',
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        appendChild() {}, removeChild() {}, replaceWith() {}, remove() {},
        addEventListener() {}, removeEventListener() {},
        querySelector() { return null; }, querySelectorAll() { return []; },
        setAttribute() {}, getAttribute() { return null; }, closest() { return null; },
        insertAdjacentHTML() {}, focus() {}, click() {}, getContext() { return null; }
    };
}

function installDomStub(g, pageUrl) {
    g.window = g;
    g.document = {
        body: makeElement(), head: makeElement(), documentElement: makeElement(),
        readyState: 'complete', cookie: '',
        getElementById() { return null; },
        querySelector() { return null; }, querySelectorAll() { return []; },
        createElement() { return makeElement(); }, createTextNode() { return makeElement(); },
        addEventListener() {}, removeEventListener() {}
    };
    g.navigator = { userAgent: 'shell-loader', language: 'en-US' };
    g.location = {
        href: 'https://localhost' + pageUrl, origin: 'https://localhost',
        pathname: pageUrl, hostname: 'localhost', protocol: 'https:', search: ''
    };
    g.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    g.sessionStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    g.fetch = () => Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({}), text: () => Promise.resolve('')
    });
    g.addEventListener = () => {};
    g.removeEventListener = () => {};
    g.postMessage = () => {};
    g.parent = g;
    g.alert = () => {};
    g.confirm = () => true;
    g.requestAnimationFrame = (fn) => setTimeout(fn, 0);
    g.getComputedStyle = () => ({ getPropertyValue() { return ''; } });
    g.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
    g.CustomEvent = class { constructor() {} };
    g.Event = class { constructor() {} };
    g.WebSocket = class { constructor() {} close() {} send() {} addEventListener() {} };
    g.MutationObserver = class { observe() {} disconnect() {} };
    g.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    g.XMLHttpRequest = class { open() {} send() {} setRequestHeader() {} };
}

/**
 * Load a shell and return { globals, scripts, failures }.
 * @param {string} webRoot  absolute path to go/prob/newui/web
 * @param {string} shell    shell path relative to webRoot, e.g. 'app.html' or 'm/app.html'
 */
function loadShell(webRoot, shell) {
    const shellPath = path.join(webRoot, shell);
    const shellDir = path.dirname(shellPath);
    const html = fs.readFileSync(shellPath, 'utf8');
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);

    const g = Object.create(null);
    const ctx = vm.createContext(g);
    installDomStub(g, '/' + shell);

    const failures = [];
    for (const src of scripts) {
        const file = path.resolve(shellDir, src.replace(/^\//, '').replace(/[?#].*$/, ''));
        if (!fs.existsSync(file)) {
            failures.push({ src, error: 'MISSING FILE on disk' });
            continue;
        }
        try {
            vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: src });
        } catch (e) {
            failures.push({ src, error: e.constructor.name + ': ' + e.message });
        }
    }
    return { globals: g, scripts, failures };
}

module.exports = { loadShell };
