# bravia-simple-ip-control
> Control your Sony Bravia TV over the network

[![NPM Version][npm-image]][npm-url]
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

`bravia-simple-ip-control` is a Node.js library that allows you to control your Sony Bravia TV over your local network.  It's especially useful for integrating into a home automation system.

## Getting Started

`bravia-simple-ip-control` is distributed through NPM:

```sh
npm install bravia-simple-ip-control

# or, if you prefer:
yarn add bravia-simple-ip-control
```

## Examples

`bravia-simple-ip-control` provides both discovery and control capabilities. To monitor the local network for Bravia TVs, try something like this:
```javascript
import BraviaDiscovery from 'bravia-simple-ip-control';

BraviaDiscovery
    .on('founddevice', (device) => {
        console.log(`Found a device: ${device.id}`);
    })
    .on('lostdevice', (device) => {
        console.log(`Lost a device: ${device.id}`);
    })
    .discover();
```

Once you have a device object, you have a number of control commands at your disposal:

### Commands

#### sendIrCode

Send an IR code to the TV.  See the protocol document for a full list of available IR code names.

#### isOn.get()
#### isOn.set(value)
#### isOn.toggle()

Get, set, or toggle the power state of the TV.

#### volume.get()
#### volume.set(value)

Get or set the current volume level.

#### isMuted.get()
#### isMuted.set(value)

Get or set the mute status.

#### channel.get()
#### channel.set(value)

Get or set the current channel.

#### tripletChannel.get()
#### tripletChannel.set(value)

Get or set the current "triplet" channel.  (I don't currently know what a "triplet" channel is.  See the protocol document if you want to try to figure it out.)

#### inputSource.get()
#### inputSource.set(value)

Get or set the current input source (antenna, cable, etc).  See the protocol document for a full list.

#### input.get()
#### input.set(value)

Get or set the current input (HDMI, component, etc). Value is one of:
 * tv
 * hdmi
 * scart
 * composite
 * component
 * mirroring
 * pc-rgb

 followed by a number 1-9999 (for any of the options except tv).

#### isPictureMuted.get()
#### isPictureMuted.set(value)
#### isPictureMuted.toggle()

Get, set, or toggle the picture mute feature.  Picture mute turns off the screen without turning off the TV (in other words, audio only).

#### isPipEnabled.get()
#### isPipEnabled.set(value)
#### isPipEnabled.toggle()

Get, set, or toggle the Picture in Picture status. May not be supported by all models.

#### broadcastAddress.get(iface)
#### macAddress.get(iface)

Get the IP or hardware address of the given network interface.

#### sceneSetting.get()
#### sceneSetting.set(value)

Get or set the current scene setting value.  One of:
 * auto
 * auto24pSync
 * general

### Events

The following events are fired when it is detected that the corresponding state has changed:

#### power-changed
#### volume-changed
#### mute-changed
#### channel-changed
#### input-changed
#### piture-mute-changed
#### pip-changed

## Compatibility

`bravia-simple-ip-control` is built to support Node.js version 6.0 or higher.

## Contributing

Contributions are of course always welcome.  If you find problems, please report them in the [Issue Tracker](http://www.github.com/forty2/bravia-simple-ip-control/issues/).  If you've made an improvement, open a [pull request](http://www.github.com/forty2/bravia-simple-ip-control/pulls).

Getting set up for development is very easy:
```sh
git clone <your fork>
cd bravia-simple-ip-control
yarn
```

And the development workflow is likewise straightforward:
```sh
# make a change to the src/ file, then...
yarn build
node dist/example.js

# or if you want to clean up all the leftover build products:
yarn run clean
```

## Release History

* 1.0.0
    * The first release.

## Meta

Zach Bean – zb@forty2.com

Distributed under the MIT license. See [LICENSE](LICENSE.md) for more detail.

[npm-image]: https://img.shields.io/npm/v/bravia-simple-ip-control.svg?style=flat
[npm-url]: https://npmjs.org/package/bravia-simple-ip-control
