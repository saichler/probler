/* Landing Page - Interactive Functions */

// Modal loading cache
const loadedModals = {};

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
    window.open('login/index.html', '_blank');
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

document.querySelectorAll('.feature-card, .service-card, .step-card').forEach(el => {
    observer.observe(el);
});

// Add interactive hover effects
document.querySelectorAll('.feature-card, .service-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Parallax Scrolling Effect
let ticking = false;
function updateParallax() {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.parallax-content');
    const shapes = document.querySelectorAll('.floating-shape');
    const heroSection = document.querySelector('.hero');
    const sectionHeaders = document.querySelectorAll('.section-header');

    if (heroSection) {
        heroSection.style.transform = `translateY(${scrolled * 0.5}px)`;
    }

    parallaxElements.forEach(el => {
        const speed = el.dataset.speed || 0.8;
        const yPos = -(scrolled * speed);
        el.style.transform = `translateY(${yPos * 0.1}px)`;
    });

    shapes.forEach((shape, index) => {
        const speed = 0.5 + (index * 0.1);
        const yPos = -(scrolled * speed);
        const rotation = scrolled * 0.2;
        shape.style.transform = `translateY(${yPos}px) rotate(${rotation}deg)`;
    });

    sectionHeaders.forEach(header => {
        const rect = header.getBoundingClientRect();
        const speed = 0.3;
        if (rect.top <= window.innerHeight && rect.bottom >= 0) {
            const yPos = (rect.top - window.innerHeight / 2) * speed;
            header.style.backgroundPosition = `center ${yPos}px`;
        }
    });

    ticking = false;
}

function requestTick() {
    if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
    }
}

window.addEventListener('scroll', requestTick);
updateParallax();

// Smooth reveal animation for elements
const revealElements = document.querySelectorAll('.section-header h2, .section-header p');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.transform = 'translateY(0)';
            entry.target.style.opacity = '1';
        }
    });
}, { threshold: 0.1 });

revealElements.forEach(el => {
    el.style.transform = 'translateY(50px)';
    el.style.opacity = '0';
    el.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    revealObserver.observe(el);
});

// Add parallax data attributes
document.querySelectorAll('.parallax-content').forEach((el, index) => {
    el.setAttribute('data-speed', 0.5 + (index * 0.2));
});
