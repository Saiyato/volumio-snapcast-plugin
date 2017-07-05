## SnapCast uninstallation script
echo "Uninstalling SnapCast and its dependencies..."
INSTALLING="/home/volumio/snapcast-plugin.uninstalling"

if [ ! -f $INSTALLING ]; then

	touch $INSTALLING

	# Stop Spotify fifo pipe service
	systemctl stop spotififo.service
	systemctl disable spotififo.service

	dpkg -P snapserver
	dpkg -P snapclient

	ALSA_ENABLED=$(sed -n "/.*type.*\"alsa\"/{n;p}" /etc/mpd.conf)
	FIFO_ENABLED=$(sed -n "/.*type.*\"fifo\"/{n;p}" /etc/mpd.conf)

	case $ALSA_ENABLED in
	 *enabled*) sed -i -- '/.*type.*alsa.*/!b;n;c\ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ enabled\ \ \ \ \ \ \ \ \ "yes"' /etc/mpd.conf ;;
	 *) sed -i -- 's|.*type.*alsa.*|&\n\ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ enabled\ \ \ \ \ \ \ \ \ "yes"|g' /etc/mpd.conf ;;
	esac

	case $FIFO_ENABLED in
	 *enabled*) sed -i -- '/.*type.*fifo.*/!b;n;c\ \ \ \ enabled\ \ \ \ \ \ \ \ \ "no"' /etc/mpd.conf ;;
	 *) sed -i -- 's|.*type.*fifo.*|&\n\ \ \ \ enabled\ \ \ \ \ \ \ \ \ "no"|g' /etc/mpd.conf ;;
	esac

	rm $INSTALLING

	#required to end the plugin uninstall
	echo "pluginuninstallend"
else
	echo "Plugin is already uninstalling! Not continuing..."
fi
