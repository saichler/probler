// GPU Devices - Direct Integration (no iframe)
// Enums: ProblerGpus.enums (probler/gpus/gpus-enums.js)
// Columns: ProblerGpus.columns (probler/gpus/gpus-columns.js)

// Global table instance
let gpuDevicesTable = null;

// Strip extra embedded quotes from protobuf string values (e.g. "\"value\"" -> "value")
function stripQuotes(str) {
    if (!str) return '';
    return str.replace(/^"+|"+$/g, '');
}

// Transform JSON GPU device data to table format
function transformGpuDeviceData(device) {
    const info = device.deviceInfo || {};
    const gpusMap = device.gpus || {};
    const gpusList = Object.values(gpusMap);
    const firstGpu = gpusList[0] || {};

    return {
        id: device.id,
        ipAddress: info.ipAddress || device.id,
        hostname: info.hostname || device.id,
        gpuModel: stripQuotes(firstGpu.deviceName) || info.model || '',
        gpuCount: info.gpuCount || gpusList.length || 0,
        driverVersion: info.driverVersion || '',
        cudaVersion: info.cudaVersion || '',
        dcgmVersion: info.dcgmVersion || '',
        status: ProblerGpus.enums.mapDeviceStatus(info.deviceStatus),
        lastSeen: info.lastSeen || '',
        uptime: info.uptime || '',
        vendor: info.vendor || '',
        serialNumber: info.serialNumber || '',
        location: info.location || '',
        osVersion: info.osVersion || '',
        kernelVersion: info.kernelVersion || '',
        gpus: gpusList,
        system: device.system || {},
        health: device.health || {},
        topology: device.topology || {}
    };
}

// Update hero subtitle with device stats
function updateGpuHeroStats(counts) {
    ProblerDom.updateHeroStats('.gpu-hero .hero-subtitle', counts, 'GPU Servers');
}

// Initialize GPU Devices table
function initializeGPUs() {
    const container = document.getElementById('gpu-table');
    if (!container) return;

    // Initialize parallax effect for GPU hero section
    initializeGPUParallax();

    const endpoint = Layer8DConfig.resolveEndpoint('/2/GCache');

    gpuDevicesTable = new Layer8DTable({
        containerId: 'gpu-table',
        endpoint: endpoint,
        modelName: 'GpuDevice',
        columns: ProblerGpus.columns.GpuDevice,
        pageSize: 15,
        pageSizeOptions: [15, 25, 50],
        sortable: true,
        filterable: true,
        serverSide: true,
        transformData: transformGpuDeviceData,
        onDataLoaded: (data, items, totalCount) => {
            if (data.metadata?.keyCount?.counts) {
                updateGpuHeroStats(data.metadata.keyCount.counts);
            }
        },
        onRowClick: (rowData) => {
            showGPUDetailModal(rowData);
        }
    });
    gpuDevicesTable.init();
}

// Initialize GPU Parallax Effect
function initializeGPUParallax() {
    const gpuHero = document.querySelector('.gpu-hero');
    if (!gpuHero) return;

    const gpuCards = document.querySelectorAll('.gpu-card');
    const performanceBars = document.querySelector('.performance-bars');
    const dataParticles = document.querySelectorAll('.data-particle');

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroTop = gpuHero.offsetTop;
        const heroHeight = gpuHero.offsetHeight;

        if (scrolled >= heroTop - window.innerHeight && scrolled <= heroTop + heroHeight) {
            const relativeScroll = scrolled - heroTop;

            gpuCards.forEach((card, index) => {
                const speed = parseFloat(card.getAttribute('data-speed')) || 1;
                const yOffset = relativeScroll * speed * 0.3;
                card.style.transform = `translateY(${yOffset}px)`;
            });

            if (performanceBars) {
                performanceBars.style.transform = `translateY(${relativeScroll * 0.5}px)`;
            }

            dataParticles.forEach((particle, index) => {
                const offset = relativeScroll * (0.2 + index * 0.1);
                particle.style.transform = `translateY(${-offset}px)`;
            });
        }
    });

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

    gpuHero.addEventListener('mouseleave', () => {
        gpuCards.forEach((card) => {
            card.style.transform = 'translate(0, 0)';
        });
    });
}
