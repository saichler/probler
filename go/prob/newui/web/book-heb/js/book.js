/**
 * Radical Simplicity for Humans - Book Website JavaScript
 * Minimal interactivity for a professional reading experience
 */

(function() {
    'use strict';

    // Store scroll position when menu opens
    let scrollPosition = 0;

    /**
     * Mobile Navigation Toggle
     */
    function initMobileNav() {
        const toggle = document.querySelector('.mobile-nav-toggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (!toggle || !sidebar) return;

        function openMenu() {
            scrollPosition = window.pageYOffset;
            sidebar.classList.add('open');
            toggle.classList.add('open');
            if (overlay) overlay.classList.add('visible');
            document.body.classList.add('menu-open');
            document.body.style.top = `-${scrollPosition}px`;
        }

        function closeMenu() {
            sidebar.classList.remove('open');
            toggle.classList.remove('open');
            if (overlay) overlay.classList.remove('visible');
            document.body.classList.remove('menu-open');
            document.body.style.top = '';
            window.scrollTo(0, scrollPosition);
        }

        function toggleMenu() {
            if (sidebar.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        // Toggle button click
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });

        // Close when clicking overlay
        if (overlay) {
            overlay.addEventListener('click', closeMenu);
        }

        // Close sidebar when clicking a link inside it
        sidebar.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    closeMenu();
                }
            });
        });

        // Close sidebar when pressing Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                closeMenu();
            }
        });

        // Handle resize - close menu if window becomes larger
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
                closeMenu();
            }
        });
    }

    /**
     * Active Chapter Highlighting
     * Highlights the current chapter in the navigation
     */
    function initActiveChapter() {
        const currentPath = window.location.pathname;
        const filename = currentPath.split('/').pop() || 'index.html';

        const navLinks = document.querySelectorAll('.chapter-list a');
        navLinks.forEach(function(link) {
            const href = link.getAttribute('href');
            if (href === filename || (filename === '' && href === 'book.html')) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Smooth Scroll for Internal Links
     */
    function initSmoothScroll() {
        const links = document.querySelectorAll('a[href^="#"]');

        links.forEach(function(link) {
            link.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href').slice(1);
                const target = document.getElementById(targetId);

                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });

                    // Update URL without jumping
                    history.pushState(null, null, '#' + targetId);
                }
            });
        });
    }

    /**
     * Reading Progress Indicator (optional enhancement)
     * Shows how far the reader has scrolled through the content
     */
    function initReadingProgress() {
        const progressBar = document.querySelector('.reading-progress');
        if (!progressBar) return;

        window.addEventListener('scroll', function() {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPos = window.scrollY;
            const progress = (scrollPos / docHeight) * 100;
            progressBar.style.width = progress + '%';
        });
    }

    /**
     * Touch-friendly improvements
     */
    function initTouchEnhancements() {
        // Prevent 300ms click delay on touch devices
        if ('ontouchstart' in window) {
            document.documentElement.classList.add('touch-device');
        }

        // Add active states for touch feedback
        const touchElements = document.querySelectorAll('.chapter-list a, .toc-list a, .chapter-nav a, .mobile-nav-toggle');
        touchElements.forEach(function(el) {
            el.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            }, { passive: true });

            el.addEventListener('touchend', function() {
                this.classList.remove('touch-active');
            }, { passive: true });

            el.addEventListener('touchcancel', function() {
                this.classList.remove('touch-active');
            }, { passive: true });
        });
    }

    /**
     * Initialize all functionality when DOM is ready
     */
    function init() {
        initMobileNav();
        initActiveChapter();
        initSmoothScroll();
        initReadingProgress();
        initTouchEnhancements();
    }

    // Run when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
