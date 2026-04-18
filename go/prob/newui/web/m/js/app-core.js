(function() {
    'use strict';

    const SECTIONS = {
        'dashboard': 'sections/dashboard.html',
        'system': 'sections/system.html'
    };

    let currentSection = 'dashboard';
    let sectionCache = {};

    window.MobileApp = {
        async init() {
            if (!Layer8MAuth.requireAuth()) return;
            await Layer8MConfig.load();
            // Load per-type action permissions for the current user (same helper as desktop)
            await ProblerPermissions.load();
            this.updateUserInfo();
            this.initSidebar();

            document.getElementById('refresh-btn')?.addEventListener('click', () => {
                this.loadSection(currentSection, true);
            });

            const hash = window.location.hash.slice(1);
            const section = (SECTIONS[hash] || LAYER8M_NAV_CONFIG[hash]) ? hash : 'dashboard';
            await this.loadSection(section);

            window.addEventListener('hashchange', () => {
                const newSection = window.location.hash.slice(1);
                if (newSection !== currentSection && (SECTIONS[newSection] || LAYER8M_NAV_CONFIG[newSection])) {
                    this.loadSection(newSection);
                }
            });
        },

        updateUserInfo() {
            const username = Layer8MAuth.getUsername();
            const initial = username.charAt(0).toUpperCase();
            document.getElementById('user-name').textContent = username;
            document.getElementById('user-avatar').textContent = initial;
        },

        initSidebar() {
            const menuToggle = document.getElementById('menu-toggle');
            const overlay = document.getElementById('sidebar-overlay');
            menuToggle?.addEventListener('click', () => this.openSidebar());
            overlay?.addEventListener('click', () => this.closeSidebar());

            document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
                item.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const section = item.dataset.section;
                    const module = item.dataset.module;
                    this.closeSidebar();
                    await this.loadSection(section);
                    if (module && window.Layer8MNav) {
                        Layer8MNav.navigateToModule(module);
                    }
                });
            });
        },

        openSidebar() {
            document.getElementById('sidebar')?.classList.add('open');
            document.getElementById('sidebar-overlay')?.classList.add('visible');
            document.body.style.overflow = 'hidden';
        },

        closeSidebar() {
            document.getElementById('sidebar')?.classList.remove('open');
            document.getElementById('sidebar-overlay')?.classList.remove('visible');
            document.body.style.overflow = '';
        },

        async loadSection(section, forceReload = false) {
            // Modules with nav config use dashboard + Layer8MNav
            if (section !== 'dashboard' && window.LAYER8M_NAV_CONFIG && LAYER8M_NAV_CONFIG[section]) {
                await this._loadDashboardForModule(section, forceReload);
                return;
            }

            const sectionUrl = SECTIONS[section];
            if (!sectionUrl) {
                console.error('Unknown section:', section);
                return;
            }

            this.updateNavState(section);
            const contentArea = document.getElementById('content-area');
            if (!contentArea) return;
            contentArea.style.opacity = '0.5';

            try {
                if (!forceReload && sectionCache[section]) {
                    contentArea.innerHTML = sectionCache[section];
                } else {
                    const response = await fetch(sectionUrl + '?t=' + Date.now());
                    if (!response.ok) throw new Error('Failed to load section');
                    const html = await response.text();
                    sectionCache[section] = html;
                    contentArea.innerHTML = html;
                }
                this.executeScripts(contentArea);
                this.initSection(section);
                currentSection = section;
                window.location.hash = section;
                contentArea.scrollTop = 0;
            } catch (error) {
                console.error('Error loading section:', error);
                contentArea.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-state-icon">&#x26A0;</span>
                        <h4 class="empty-state-title">Failed to load</h4>
                        <p class="empty-state-message">Please try again</p>
                        <button class="btn btn-primary" onclick="MobileApp.loadSection('${section}', true)">Retry</button>
                    </div>`;
            }
            contentArea.style.opacity = '1';
        },

        async _loadDashboardForModule(moduleKey, forceReload) {
            this.updateNavState(moduleKey);
            const contentArea = document.getElementById('content-area');
            if (!contentArea) return;
            contentArea.style.opacity = '0.5';

            try {
                if (!forceReload && sectionCache['dashboard']) {
                    contentArea.innerHTML = sectionCache['dashboard'];
                } else {
                    const response = await fetch(SECTIONS['dashboard'] + '?t=' + Date.now());
                    if (!response.ok) throw new Error('Failed to load dashboard');
                    const html = await response.text();
                    sectionCache['dashboard'] = html;
                    contentArea.innerHTML = html;
                }
                this.executeScripts(contentArea);
                this.initSection('dashboard');
                Layer8MNav.navigateToModule(moduleKey);
                currentSection = moduleKey;
                window.location.hash = moduleKey;
                contentArea.scrollTop = 0;
            } catch (error) {
                console.error('Error loading module:', error);
            }
            contentArea.style.opacity = '1';
        },

        updateNavState(section) {
            document.querySelectorAll('.sidebar-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.section === section) {
                    item.classList.add('active');
                }
            });
        },

        executeScripts(container) {
            const scripts = container.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                newScript.textContent = oldScript.textContent;
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
        },

        initSection(section) {
            const initFunctions = {
                'dashboard': 'initMobileDashboard',
                'system': 'initMobileSystem'
            };
            const initFn = initFunctions[section];
            if (initFn && typeof window[initFn] === 'function') {
                window[initFn]();
            }
        },

        getCurrentSection() { return currentSection; },

        logout() { Layer8MAuth.logout(); }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MobileApp.init());
    } else {
        MobileApp.init();
    }
})();
