/**
 * Mobile System Module Registry
 * Registers the system sub-module (health, security) with Layer8MModuleRegistry
 * so the mobile nav resolves L8Health/L8User/L8Role/L8Credentials/L8Portal
 * columns and forms (EventRecord resolves through MobileALM).
 */
Layer8MModuleRegistry.create('MobileSystemRegistry', {
    'System': MobileSystem
});
