/* Landing Page - Interactive Functions */

// Modal loading cache
const loadedModals = {};

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
        const response = await fetch('AboutTheDeveloper.md');
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

// Dynamic modal loader
async function loadModal(modalName) {
    if (loadedModals[modalName]) {
        return true;
    }

    try {
        const response = await fetch(`modals/${modalName}-modal.html`);
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

// Demo Modal functions
async function showDemoCredentials() {
    if (await loadModal('demo')) {
        document.getElementById('demoModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeDemoModal() {
    const modal = document.getElementById('demoModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function proceedToDemo() {
    sessionStorage.removeItem('bearerToken');
    localStorage.removeItem('bearerToken');
    sessionStorage.removeItem('currentUser');
    window.open('l8ui/login/index.html', '_blank');
    closeDemoModal();
}

// About Modal functions
async function openAboutModal() {
    if (await loadModal('about')) {
        document.getElementById('aboutModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeAboutModal() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Developer Modal functions
async function openDeveloperModal() {
    if (await loadModal('developer')) {
        document.getElementById('developerModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        loadDeveloperMarkdown();
    }
}

function closeDeveloperModal() {
    const modal = document.getElementById('developerModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeDemoModal();
        closeAboutModal();
        closeDeveloperModal();
    }
});

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
        const banner = document.getElementById('demoBanner');
        if (banner) banner.classList.add('hidden');
    }
})();

// Demo link functions
function openCollectorDemo() {
    window.open('docs/l8collector.html', '_blank');
}

function openParserDemo() {
    window.open('docs/l8parser.html', '_blank');
}

function openInventoryBoxDemo() {
    window.open('docs/l8inventory.html', '_blank');
}

function openORMDemo() {
    window.open('docs/l8orm.html', '_blank');
}

function openVNetDemo() {
    window.open('docs/l8bus.html', '_blank');
}

function openModelAgnosticServicesDemo() {
    window.open('docs/l8services.html', '_blank');
}

function openWebDemo() {
    window.open('docs/l8web.html', '_blank');
}

function openGSQLDemo() {
    window.open('docs/l8ql.html', '_blank');
}

function openReflectDemo() {
    window.open('docs/l8reflect.html', '_blank');
}

function openOpenSimulatorDemo() {
    window.open('https://www.probler.dev:9094/web.html', '_blank');
}

function openTestAndAutomationDemo() {
    window.open('docs/l8test.html', '_blank');
}

function openTopologyDemo() {
    window.open('docs/l8topology.html', '_blank');
}

function openProjectGitHub(projectName) {
    window.open(`https://github.com/saichler/${projectName}`, '_blank');
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Add fade-in animation on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
});

document.querySelectorAll('.component-card, .step-card, .category-header').forEach(el => {
    observer.observe(el);
});

// Simple reveal animation for elements
const revealElements = document.querySelectorAll('.section-header h2, .section-header p, .hero h1, .hero p');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.transform = 'translateY(0)';
            entry.target.style.opacity = '1';
        }
    });
}, { threshold: 0.1 });

revealElements.forEach(el => {
    el.style.transform = 'translateY(24px)';
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    revealObserver.observe(el);
});
