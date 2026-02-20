// Initialize GPU Section
// Columns: ProblerGpus.columns (probler/gpus/gpus-columns.js)
function initializeGPUs() {
    const container = document.getElementById('gpu-table');

    if (!container) {
        return;
    }

    // Initialize parallax effect for GPU hero section
    initializeGPUParallax();

    const gpuData = [];

    try {
        // Create the GPU table
        const gpuTable = new Layer8DTable({
            containerId: 'gpu-table',
            columns: ProblerGpus.columns.GPU,
            data: gpuData,
            pageSize: 15,
            sortable: true,
            filterable: true,
            statusColumn: 'status',
            onRowClick: (rowData) => {
                showGPUDetailModal(rowData);
            }
        });
        gpuTable.init();
    } catch (error) {
    }
}

// Initialize GPU Parallax Effect
function initializeGPUParallax() {
    const gpuHero = document.querySelector('.gpu-hero');
    if (!gpuHero) return;

    const gpuCards = document.querySelectorAll('.gpu-card');
    const performanceBars = document.querySelector('.performance-bars');
    const dataParticles = document.querySelectorAll('.data-particle');

    // Parallax on scroll
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroTop = gpuHero.offsetTop;
        const heroHeight = gpuHero.offsetHeight;

        // Only apply parallax when hero is in view
        if (scrolled >= heroTop - window.innerHeight && scrolled <= heroTop + heroHeight) {
            const relativeScroll = scrolled - heroTop;

            // Move GPU cards at different speeds for depth effect
            gpuCards.forEach((card, index) => {
                const speed = parseFloat(card.getAttribute('data-speed')) || 1;
                const yOffset = relativeScroll * speed * 0.3;
                card.style.transform = `translateY(${yOffset}px)`;
            });

            // Move performance bars
            if (performanceBars) {
                performanceBars.style.transform = `translateY(${relativeScroll * 0.5}px)`;
            }

            // Float data particles
            dataParticles.forEach((particle, index) => {
                const offset = relativeScroll * (0.2 + index * 0.1);
                particle.style.transform = `translateY(${-offset}px)`;
            });
        }
    });

    // Mouse move parallax effect
    gpuHero.addEventListener('mousemove', (e) => {
        const rect = gpuHero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        const moveX = (x - 0.5) * 20;
        const moveY = (y - 0.5) * 20;

        gpuCards.forEach((card, index) => {
            const speed = parseFloat(card.getAttribute('data-speed')) || 1;
            card.style.transform = `translate(${moveX * speed}px, ${moveY * speed}px)`;
            card.style.transition = 'transform 0.3s ease-out';
        });
    });

    // Reset on mouse leave
    gpuHero.addEventListener('mouseleave', () => {
        gpuCards.forEach((card) => {
            card.style.transform = 'translate(0, 0)';
        });
    });
}
