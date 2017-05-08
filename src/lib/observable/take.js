import Observable from './index';

const debug = require('debug')('bravia-remote:take');

class TakeObserver {
    constructor(subscriber, n) {
        debug('creating a takeobserver');

        this.subscriber = subscriber;
        this.n = n;
        this.count = 0;
        debug (`taking ${n}`);
    }

    next(item) {
        if (this.subscriber.closed) {
            debug("subscriber is closed, returning");
            return
        }

        ++this.count;
        if (this.count <= this.n) {
            debug(`Emitting ${this.count}`);
            this.subscriber.next(item);

            if (this.count === this.n) {
                debug("count reached; completing");
                this.complete();
            }
        }
    }

    error() {
        this.subscriber.error(...arguments);
    }

    complete() {
        debug("completing");
        this.subscriber.complete(...arguments);
    }
}

function takeObservable(observable, n) {
    return new Observable(
        subscriber =>
            observable
                .subscribe(new TakeObserver(subscriber, n))
    );
}

function method(n) {
    return takeObservable(this, n);
}

export {
    takeObservable as default,
    method
}
