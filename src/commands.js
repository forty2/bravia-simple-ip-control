import { repeat, padLeft, padRight } from './lib/utils/string'

import Observable from './lib/observable';

import { method as filter } from './lib/observable/filter';
import { method as take } from './lib/observable/take';
import { method as map } from './lib/observable/map';

const MessageType = {
    Control:      "C",
    Enquiry:      "E",
    Answer:       "A",
    Notification: "N"
}

const HEADER                = "*S";
const FOOTER                = "\n";
const NO_PARAMETER          = "#"::repeat(16);

const SUCCESS               = "0"::repeat(16);
const GENERIC_FAILURE       = "F"::repeat(16);
const NO_SUCH_THING_FAILURE = "N"::repeat(16);

const POWER_OFF             = "0"::repeat(16);
const POWER_ON              = "0"::repeat(15) + "1";

function NOOP() { }
function IDENTITY(x) { return x; }

function isTrue(value) {
    if (typeof(value) == 'string'){
        value = value.toLowerCase();
    }
    switch(value) {
        case true:
        case "true":
        case 1:
        case "1":
        case "on":
        case "yes":
            return true;
        default:
            return false;
    }
}

function getSender(ctx, outgoingMessage, fourCC, returnMapper) {
    const self = ctx;
    return new Observable(
        observer => {
            let isClosed = false;
            try {
                !isClosed && self._socket.send(outgoingMessage);
                Observable
                    .from(
                        self
                            ._socket
                    )
                    ::take(1)
                    ::map(msg => msg.match(`\\${HEADER}([AN])([A-Z]{4})(.{16})\n`))
                    ::filter(x => x && x.length)
                    ::filter(([ , type, inFourCC, param ]) =>
                        type === 'A' && inFourCC === fourCC
                    )
                    ::map(x => x.pop())
                    .subscribe(
                        x => {
                            if (x === GENERIC_FAILURE) {
                                !isClosed && observer.error(new Error("Something went wrong"));
                            }
                            else if (x === NO_SUCH_THING_FAILURE) {
                                !isClosed && observer.error(new Error(`Couldn't set value to ${value}; there's no such thing`));
                            }
                            else if (!isClosed) {
                                if (returnMapper) {
                                    observer.next(returnMapper.to(x));
                                }
                                observer.complete()
                            }
                        }
                    )
            }
            catch (e) {
                observer.error(e);
            }

            return {
                unsubscribe() {
                    isClosed = true;
                },
                get closed() {
                    return isClosed;
                }
            }
        }
    );
}

function getSetter(ctx, mapper, fourCC) {
    return function(value) {
        let outgoingMessage = `${HEADER}${MessageType.Control}${fourCC}${mapper.from(value)}\n`;
        return getSender(ctx, outgoingMessage, fourCC);
    }
}

function getToggler(ctx, fourCC) {
    return function(value) {
        let outgoingMessage = `${HEADER}${MessageType.Control}${fourCC}${NO_PARAMETER}\n`;
        return getSender(ctx, outgoingMessage, fourCC);
    }
}

function getGetter(ctx, fourCC, mapper) {
    return function(param) {
        if (typeof param !== 'undefined') {
            param = mapper.from(param);
        }
        else {
            param = NO_PARAMETER
        }

        let outgoingMessage = `${HEADER}${MessageType.Enquiry}${fourCC}${param}\n`;
        return getSender(ctx, outgoingMessage, fourCC, mapper);
    }
}

const InputType = {
    tv:        0,
    hdmi:      1,
    scart:     2,
    composite: 3,
    component: 4,
    mirroring: 5,
    'pc-rgb':  6
}

const InputSource = {
    dvbt:    "dvbt",
    dvbc:    "dvbc",
    dvbs:    "dvbs",
    isdbt:   "isdbt",
    isdbbs:  "isdbbs",
    isdbcs:  "isdbcs",
    antenna: "antenna",
    cable:   "cable",
    isdbgt:  "isdbgt"
};

const SceneSetting = {
    auto:        "auto",
    auto24pSync: "auto24pSync",
    general:     "general"
}

