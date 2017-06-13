## SnapCast uninstallation script
echo "Uninstalling SnapCast and its dependencies..."
INSTALLING="/home/volumio/snapcast-plugin.uninstalling"

if [ ! -f $INSTALLING ]; then

	touch $INSTALLING	
	
	for f in /home/volumio/snapcast/snap*.deb; do dpkg -P $f; done
	
	rm $INSTALLING
	
	#required to end the plugin uninstall
	echo "pluginuninstallend"
else
	echo "Plugin is already uninstalling! Not continuing..."
fi	