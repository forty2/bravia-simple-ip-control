import BraviaDiscovery from './index';

BraviaDiscovery
    .on('founddevice', ( device ) => {
        console.log(`Found a device: ${device.id}`);
    })
    .on('lostdevice', ( device ) => {
        console.log(`Lost a device: ${device.id}`);
    })
    .discover();