const mappers = {
    boolean: {
        from(bool) {
            return isTrue(bool) ? POWER_ON : POWER_OFF;

        },
        to(msg) {
            return msg === POWER_ON
                        ? true
                        : false
        }
    },

    numeric: {
        from(num) {
            return num.toString(10)::padLeft(16, '0');
        },
        to(msg) {
            return parseInt(msg, 10);
        }
    },

    network: {
        from(name) {
            return name::padRight(16, '#')
        },
        to(msg) {
            return msg.replace(/#*$/, '');
        }
    }
}

const commands = {
    "IRCC": {
        "kind": "function",
        "type": "custom",
        "name": "sendIrCode",
        "impl": (ctx) => getSetter(ctx, { from: code => commands.annotatedIrcodes[code] }, 'IRCC')
    },

    "POWR": { // done
        "kind": "property",
        "type": "boolean",
        "name": "isOn"
    },

    "TPOW": {
        "kind": "toggle",
        "name": "isOn"
    },

    "VOLU": {
        "kind": "property",
        "type": "numeric",
        "name": "volume"
    },

    "AMUT": {
        "kind": "property",
        "type": "boolean",
        "name": "isMuted"
    },

    "CHNN": {
        "kind": "property",
        "type": "custom",
        "name": "channel",
        "mapper": {
            from(ch) {
                const [ channel, subchannel ] = ch.split(/[\.-]/)
                return channel.toString()::padLeft(8, '0') + '.' +
                        subchannel::padRight(7, '0');
            },
            to(msg) {
                let [channel, subchannel] = msg.split('.');
                channel = parseInt(channel, 10);
                subchannel = parseInt(subchannel.replace(/8*$/, ''), 10);

                return { channel, subchannel };
            }
        }
    },

    "TCHN": {
        "kind": "property",
        "type": "custom",
        "name": "tripletChannel",
        "mapper": {
            from(channel) {
                return channel
                    .split('.')
                    .map(x => x.toString(16)::padLeft(4, '0'))
                    .join('')
                    ::padRight(16, '#');
            },
            to(msg) {
                let hexdigit = '[0-9A-Fa-f]'
                let regex = `^(${hexdigit}{4})(${hexdigit}{4})(${hexdigit}{4})####$`

                let [, ...parts] = msg.match(regex);
                return parts.map(x => parseInt(x, 16)).join('.');
            }
        }
    },

    "ISRC": {
        "kind": "property",
        "type": "custom",
        "name": "inputSource",
        "mapper": {
            from(source) {
                return source::padRight(16, '#');
            },
            to(msg) {
                return InputSource[msg.replace(/#*$/, '')];
            }
        }
    },

    "INPT": {
        "kind": "property",
        "type": "custom",
        "name": "input",
        "mapper": {
            from(input) {
                if (input === 'tv') {
                    return '0'::repeat(16);
                }

                let types =
                    Object.keys(InputType)
                        .filter(x => x !== 'tv')
                        .join('|')
                let regex = `(${types})(\\d{1,4})`;

                let [, type, number] = input.match(regex);
                return InputType[type].toString(10)::padLeft(8, '0') +
                            number.toString(10)::padLeft(8, '0')
            },
            to(msg) {
                let type = parseInt(msg.substr(0, 8), 10);
                let num  = parseInt(msg.substr(8, 8), 10);

                return Object.keys(InputType)
                            .filter(x => InputType[x] === type)[0]
                            + num
            }
        }
    },

    "PMUT": {
        "kind": "property",
        "type": "boolean",
        "name": "isPictureMuted"
    },

    "TPMU": {
        "kind": "toggle",
        "name": "isPictureMuted"
    },

    "PIPI": {
        "kind": "property",
        "type": "boolean",
        "name": "isPipEnabled"
    },

    "TPIP": {
        "kind": "toggle",
        "name": "isPipEnabled"
    },

    "TPPP": {
        "kind": "toggle",
        "name": "pipPosition"
    },

    "BADR": {
        "kind": "readonly",
        "type": "network",
        "name": "broadcastAddress"
    },

    "MADR": {
        "kind": "readonly",
        "type": "network",
        "name": "macAddress"
    },

    "SCEN": {
        "kind": "property",
        "type": "custom",
        "name": "sceneSetting",
        "mapper": {
            from(scene) {
                return scene::padRight(16, '#');
            },
            to(msg) {
                return SceneSetting[msg.replace(/#*$/, '')];
            }
        }
    },

    "events": {
        "POWR": "power-changed",
        "VOLU": "volume-changed",
        "AMUT": "mute-changed",
        "CHNN": "channel-changed",
        "INPT": "input-changed",
        "PMUT": "piture-mute-changed",
        "PIPI": "pip-changed"
    },

    "ircodes": [
        "power_off",
        "input",
        "gguide",
        "epg",
        "favorites",
        "display",
        "home",
        "options",
        "return",
        "up",
        "down",
        "right",
        "left",
        "confirm",
        "red",
        "green",
        "yellow",
        "blue",
        "num1",
        "num2",
        "num3",
        "num4",
        "num5",
        "num6",
        "num7",
        "num8",
        "num9",
        "num0",
        "num11",
        "num12",
        "volume_up",
        "volume_down",
        "mute",
        "channel_up",
        "channel_down",
        "subtitle",
        "closed_caption",
        "enter",
        "dot",
        "analog",
        "teletext",
        "exit",
        "analog",
        "*ad",
        "digital",
        "analog?",
        "bs",
        "cs",
        "bs-cs",
        "ddata",
        "pic_off",
        "tv_radio",
        "theater",
        "sen",
        "internet_widgets",
        "internet_video",
        "netflix",
        "scene_select",
        "mode3d",
        "imanual",
        "audio",
        "wide",
        "jump",
        "pap",
        "myepg",
        "program_description",
        "write_chapter",
        "trackid",
        "ten_key",
        "applicast",
        "actvila",
        "delete_video",
        "photo_frame",
        "tv_pause",
        "key_pad",
        "media",
        "sync_menu",
        "forward",
        "play",
        "rewind",
        "previous",
        "stop",
        "next",
        "record",
        "pause",
        "eject",
        "flash_plus",
        "flash_minus",
        "top_menu",
        "popup_menu",
        "rakuraku_start",
        "one_touch_time_rec",
        "one_touch_view",
        "one_touch_rec",
        "one_touch_stop",
        "discovery",
        "football_mode",
        "social",
        "tv_power",
        "media_audio_track",
        "tv",
        "tv_input",
        "tv_antenna_cable",
        "wake_up",
        "sleep",
        "sleep_timer",
        "tv_analog",
        "video_1",
        "video_2",
        "analog_rgb_1",
        "picture_mode",
        "component_1",
        "component_2",
        "dpad_center",
        "cursor_up",
        "cursor_down",
        "cursor_left",
        "cursor_right",
        "shop_remote_control_forced_dynamic",
        "demo_mode",
        "digital_toggle",
        "demo_surround",
        "audio_mix_up",
        "audio_mix_down",
        "hdmi_1",
        "hdmi_2",
        "hdmi_3",
        "hdmi_4",
        "assists",
        "action_menu",
        "help",
        "tv_satellite",
        "wireless_subwoofer"
    ]
}

function annotateIrcodes() {
    commands.annotatedIrcodes = {};
    commands.ircodes
        .forEach((x, idx) => {
            commands.annotatedIrcodes[x] = idx.toString(10)::padLeft(16, '0');
        });
}

function getDescriptorsForFourCC(ctx, fourCC) {
    const { kind, type, mapper: customMapper, name, impl } = commands[fourCC];
    let mapper = customMapper || mappers[type] || { from: IDENTITY, to: IDENTITY };

    if (kind === 'function') {
        return {
            name,
            desc: {
                enumerable: true,
                value: impl(ctx)
            }
        };
    } else if (kind ==='property') {
        return [{
            name,
            desc: {
                enumerable: true,
                value: { }
            }
        }, {
            path: name,
            name: 'get',
            desc: {
                enumerable: true,
                value: getGetter(ctx, fourCC, mapper)
            }
        }, {
            path: name,
            name: 'set',
            desc: {
                enumerable: true,
                value: getSetter(ctx, mapper, fourCC)
            }
        }]
    } else if (kind === 'readonly') {
        return [{
            name,
            desc: {
                enumerable: true,
                value: { }
            }
        }, {
            path: name,
            name: 'get',
            desc: {
                enumerable: true,
                value: getGetter(ctx, fourCC, mapper)
            }
        }]
    } else if (kind === 'toggle') {
        return [{
            name,
            desc: {
                enumerable: true,
                value: { }
            }
        }, {
            path: name,
            name: 'toggle',
            desc: {
                enumerable: true,
                value: getToggler(ctx, fourCC)
            }
        }]
    }
}

function getPropertyDescriptors(ctx) {
    return Object.keys(commands)
        .filter(x => x.length == 4 && x.toUpperCase() === x)
        .map(x => getDescriptorsForFourCC(ctx, x))
        .reduce((acc, x) => acc.concat(x), [])
        ;
}

function getEventStream() {
    return Observable
        .from(
            this
                ._socket
        )
        ::map(msg => msg.match(`\\${HEADER}([AN])([A-Z]{4})(.{16})\n`))
        ::filter(x => x && x.length)
        ::filter(([, type ]) => type === 'N')
        ::map(([,, fourCC, payload]) => {
            let info = commands[fourCC];
            let mapper = (info.mapper || mappers[info.type] || { to: IDENTITY }).to

            return { payload, mapper, name: commands.events[fourCC] };
        })
}

annotateIrcodes();

export {
    getPropertyDescriptors,
    getEventStream,
    InputType,
    InputSource,
    SceneSetting,
}
