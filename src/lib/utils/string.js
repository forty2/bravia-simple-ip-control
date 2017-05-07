function padLeft(n, pad = ' ') {
    if (String.prototype.padLeft) {
        return this.padLeft(...arguments);
    }
    return (pad.repeat(n) + this).slice(-Math.max(this.length, n));
}

function padRight(n, pad = " ") {
    if (String.prototype.padRight) {
        return this.padRight(...arguments);
    }
    return this + Array(n - this.length + 1).join(pad);
}

function repeat(count) {
    'use strict';

    if (String.prototype.repeat)
        return this.repeat(...arguments);

    if (this == null) {
        throw new TypeError('can\'t convert ' + this + ' to object');
    }
    var str = '' + this;
    count = +count;
    if (count != count) {
        count = 0;
    }
    if (count < 0) {
        throw new RangeError('repeat count must be non-negative');
    }
    if (count == Infinity) {
        throw new RangeError('repeat count must be less than infinity');
    }
    count = Math.floor(count);
    if (str.length == 0 || count == 0) {
        return '';
    }
    // Ensuring count is a 31-bit integer allows us to heavily optimize the
    // main part. But anyway, most current (August 2014) browsers can't handle
    // strings 1 << 28 chars or longer, so:
    if (str.length * count >= 1 << 28) {
        throw new RangeError('repeat count must not overflow maximum string size');
    }
    var rpt = '';
    for (;;) {
        if ((count & 1) == 1) {
            rpt += str;
        }
        count >>>= 1;
        if (count == 0) {
            break;
        }
        str += str;
    }
    // Could we try:
    // return Array(count + 1).join(this);
    return rpt;
}

export {
    padLeft,
    padRight,
    repeat
}
