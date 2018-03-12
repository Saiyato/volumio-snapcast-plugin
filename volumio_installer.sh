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

echo "Cleaning up the directory..."
cd /home/volumio/volumio-snapcast-plugin
rm -rf .git
rm -rf images
rm -rf known_working_versions
rm .gitattributes
rm brainstorm.txt
rm readme.md
rm snapcast.pptx
rm volumio_installer.sh
rm volumio-snapcast-plugin.zip

echo "Installing plugin..."
volumio plugin install
echo "Done!"