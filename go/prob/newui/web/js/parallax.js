function initializeParallax() {
    const parallaxContainer = document.querySelector('.parallax-container');

    if (!parallaxContainer) {
        return;
    }

    const parallaxLayers = parallaxContainer.querySelectorAll('.parallax-layer');

    if (parallaxLayers.length === 0) {
        return;
    }

    parallaxContainer.addEventListener('mousemove', function(e) {
        const rect = parallaxContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        parallaxLayers.forEach(layer => {
            const speed = parseFloat(layer.getAttribute('data-speed')) || 1;
            const moveX = (x - centerX) / centerX * 20 * speed;
            const moveY = (y - centerY) / centerY * 20 * speed;

            layer.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });

    parallaxContainer.addEventListener('mouseleave', function() {
        parallaxLayers.forEach(layer => {
            layer.style.transform = 'translate(0, 0)';
        });
    });

    const sectionContainer = parallaxContainer.closest('.section-container');

    if (sectionContainer) {
        sectionContainer.addEventListener('scroll', function() {
            const scrollTop = sectionContainer.scrollTop;

            parallaxLayers.forEach(layer => {
                const speed = parseFloat(layer.getAttribute('data-speed')) || 1;
                const yPos = -(scrollTop * speed * 0.3);

                layer.style.transform = `translateY(${yPos}px)`;
            });
        });
    }
}
