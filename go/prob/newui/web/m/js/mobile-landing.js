/* Mobile Landing Page - JavaScript */

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initHamburgerMenu();
    initAccordions();
    initSmoothScroll();
    initModals();
});

// Simple markdown to HTML parser
function parseMarkdown(markdown) {
    let html = markdown
        // Remove the first line with HTML div tag (title is already in header)
        .replace(/^#\s*<div[^>]*>.*<\/div>\s*\n?/, '')
        // Convert ## headers
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        // Convert # headers
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
        // Convert horizontal rules
        .replace(/^---+$/gm, '<hr>')
        // Convert bold italic (***text***)
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        // Convert bold (**text**)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Convert italic (*text*)
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Convert links [text](url)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Convert paragraphs (double newlines)
        .split(/\n\n+/)
        .map(para => {
            para = para.trim();
            if (!para) return '';
            // Don't wrap if it's already a block element
            if (para.startsWith('<h') || para.startsWith('<hr')) {
                return para;
            }
            return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
        })
        .filter(p => p)
        .join('\n');

    return html;
}

// Fetch and render AboutTheDeveloper.md
async function loadDeveloperMarkdown() {
    try {
        const response = await fetch('../AboutTheDeveloper.md');
        if (!response.ok) {
            throw new Error('Could not load AboutTheDeveloper.md');
        }
        const markdown = await response.text();
        const html = parseMarkdown(markdown);
        const container = document.getElementById('developer-markdown-content');
        if (container) {
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading developer markdown:', error);
        const container = document.getElementById('developer-markdown-content');
        if (container) {
            container.innerHTML = '<p>Content could not be loaded.</p>';
        }
    }
}

// Hamburger Menu Toggle
function initHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navDrawer = document.querySelector('.nav-drawer');

    if (!hamburger || !navDrawer) return;

    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navDrawer.classList.toggle('open');
        document.body.classList.toggle('nav-open');
    });

    // Close menu when clicking a nav link
    const navLinks = navDrawer.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Don't close if it's an external link or modal trigger
            if (!this.getAttribute('onclick') && !this.getAttribute('target')) {
                hamburger.classList.remove('active');
                navDrawer.classList.remove('open');
                document.body.classList.remove('nav-open');
            }
        });
    });

    // Close menu when clicking outside
    navDrawer.addEventListener('click', function(e) {
        if (e.target === navDrawer) {
            hamburger.classList.remove('active');
            navDrawer.classList.remove('open');
            document.body.classList.remove('nav-open');
        }
    });
}

// Accordion for Quick Start Steps
function initAccordions() {
    const stepCards = document.querySelectorAll('.step-card');

    stepCards.forEach((card, index) => {
        const header = card.querySelector('.step-header');
        if (!header) return;

        // Open first step by default
        if (index === 0) {
            card.classList.add('expanded');
        }

        header.addEventListener('click', function() {
            // Toggle this card
            card.classList.toggle('expanded');
        });
    });

    // Category collapsibles for services
    const categoryHeaders = document.querySelectorAll('.category-header');
    categoryHeaders.forEach(header => {
        header.addEventListener('click', function() {
            this.classList.toggle('expanded');
            const content = this.nextElementSibling;
            if (content) {
                content.classList.toggle('expanded');
            }
        });
    });
}

// Smooth Scroll for Anchor Links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    // Account for fixed header
                    const headerHeight = document.querySelector('header')?.offsetHeight || 60;
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// Modal Functions
const loadedModals = {};

async function loadModal(modalName) {
    if (loadedModals[modalName]) {
        return true;
    }

    try {
        const response = await fetch(`../modals/${modalName}-modal.html`);
        if (!response.ok) {
            console.error(`Failed to load modal: ${modalName}`);
            return false;
        }
        const html = await response.text();
        document.getElementById('modal-container').innerHTML += html;
        loadedModals[modalName] = true;
        return true;
    } catch (error) {
        console.error(`Error loading modal ${modalName}:`, error);
        return false;
    }
}

function initModals() {
    // Close modal when clicking backdrop
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('open');
    });
    document.body.style.overflow = 'auto';
}

// Demo Modal
async function showDemoCredentials() {
    if (await loadModal('demo')) {
        const modal = document.getElementById('demoModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }
}

function closeDemoModal() {
    const modal = document.getElementById('demoModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
        document.body.style.overflow = 'auto';
    }
}

function proceedToDemo() {
    sessionStorage.removeItem('bearerToken');
    localStorage.removeItem('bearerToken');
    sessionStorage.removeItem('currentUser');
    window.open('../l8ui/login/index.html', '_blank');
    closeDemoModal();
}

// About Modal
async function openAboutModal() {
    if (await loadModal('about')) {
        const modal = document.getElementById('aboutModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }
}

function closeAboutModal() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
        document.body.style.overflow = 'auto';
    }
}

// Developer Modal
async function openDeveloperModal() {
    if (await loadModal('developer')) {
        const modal = document.getElementById('developerModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
            loadDeveloperMarkdown();
        }
    }
}

function closeDeveloperModal() {
    const modal = document.getElementById('developerModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
        document.body.style.overflow = 'auto';
    }
}

// Demo banner dismiss
function dismissDemoBanner() {
    const banner = document.getElementById('demoBanner');
    if (banner) {
        banner.classList.add('hidden');
        sessionStorage.setItem('demoBannerDismissed', 'true');
    }
}

// Restore banner state on load
(function() {
    if (sessionStorage.getItem('demoBannerDismissed') === 'true') {
        document.addEventListener('DOMContentLoaded', function() {
            const banner = document.getElementById('demoBanner');
            if (banner) banner.classList.add('hidden');
        });
    }
})();

// Demo link functions - open documentation pages
function openCollectorDemo() {
    window.open('../docs/l8collector.html', '_blank');
}

function openParserDemo() {
    window.open('../docs/l8parser.html', '_blank');
}

function openInventoryBoxDemo() {
    window.open('../docs/l8inventory.html', '_blank');
}

function openORMDemo() {
    window.open('../docs/l8orm.html', '_blank');
}

function openVNetDemo() {
    window.open('../docs/l8bus.html', '_blank');
}

function openModelAgnosticServicesDemo() {
    window.open('../docs/l8services.html', '_blank');
}

function openWebDemo() {
    window.open('../docs/l8web.html', '_blank');
}

function openGSQLDemo() {
    window.open('../docs/l8ql.html', '_blank');
}

function openReflectDemo() {
    window.open('../docs/l8reflect.html', '_blank');
}

function openOpenSimulatorDemo() {
    window.open('https://www.probler.dev:9094/web.html', '_blank');
}

function openTestAndAutomationDemo() {
    window.open('../docs/l8test.html', '_blank');
}

function openTopologyDemo() {
    window.open('../docs/l8topology.html', '_blank');
}

function openProjectGitHub(projectName) {
    window.open(`https://github.com/saichler/${projectName}`, '_blank');
}

// Desktop Version Toggle
function switchToDesktop() {
    localStorage.setItem('preferDesktop', 'true');
    window.location.href = '../index.html';
}

// Add fade-in animation on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card, .service-card, .step-card, .doc-card').forEach(el => {
    observer.observe(el);
});

// Add CSS for fade-in animation
const style = document.createElement('style');
style.textContent = `
    .feature-card, .service-card, .step-card, .doc-card {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.4s ease, transform 0.4s ease;
    }
    .fade-in {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(style);
