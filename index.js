'use strict';

var libQ = require('kew');
var libNet = require('net');
var fs = require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;


// Define the ControllerSnapCast class
module.exports = ControllerSnapCast;

function ControllerSnapCast(context) 
{
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}

ControllerSnapCast.prototype.onVolumioStart = function()
{
	var self = this;
	self.logger.info("SnapCast initiated");
	
	this.configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
	self.getConf(this.configFile);
	
	// For debugging purposes
	//self.logger.info('GPU memory: ' + self.config.get('gpu_mem'));
	//self.logger.info("Config file: " + this.configFile);
	
	return libQ.resolve();	
}

ControllerSnapCast.prototype.getConfigurationFiles = function()
{
	return ['config.json'];
};

// Plugin methods -----------------------------------------------------------------------------
ControllerSnapCast.prototype.onStop = function() {
	var self = this;

	var defer=libQ.defer();

	exec("/usr/bin/sudo /etc/init.d/snapserver stop", {uid:1000,gid:1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushConsoleMessage('The following error occurred while stopping SnapCast server: ' + error);
			defer.reject();
		}
		else {
			exec("/usr/bin/sudo /etc/init.d/snapclient stop", {uid:1000,gid:1000}, function (error, stdout, stderr) {
				if (error !== null) {
					self.commandRouter.pushConsoleMessage('The following error occurred while stopping SnapCast client: ' + error);
					defer.reject();
				}
			});
			
			self.commandRouter.pushConsoleMessage('SnapCast server and client killed');
			defer.resolve();
		}
	});

	return defer.promise;
};

ControllerSnapCast.prototype.onStart = function() {
	var self = this;
	var defer=libQ.defer();

	exec("/usr/bin/sudo /etc/init.d/snapserver restart", {uid:1000,gid:1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushConsoleMessage('The following error occurred while stopping SnapCast server: ' + error);
			defer.reject();
		}
		else {
			exec("/usr/bin/sudo /etc/init.d/snapclient restart", {uid:1000,gid:1000}, function (error, stdout, stderr) {
				if (error !== null) {
					self.commandRouter.pushConsoleMessage('The following error occurred while stopping SnapCast client: ' + error);
					defer.reject();
				}
			});
			
			self.commandRouter.pushConsoleMessage('SnapCast server and client started');
			defer.resolve();
		}
	});

	return defer.promise;
};

ControllerSnapCast.prototype.stop = function() 
{
	// Kill process?
	self.logger.info("performing stop action");	
	
	return libQ.resolve();
};


ControllerSnapCast.prototype.onRestart = function() 
{
	// Do nothing
	self.logger.info("performing onRestart action");	
	
	var self = this;
};

ControllerSnapCast.prototype.onInstall = function() 
{
	var self = this;
};

ControllerSnapCast.prototype.onUninstall = function() 
{
	// Uninstall.sh?
};

ControllerSnapCast.prototype.getUIConfig = function() {
    var self = this;
	var defer = libQ.defer();    
    var lang_code = this.commandRouter.sharedVars.get('language_code');

	self.getConf(this.configFile);
	self.logger.info("Reloaded the config file");
	
	var ratesdata = fs.readJsonSync(('/data/plugins/miscellanea/SnapCast/sample_rates.json'),  'utf8', {throws: false});
	var bitdephtdata = fs.readJsonSync(('/data/plugins/miscellanea/SnapCast/bit_depths.json'),  'utf8', {throws: false});
	
    self.commandRouter.i18nJson(__dirname+'/i18n/strings_' + lang_code + '.json',
    __dirname + '/i18n/strings_en.json',
    __dirname + '/UIConfig.json')
    .then(function(uiconf)
    {
        uiconf.sections[0].content[0].value = self.config.get('host');
		
		uiconf.sections[1].content[0].value = self.config.get('soundcard_index');
		
		for (var n = 0; n < ratesdata.sample_rates.length; n++){
			self.configManager.pushUIConfigParam(uiconf, 'sections[2].content[0].options', {
				value: ratesdata.sample_rates[n].rate,
				label: ratesdata.sample_rates[n].name
			});
		}
		//uiconf.sections[2].content[0].value = self.config.get('sample_rate');
		
		for (var n = 0; n < bitdephtdata.bit_depths.length; n++){
			self.configManager.pushUIConfigParam(uiconf, 'sections[2].content[1].options', {
				value: bitdephtdata.bit_depths[n].bits,
				label: bitdephtdata.bit_depths[n].name
			});
		}
		//uiconf.sections[2].content[1].value = self.config.get('bit_depth');
		
		uiconf.sections[2].content[2].value = self.config.get('channels');
		
		uiconf.sections[3].content[0].value = self.commandRouter.sharedVars.get('alsa.outputdevice');
		uiconf.sections[3].content[1].value = self.commandRouter.sharedVars.get('alsa.outputdevicemixer');
		uiconf.sections[3].content[2].value = self.getAdditionalConf('audio_interface', 'alsa_controller', 'softvolumenumber');
		
        defer.resolve(uiconf);
    })
    .fail(function()
    {
        defer.reject(new Error());
    });

    return defer.promise;
};

ControllerSnapCast.prototype.setUIConfig = function(data) {
	var self = this;
	
	self.logger.info("Updating UI config");
	var uiconf = fs.readJsonSync(__dirname + '/UIConfig.json');
	
	return libQ.resolve();
};

