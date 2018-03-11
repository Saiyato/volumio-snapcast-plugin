# Volumio installer (workaround for fixes not in the Volumio repo)
if [ -d /home/volumio/volumio-snapcast-plugin ];
then
	mkdir /home/volumio/volumio-snapcast-plugin
else
	rm -rf home/volumio/volumio-snapcast-plugin
	mkdir /home/volumio/volumio-snapcast-plugin
fi

echo "Cloning github repo... (this might take a while)"
git clone https://github.com/Saiyato/volumio-snapcast-plugin /home/volumio/volumio-snapcast-plugin

echo "Cleaning up the directory for use"
cd /home/volumio/volumio-snapcast-plugin
rm volumio-snapcast-plugin.zip

echo "Installing plugin..."
volumio plugin install