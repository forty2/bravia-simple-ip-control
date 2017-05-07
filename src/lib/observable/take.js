import Observable from './index';

class TakeObserver {
    constructor(subscriber, n) {
        this.subscriber = subscriber;
        this.n = n;
        this.count = 0;
    }

    next(item) {
        if (this.subscriber.closed) {
            return
        }

        ++this.count;
        if (this.count <= this.n) {
            this.subscriber.next(item);

            if (this.count === this.n) {
                this.complete();
            }
        }
    }

    error() {
        this.subscriber.error(...arguments);
    }

    complete() {
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
