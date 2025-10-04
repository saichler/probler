// GPU Section Module

// Generate mock GPU data with realistic values
function generateGPUMockData() {
    const baseData = [
        // NVIDIA H100 GPUs
        {
            id: 'gpu-h100-001',
            name: 'GPU-H100-001',
            model: 'H100 PCIe',
            vendor: 'NVIDIA',
            architecture: 'Hopper',
            busId: '0000:17:00.0',
            hostName: 'ai-server-01.datacenter.local',
            status: 'operational',
            utilization: 87,
            memoryUsed: 68,
            memoryTotal: 80,
            temperature: 72,
            powerDraw: 285,
            powerLimit: 350,
            clockSpeed: 1755,
            clockSpeedMax: 1980,
            fanSpeed: 65,
            computeMode: 'Default',
            eccEnabled: true,
            cudaCores: 16896,
            tensorCores: 528,
            rtCores: 0,
            vramType: 'HBM3',
            pcieLanes: 16,
            pcieGen: 5,
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: '96.00.8A.00.01',
            serialNumber: 'H100-1234567890',
            processes: [
                { pid: 12345, name: 'python', memoryUsage: 45000 },
                { pid: 12346, name: 'pytorch', memoryUsage: 25000 }
            ],
            lastSeen: '2025-10-03 14:32:15'
        },
        {
            id: 'gpu-h100-002',
            name: 'GPU-H100-002',
            model: 'H100 SXM5',
            vendor: 'NVIDIA',
            architecture: 'Hopper',
            busId: '0000:B7:00.0',
            hostName: 'ai-server-02.datacenter.local',
            status: 'operational',
            utilization: 92,
            memoryUsed: 74,
            memoryTotal: 80,
            temperature: 78,
            powerDraw: 340,
            powerLimit: 700,
            clockSpeed: 1830,
            clockSpeedMax: 1980,
            fanSpeed: 72,
            computeMode: 'Exclusive Process',
            eccEnabled: true,
            cudaCores: 16896,
            tensorCores: 528,
            rtCores: 0,
            vramType: 'HBM3',
            pcieLanes: 16,
            pcieGen: 5,
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: '96.00.8B.00.02',
            serialNumber: 'H100-1234567891',
            processes: [
                { pid: 23456, name: 'python', memoryUsage: 60000 },
                { pid: 23457, name: 'tensorflow', memoryUsage: 14000 }
            ],
            lastSeen: '2025-10-03 14:32:18'
        },
        {
            id: 'gpu-h100-003',
            name: 'GPU-H100-003',
            model: 'H100 PCIe',
            vendor: 'NVIDIA',
            architecture: 'Hopper',
            busId: '0000:47:00.0',
            hostName: 'ml-compute-05.datacenter.local',
            status: 'warning',
            utilization: 12,
            memoryUsed: 8,
            memoryTotal: 80,
            temperature: 82,
            powerDraw: 95,
            powerLimit: 350,
            clockSpeed: 1200,
            clockSpeedMax: 1980,
            fanSpeed: 85,
            computeMode: 'Default',
            eccEnabled: true,
            cudaCores: 16896,
            tensorCores: 528,
            rtCores: 0,
            vramType: 'HBM3',
            pcieLanes: 16,
            pcieGen: 5,
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: '96.00.8A.00.01',
            serialNumber: 'H100-1234567892',
            processes: [],
            lastSeen: '2025-10-03 14:32:20'
        },
        // NVIDIA RTX 6000 Ada GPUs
        {
            id: 'gpu-rtx6000-001',
            name: 'GPU-RTX6000-001',
            model: 'RTX 6000 Ada Generation',
            vendor: 'NVIDIA',
            architecture: 'Ada Lovelace',
            busId: '0000:65:00.0',
            hostName: 'workstation-01.datacenter.local',
            status: 'operational',
            utilization: 65,
            memoryUsed: 36,
            memoryTotal: 48,
            temperature: 68,
            powerDraw: 245,
            powerLimit: 300,
            clockSpeed: 2355,
            clockSpeedMax: 2505,
            fanSpeed: 58,
            computeMode: 'Default',
            eccEnabled: true,
            cudaCores: 18176,
            tensorCores: 568,
            rtCores: 142,
            vramType: 'GDDR6',
            pcieLanes: 16,
            pcieGen: 4,
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: '95.02.5C.00.F2',
            serialNumber: 'RTX6K-2234567890',
            processes: [
                { pid: 34567, name: 'blender', memoryUsage: 28000 },
                { pid: 34568, name: 'resolve', memoryUsage: 8000 }
            ],
            lastSeen: '2025-10-03 14:32:12'
        },
        {
            id: 'gpu-rtx6000-002',
            name: 'GPU-RTX6000-002',
            model: 'RTX 6000 Ada Generation',
            vendor: 'NVIDIA',
            architecture: 'Ada Lovelace',
            busId: '0000:CA:00.0',
            hostName: 'render-node-03.datacenter.local',
            status: 'operational',
            utilization: 78,
            memoryUsed: 42,
            memoryTotal: 48,
            temperature: 71,
            powerDraw: 268,
            powerLimit: 300,
            clockSpeed: 2430,
            clockSpeedMax: 2505,
            fanSpeed: 64,
            computeMode: 'Default',
            eccEnabled: true,
            cudaCores: 18176,
            tensorCores: 568,
            rtCores: 142,
            vramType: 'GDDR6',
            pcieLanes: 16,
            pcieGen: 4,
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: '95.02.5C.00.F2',
            serialNumber: 'RTX6K-2234567891',
            processes: [
                { pid: 45678, name: 'maya', memoryUsage: 32000 },
                { pid: 45679, name: 'arnold', memoryUsage: 10000 }
            ],
            lastSeen: '2025-10-03 14:32:14'
        },
        {
            id: 'gpu-rtx6000-003',
            name: 'GPU-RTX6000-003',
            model: 'RTX 6000 Ada Generation',
            vendor: 'NVIDIA',
            architecture: 'Ada Lovelace',
            busId: '0000:3B:00.0',
            hostName: 'workstation-07.datacenter.local',
            status: 'operational',
            utilization: 34,
            memoryUsed: 18,
            memoryTotal: 48,
            temperature: 58,
            powerDraw: 145,
            powerLimit: 300,
            clockSpeed: 1950,
            clockSpeedMax: 2505,
            fanSpeed: 42,
            computeMode: 'Default',
            eccEnabled: true,
            cudaCores: 18176,
            tensorCores: 568,
            rtCores: 142,
            vramType: 'GDDR6',
            pcieLanes: 16,
            pcieGen: 4,
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: '95.02.5C.00.F2',
            serialNumber: 'RTX6K-2234567892',
            processes: [
                { pid: 56789, name: 'unreal', memoryUsage: 15000 }
            ],
            lastSeen: '2025-10-03 14:32:16'
        },
        // NVIDIA RTX 5900 GPUs (fictional model for demo)
        {
            id: 'gpu-rtx5900-001',
            name: 'GPU-RTX5900-001',
            model: 'RTX 5900',
            vendor: 'NVIDIA',
            architecture: 'Ada Lovelace',
            busId: '0000:18:00.0',
            hostName: 'dev-workstation-01.datacenter.local',
            status: 'operational',
            utilization: 45,
            memoryUsed: 14,
            memoryTotal: 24,
            temperature: 62,
            powerDraw: 178,
            powerLimit: 250,
            clockSpeed: 2210,
            clockSpeedMax: 2580,
            fanSpeed: 52,
            computeMode: 'Default',
            eccEnabled: false,
            cudaCores: 10240,
            tensorCores: 320,
            rtCores: 80,
            vramType: 'GDDR6X',
            pcieLanes: 16,
            pcieGen: 4,
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: '95.02.3A.00.B1',
            serialNumber: 'RTX59-3234567890',
            processes: [
                { pid: 67890, name: 'vscode', memoryUsage: 2000 },
                { pid: 67891, name: 'chrome', memoryUsage: 12000 }
            ],
            lastSeen: '2025-10-03 14:32:10'
        },
        {
            id: 'gpu-rtx5900-002',
            name: 'GPU-RTX5900-002',
            model: 'RTX 5900',
            vendor: 'NVIDIA',
            architecture: 'Ada Lovelace',
            busId: '0000:86:00.0',
            hostName: 'dev-workstation-02.datacenter.local',
            status: 'operational',
            utilization: 58,
            memoryUsed: 19,
            memoryTotal: 24,
            temperature: 67,
            powerDraw: 205,
            powerLimit: 250,
            clockSpeed: 2385,
            clockSpeedMax: 2580,
            fanSpeed: 60,
            computeMode: 'Default',
            eccEnabled: false,
            cudaCores: 10240,
            tensorCores: 320,
            rtCores: 80,
            vramType: 'GDDR6X',
            pcieLanes: 16,
            pcieGen: 4,
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: '95.02.3A.00.B1',
            serialNumber: 'RTX59-3234567891',
            processes: [
                { pid: 78901, name: 'jupyter', memoryUsage: 16000 },
                { pid: 78902, name: 'python', memoryUsage: 3000 }
            ],
            lastSeen: '2025-10-03 14:32:22'
        },
        {
            id: 'gpu-rtx5900-003',
            name: 'GPU-RTX5900-003',
            model: 'RTX 5900',
            vendor: 'NVIDIA',
            architecture: 'Ada Lovelace',
            busId: '0000:5E:00.0',
            hostName: 'gaming-server-01.datacenter.local',
            status: 'critical',
            utilization: 0,
            memoryUsed: 0,
            memoryTotal: 24,
            temperature: 95,
            powerDraw: 0,
            powerLimit: 250,
            clockSpeed: 0,
            clockSpeedMax: 2580,
            fanSpeed: 100,
            computeMode: 'Default',
            eccEnabled: false,
            cudaCores: 10240,
            tensorCores: 320,
            rtCores: 80,
            vramType: 'GDDR6X',
            pcieLanes: 16,
            pcieGen: 4,
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: '95.02.3A.00.B1',
            serialNumber: 'RTX59-3234567892',
            processes: [],
            lastSeen: '2025-10-03 14:20:45'
        },
        {
            id: 'gpu-rtx5900-004',
            name: 'GPU-RTX5900-004',
            model: 'RTX 5900',
            vendor: 'NVIDIA',
            architecture: 'Ada Lovelace',
            busId: '0000:AF:00.0',
            hostName: 'test-bench-04.datacenter.local',
            status: 'operational',
            utilization: 22,
            memoryUsed: 6,
            memoryTotal: 24,
            temperature: 54,
            powerDraw: 85,
            powerLimit: 250,
            clockSpeed: 1680,
            clockSpeedMax: 2580,
            fanSpeed: 35,
            computeMode: 'Default',
            eccEnabled: false,
            cudaCores: 10240,
            tensorCores: 320,
            rtCores: 80,
            vramType: 'GDDR6X',
            pcieLanes: 16,
            pcieGen: 4,
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: '95.02.3A.00.B1',
            serialNumber: 'RTX59-3234567893',
            processes: [
                { pid: 89012, name: 'tests', memoryUsage: 5500 }
            ],
            lastSeen: '2025-10-03 14:32:25'
        }
    ];

    // Generate additional GPUs to enable pagination (need 15+ for paging)
    const additionalGPUs = [];
    const models = ['H100 PCIe', 'H100 SXM5', 'RTX 6000 Ada Generation', 'RTX 5900', 'A100 PCIe', 'A100 SXM4'];
    const architectures = ['Hopper', 'Ada Lovelace', 'Ampere'];
    const statuses = ['operational', 'operational', 'operational', 'operational', 'warning', 'critical'];
    const hosts = [
        'ai-server', 'ml-compute', 'render-node', 'workstation', 'gaming-server',
        'dev-workstation', 'test-bench', 'training-cluster', 'inference-node', 'hpc-node'
    ];

    for (let i = 11; i <= 50; i++) {
        const model = models[i % models.length];
        const status = statuses[i % statuses.length];
        const host = hosts[i % hosts.length];
        const isH100 = model.includes('H100');
        const isRTX6000 = model.includes('RTX 6000');
        const isA100 = model.includes('A100');

        const memoryTotal = isH100 ? 80 : (isA100 ? 80 : (isRTX6000 ? 48 : 24));
        const powerLimit = isH100 ? (model.includes('SXM') ? 700 : 350) : (isA100 ? (model.includes('SXM') ? 500 : 300) : (isRTX6000 ? 300 : 250));
        const cudaCores = isH100 ? 16896 : (isA100 ? 6912 : (isRTX6000 ? 18176 : 10240));
        const tensorCores = isH100 ? 528 : (isA100 ? 432 : (isRTX6000 ? 568 : 320));
        const rtCores = isH100 || isA100 ? 0 : (isRTX6000 ? 142 : 80);
        const vramType = isH100 ? 'HBM3' : (isA100 ? 'HBM2e' : (isRTX6000 ? 'GDDR6' : 'GDDR6X'));
        const arch = isH100 ? 'Hopper' : (isA100 ? 'Ampere' : 'Ada Lovelace');

        const utilization = status === 'operational' ? Math.floor(Math.random() * 50) + 30 : (status === 'warning' ? Math.floor(Math.random() * 20) + 10 : 0);
        const memoryUsed = status === 'operational' ? Math.floor(Math.random() * 40) + 20 : (status === 'warning' ? Math.floor(Math.random() * 15) + 5 : 0);
        const temperature = status === 'operational' ? Math.floor(Math.random() * 20) + 55 : (status === 'warning' ? Math.floor(Math.random() * 15) + 75 : Math.floor(Math.random() * 10) + 85);
        const powerDraw = status === 'operational' ? Math.floor(powerLimit * 0.6) + Math.floor(Math.random() * powerLimit * 0.2) : (status === 'warning' ? Math.floor(powerLimit * 0.3) : 0);

        const processes = status === 'operational' ? [
            { pid: 10000 + i * 100, name: ['python', 'pytorch', 'tensorflow', 'jupyter'][i % 4], memoryUsage: Math.floor(Math.random() * 30000) + 10000 },
            { pid: 10000 + i * 100 + 1, name: ['cuda-app', 'blender', 'maya', 'resolve'][i % 4], memoryUsage: Math.floor(Math.random() * 20000) + 5000 }
        ] : [];

        additionalGPUs.push({
            id: `gpu-${model.toLowerCase().replace(/\s+/g, '-')}-${String(i).padStart(3, '0')}`,
            name: `GPU-${model.split(' ')[0]}-${String(i).padStart(3, '0')}`,
            model: model,
            vendor: 'NVIDIA',
            architecture: arch,
            busId: `0000:${(i + 16).toString(16).toUpperCase()}:00.0`,
            hostName: `${host}-${String(Math.floor(i / 2) + 1).padStart(2, '0')}.datacenter.local`,
            status: status,
            utilization: utilization,
            memoryUsed: memoryUsed,
            memoryTotal: memoryTotal,
            temperature: temperature,
            powerDraw: powerDraw,
            powerLimit: powerLimit,
            clockSpeed: isH100 ? (1500 + Math.floor(Math.random() * 300)) : (isA100 ? (1200 + Math.floor(Math.random() * 300)) : (1800 + Math.floor(Math.random() * 500))),
            clockSpeedMax: isH100 ? 1980 : (isA100 ? 1410 : (isRTX6000 ? 2505 : 2580)),
            fanSpeed: Math.floor(temperature * 0.8) + Math.floor(Math.random() * 10),
            computeMode: i % 3 === 0 ? 'Exclusive Process' : 'Default',
            eccEnabled: isH100 || isA100 || isRTX6000,
            cudaCores: cudaCores,
            tensorCores: tensorCores,
            rtCores: rtCores,
            vramType: vramType,
            pcieLanes: 16,
            pcieGen: isH100 ? 5 : (isA100 ? 4 : 4),
            driverVersion: '535.104.05',
            cudaVersion: '12.2',
            vbios: `${Math.floor(Math.random() * 100)}.00.${(i % 10)}.00.0${i % 10}`,
            serialNumber: `${model.split(' ')[0]}-${String(1234567890 + i).substring(0, 10)}`,
            processes: processes,
            lastSeen: status === 'critical' ? `2025-10-03 ${String(13 + Math.floor(Math.random() * 2)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : `2025-10-03 14:${String(30 + Math.floor(Math.random() * 30)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
        });
    }

    return [...baseData, ...additionalGPUs];
}
