# volumio-snapcast-plugin
Volumio 2 SnapCast plugin, to easily manage SnapCast functionality

Simple how-to:
1. Install the zip-package in Volumio 2 (drag-and-drop).
2. Configure the output format (sampling, bit depth, codec, etc.).
3. Configure the soundcard for the client.
4. In the case of a slave device disable to the server and connect to the running server;
  a. This can be either a Volumio host (drop down) or any other SnapCast server (define custom host -> fill in the IP-address)
  b. You cannot select a stream from within the plugin at this time, you can use the Android app for this. Default the first stream will be selected; in the case of this plugin that will be the MPD stream.
5. Enjoy in-sync music in high fidelity.

The package will install both the client and server, you can en- or disable any component in the plugin settings.

As mentioned the stream cannot be selected from within the plugin, because it is saved in memory (and not loaded from file).

Please note that I did not write the SnapCast application, I merely supplied means to easily install it.
You can find the SnapCast project and all the information you need here: https://github.com/badaix/snapcast
