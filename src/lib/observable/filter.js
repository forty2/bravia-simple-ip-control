import Observable from './index';

class FilterObserver {
    constructor(subscriber, predicate) {
        this.subscriber = subscriber;
        this.predicate = predicate;
    }

    next(item) {
        if (this.subscriber.closed) {
            return
        }

        try {
            let match = this.predicate(item);
            if (match) {
                this.subscriber.next(item);
            }
        }
        catch(e) {
            this.subscriber.error(e);
        }
    }

    error() {
        this.subscriber.error(...arguments);
    }

    complete() {
        this.subscriber.complete(...arguments);
    }
}

function filterObservable(observable, predicate) {
    return new Observable(
        subscriber =>
            observable
                .subscribe(new FilterObserver(subscriber, predicate))
    );
}

function method(predicate) {
    return filterObservable(this, predicate);
}

export {
    filterObservable as default,
    method
}
