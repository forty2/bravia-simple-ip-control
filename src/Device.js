import { EventEmitter } from 'events';

import MessageSocket from 'message-socket';

import { getPropertyDescriptors, getEventStream } from './commands';

class BraviaTv extends EventEmitter {
    constructor(host, id) {
        super();

        Object.defineProperty(
            this, '_socket', {
                value: new MessageSocket(host, 20060, /[\x00-\xFF]{24}/)
            }
        );

        Object.defineProperty(
            this, 'id', {
                value: id,
                writable: false
            }
        );

        getPropertyDescriptors(this)
            .forEach(({ name, desc, path }) => {
                let obj = this;
                if (path && this.hasOwnProperty(path)) {
                    obj = this[path];
                }

                if (!obj.hasOwnProperty(name)) {
                    Object.defineProperty(obj, name, desc);
                }
            });

        this::getEventStream()
            .subscribe(
                ({ mapper, name, payload }) => {
                    this.emit(name, mapper(payload))
                }
            );
    }

    /**
     * Disconnect from the device.
     */
    disconnect() {
      this._socket.close();
      this._socket = undefined;
    }
}

export { InputType, InputSource, SceneSetting } from './commands';
export {
    BraviaTv as default
}
