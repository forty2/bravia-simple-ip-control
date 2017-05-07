"use strict";

import { EventEmitter } from 'events';
import { nextTick } from 'process';

import { Client } from 'node-ssdp';
import short_uuid from 'short-uuid';

import BraviaTv from './Device';

const DEFAULT_SCAN_INTERVAL = 10000,
      MISSING_THRESHOLD     = 3,
      SEARCH_SERVICE        = "urn:schemas-sony-com:service:ScalarWebAPI:1";

const debug = require('debug')('bravia-remote:discovery');

debug('starting up');

const $private = Symbol();

class BraviaDiscovery extends EventEmitter {
    constructor() {
        super();

        this[$private] = {
            registry: { }
        }
    }

    /**
     * Process one discovered device.  This will handle
     * tracking of devices in case they eventually disappear,
     * and in the case of a previously unknown device will
     * emit a "founddevice" event.
     * @private
     * @param {Object} opts
     * @param {string} opts.name - The advertised name of the new device
     * @param {string} opts.id   - The MAC address of the new device
     * @param {string} opts.type - The type of the new device, such as `FAN,HAIKU,HSERIES`
     * @param {string} opts.ip   - The IP address of the new device
     * @emits BraviaDiscovery#founddevice
     */
    _handleDeviceFound({ ip, id }) {
        const {
            registry
        } = this[$private];

        debug(`Found device: ${ip} ${id}`);

        let lastseen = Date.now();
        if (registry[id]) {
            registry[id].lastseen = lastseen;
        }
        else {
            const device = new BraviaTv(ip, id);
            registry[id] = {
                lastseen,
                device 
            }

            debug(`emitting device: ${device.id}`);
            this.emit('founddevice', device);
        }
    }

    /**
     * Get a list of all currently known devices.
     * @returns {Array<BraviaTv>}
     */
    getAllDevices() {
        const {
            registry
        } = this[$private];
        return Object.keys(registry).map(k => registry[k].device);
    }

    /**
     * Get one discovered device by its ID (usually MAC address).
     * @param {string} id - The ID of the requested device.
     * @returns {Device}
     */
    getDeviceById(id) {
        const {
            registry
        } = this[$private];

        if (id in registry) {
            return registry[id].device;
        }
        return undefined;
    }

    discover(interval = DEFAULT_SCAN_INTERVAL, missingThreshold = MISSING_THRESHOLD) {
        const { registry } = this[$private];

        const ssdp = this[$private].ssdp = new Client();
        ssdp
            .on('response', (headers, status, remoteInfo) => {
                if (headers['ST'] === SEARCH_SERVICE) {
                    let id, match;
                    if (match = headers['USN'].match(/uuid:([^:]+)/)) {
                        id = short_uuid().fromUUID(match[1]);
                    }

                    this._handleDeviceFound({ ip: remoteInfo.address, id });
                }
            })

        const discover = () => {
            ssdp.search(SEARCH_SERVICE);
            nextTick(() => {
                Object.keys(registry)
                    .filter(x => (registry[x].lastseen + (missingThreshold * interval))< Date.now())
                    .forEach(x => {
                        let dev = registry[x];
                        delete registry[x];
                        this.emit('lostdevice', dev.device);
                    })
            });
        };

        setTimeout(() => {
            discover();
            this._discoveryInterval = setInterval(discover, interval);
        }, 100);
    }

    /**
     * Cancel an ongoing discovery session.
     */
    cancelDiscovery() {
        clearInterval(this._discoveryInterval);
        this._discoveryInterval = undefined;
        debug("Discovery cancelled");

        this[$private].ssdp.stop();
        delete this[$private].ssdp;
    }
}

let single = new BraviaDiscovery();
export {
    single as default
}
