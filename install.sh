#!/bin/bash
echo "Installing SnapCast and its dependencies..."

# Download latest SnapCast packages
mkdir /home/volumio/snapcast
wget $(curl -s https://api.github.com/repos/badaix/snapcast/releases/latest | grep 'armhf' | cut -d\" -f4) -P /home/volumio/snapcast

# Install packages (server and client) and dependencies
for f in /home/volumio/snapcast/snap*.deb; do dpkg -i $f; done
apt-get -f install

/etc/init.d/snapserver restart
/etc/init.d/snapclient restart

# Reload ALSA with the new config
alsactl restore

if [ -f "/etc/asound.conf" ];
then
	# Add or update asound.conf
	if ! grep -q "snapcast" /etc/asound.conf;
	then
		# Append to file
		echo "
pcm.!snapcast {
    type plug
    slave.pcm snapConverter
}

pcm.snapConverter {
    type rate
    slave {
        pcm writeFile # Direct to the plugin which will write to a file
        format S16_LE
        rate 48000
		channels 2
    }
}

pcm.writeFile {
    type file
    slave.pcm null
    file \"/tmp/snapfifo\"
    format \"raw\"
}
" >> /etc/asound.conf 
	fi
else
	echo "
pcm.!snapcast {
    type plug
    slave.pcm snapConverter
}

pcm.snapConverter {
    type rate
    slave {
        pcm writeFile # Direct to the plugin which will write to a file
        format S16_LE
        rate 48000
		channels 2
    }
}

pcm.writeFile {
    type file
    slave.pcm null
    file \"/tmp/snapfifo\"
    format \"raw\"
}
" | sudo tee /etc/asound.conf
fi

# Fix chrooted spotify-connect-web
if ! grep -q "asound.conf" /data/plugins/music_service/volspotconnect/spotify-connect-web/etc;
then
	rm /data/plugins/music_service/volspotconnect/spotify-connect-web/etc/asound.conf
	ln -sf /etc/asound.conf /data/plugins/music_service/volspotconnect/spotify-connect-web/etc/asound.conf
fi

#required to end the plugin install
echo "plugininstallend"