ControllerSnapCast.prototype.getConf = function(configFile) {
	var self = this;
	this.config = new (require('v-conf'))()
	this.config.loadFile(configFile)
	
	return libQ.resolve();
};

ControllerSnapCast.prototype.setConf = function(conf) {
	var self = this;
	return libQ.resolve();
};

// Public Methods ---------------------------------------------------------------------------------------

ControllerSnapCast.prototype.getAdditionalConf = function (type, controller, data) {
	var self = this;
	return self.commandRouter.executeOnPlugin(type, controller, 'getConfigParam', data);
};

ControllerSnapCast.prototype.restartKodi = function ()
{
	var self = this;
	var defer=libQ.defer();

	exec("/usr/bin/sudo /bin/systemctl restart kodi.service", {uid:1000,gid:1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushConsoleMessage('The following error occurred while starting KODI: ' + error);
			self.commandRouter.pushToastMessage('error', "Restart failed", "Restarting Kodi failed with error: " + error);
			defer.reject();
		}
		else {
			self.commandRouter.pushConsoleMessage('KODI started');
			self.commandRouter.pushToastMessage('success', "Restarted Kodi", "Restarted Kodi for the changes to take effect.");
			defer.resolve();
		}
	});

	return defer.promise;
}

ControllerSnapCast.prototype.updateBootConfig = function (data) 
{
	var self = this;	
	var defer = libQ.defer();	

	return defer.promise;
}

ControllerSnapCast.prototype.updateSoundConfig = function (data)
{
	var self = this;
	var defer = libQ.defer();
	
	self.config.set('usedac', data['usedac']);
	self.config.set('kalidelay', data['kalidelay']);
	self.logger.info("Successfully updated sound configuration");
	
	self.writeSoundConfig(data)
	.then(function (restartService) {
		self.restartKodi();
	})
	.fail(function(e)
	{
		defer.reject(new error());
	})
	
	return defer.promise;
}

ControllerSnapCast.prototype.writeBootConfig = function (config) 
{
	var self = this;
	var defer = libQ.defer();
	
	self.updateConfigFile("gpu_mem_1024", self.config.get('gpu_mem_1024'), "/boot/config.txt")
	.then(function (gpu512) {
		self.updateConfigFile("gpu_mem_512", self.config.get('gpu_mem_512'), "/boot/config.txt");
	})
	.then(function (gpu256) {
		self.updateConfigFile("gpu_mem_256", self.config.get('gpu_mem_256'), "/boot/config.txt");
	})
	.then(function (hdmi) {
		self.updateConfigFile("hdmi_force_hotplug", self.config.get('hdmihotplug'), "/boot/config.txt");
	})
	.fail(function(e)
	{
		defer.reject(new Error());
	});
	
	self.commandRouter.pushToastMessage('success', "Configuration update", "A reboot is required, changes have been made to /boot/config.txt");

	return defer.promise;
}

ControllerSnapCast.prototype.writeSoundConfig = function (soundConfig)
{
	var self = this;
	var defer = libQ.defer();
	
	self.updateAsoundConfig(soundConfig['usedac'])	
	.then(function (kali) {
		self.updateKodiConfig(soundConfig['kalidelay']);
	})
	
	self.commandRouter.pushToastMessage('success', "Configuration update", "Successfully updated sound settings");
	
	return defer.promise;
}

ControllerSnapCast.prototype.updateConfigFile = function (setting, value, file)
{
	var self = this;
	var defer = libQ.defer();
	var castValue;
	
	if(value == true || value == false)
			castValue = ~~value;
	else
		castValue = value;
	
	var command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed '/^" + setting + "=/{h;s/=.*/=" + castValue + "/};${x;/^$/{s//" + setting + "=" + castValue + "/;H};x}' -i " + file;
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
		
		defer.resolve();
	});
	
	return defer.promise;
}

ControllerSnapCast.prototype.updateAsoundConfig = function (useDac)
{
	var self = this;
	var defer = libQ.defer();
	var command;
	
	if(useDac)
	{
		command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|0|1|g' /etc/asound.conf";
	}
	else
	{
		command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|1|0|g' /etc/asound.conf";
	}
	
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
		
		defer.resolve();
	});
	
	return defer.promise;
}

ControllerSnapCast.prototype.updateKodiConfig = function (useKaliDelay)
{
	var self = this;
	var defer = libQ.defer();
	var command;
	var secondCommand;
	
	if(useKaliDelay)
	{
		command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|.*audiodelay.*|<audiodelay>0.700000</audiodelay>|g' /home/kodi/.kodi/userdata/guisettings.xml";
		secondCommand = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|.*subtitledelay.*|<subtitledelay>0.700000</subtitledelay>|g' /home/kodi/.kodi/userdata/guisettings.xml";
	}
	else
	{
		command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|.*audiodelay.*|<audiodelay>0.000000</audiodelay>|g' /home/kodi/.kodi/userdata/guisettings.xml";
		secondCommand = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|.*subtitledelay.*|<subtitledelay>0.000000</subtitledelay>|g' /home/kodi/.kodi/userdata/guisettings.xml";
	}
	
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
	});
	
	exec(secondCommand, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
		
		defer.resolve();
	});
	
	return defer.promise;
}