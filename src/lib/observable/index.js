import $$observable from 'symbol-observable';

function NOOP() { }

class Observable {
    constructor(subfunction) {
        this._sub = subfunction;
    }

    [$$observable]() { return this }

    static from(other) {
        if (other[$$observable]) {
            return other[$$observable]();
        }
        return null;
    }

    subscribe(observerOrOnNext = NOOP, error = NOOP, complete = NOOP) {
        let observer = observerOrOnNext;
        if (typeof observerOrOnNext === 'function') {
            observer = {
                next: observerOrOnNext,
                error, complete
            }
        }

        return this._sub(observer);
    }
}

export {
    Observable as default
}
