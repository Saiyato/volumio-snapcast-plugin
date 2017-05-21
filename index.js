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
	self.logger.info("Loaded the previous config.");
	
	var ratesdata = fs.readJsonSync(('/data/plugins/miscellanea/SnapCast/sample_rates.json'),  'utf8', {throws: false});
	var bitdephtdata = fs.readJsonSync(('/data/plugins/miscellanea/SnapCast/bit_depths.json'),  'utf8', {throws: false});
	var codecdata = fs.readJsonSync(('/data/plugins/miscellanea/SnapCast/codecs.json'),  'utf8', {throws: false});
	
    self.commandRouter.i18nJson(__dirname+'/i18n/strings_' + lang_code + '.json',
    __dirname + '/i18n/strings_en.json',
    __dirname + '/UIConfig.json')
    .then(function(uiconf)
    {
		uiconf.sections[0].content[0].value = self.config.get('pipe_name');
		for (var n = 0; n < ratesdata.sample_rates.length; n++){
			self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[1].options', {
				value: ratesdata.sample_rates[n].rate,
				label: ratesdata.sample_rates[n].name
			});
		}
		
		for (var n = 0; n < bitdephtdata.bit_depths.length; n++){
			self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[2].options', {
				value: bitdephtdata.bit_depths[n].bits,
				label: bitdephtdata.bit_depths[n].name
			});
		}
		
		uiconf.sections[0].content[3].value = self.config.get('channels');
		
		for (var n = 0; n < codecdata.codecs.length; n++){
			self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[4].options', {
				value: codecdata.codecs[n].extension,
				label: codecdata.codecs[n].name
			});
		}
		
		
        uiconf.sections[1].content[0].value = self.config.get('host');
		uiconf.sections[1].content[1].value = self.config.get('soundcard');
		
		uiconf.sections[2].content[0].value = self.commandRouter.sharedVars.get('alsa.outputdevice');
		uiconf.sections[2].content[1].value = self.commandRouter.sharedVars.get('alsa.outputdevicemixer');
		uiconf.sections[2].content[2].value = self.getAdditionalConf('audio_interface', 'alsa_controller', 'softvolumenumber');
		
		var cards = self.getAlsaCards();
		self.logger.info(JSON.stringify(cards));
		
		self.logger.info("Populated config screen.");
		
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

ControllerSnapCast.prototype.restartService = function (serviceName)
{
	var self = this;
	var defer=libQ.defer();

	var command = "/usr/bin/sudo /bin/systemctl restart " + serviceName;
	
	exec(command, {uid:1000,gid:1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushConsoleMessage('The following error occurred while starting ' + serviceName + ': ' + error);
			self.commandRouter.pushToastMessage('error', "Restart failed", "Restarting " + serviceName + " failed with error: " + error);
			defer.reject();
		}
		else {
			self.commandRouter.pushConsoleMessage(serviceName + ' started');
			self.commandRouter.pushToastMessage('success', "Restarted " + serviceName, "Restarted " + serviceName + " for the changes to take effect.");
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

ControllerSnapCast.prototype.updateSnapServer = function (data)
{
	var self = this;
	var defer = libQ.defer();
	
	self.config.set('pipe_name', data['pipe_name']);
	self.config.set('sample_rate', data['sample_rate']);
	self.config.set('bit_depth', data['bit_depth']);
	self.config.set('channels', data['channels']);
	self.config.set('codec', data['codec']);
	
	self.logger.info("Successfully updated snapserver configuration");
	
	self.updateSnapServerConfig(data)
	.then(function (restartService) {
		self.restartService("snapserver");
	})
	.fail(function(e)
	{
		defer.reject(new error());
	})
	
	return defer.promise;
}

ControllerSnapCast.prototype.updateSnapClient = function (data)
{
	var self = this;
	var defer = libQ.defer();
	
	self.config.set('host', data['host']);
	self.config.set('soundcard', data['soundcard']);
	
	self.logger.info("Successfully updated sound configuration");
	
	self.updateSnapClientConfig(data)
	.then(function (restartService) {
		self.restartService("snapclient");
	})
	.fail(function(e)
	{
		defer.reject(new error());
	})
	
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

ControllerSnapCast.prototype.updateSnapServerConfig = function (data)
{
	var self = this;
	var defer = libQ.defer();
	
	var format = data['sample_rate'].value + ':' + data['bit_depth'].value + ':' + data['channels'];
	
	var streamName = (data['pipe_name'] == undefined ? 'SNAPSERVER' : data['pipe_name']);
	var snapMode = (data['mode'] == undefined ? '\\&mode=read' : '\\&mode=' + data['mode']);
	var snapFormat = (format == undefined ? '' : '\\&format=' + format);
	var snapCodec = (data['codec'].value == undefined ? '' : '\\&codec=' + data['codec'].value);
	
	// Omit default
	if(snapFormat == "\\&format=48000:16:2")
		snapFormat = '';
	
	// sudo sed 's|^SNAPSERVER_OPTS.*|SNAPSERVER_OPTS="-d -s pipe:///tmp/snapfifo?name=AUDIOPHONICS\&mode=read&sampleformat=48000:16:2&codec=flac"|g' /etc/default/snapserver
	var command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|^SNAPSERVER_OPTS.*|SNAPSERVER_OPTS=\"-d -s pipe:///tmp/snapfifo?name=" + streamName + snapMode + snapFormat + snapCodec + "\"|g' /etc/default/snapserver";
	
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
		
		defer.resolve();
	});
	
	return defer.promise;
}

ControllerSnapCast.prototype.updateSnapClientConfig = function (data)
{
	var self = this;
	var defer = libQ.defer();
		
	var streamHost = (data['host'] == undefined ? 'localhost' : data['host']);
	var snapSoundCard = (data['soundcard'] == undefined ? '1' : data['soundcard'].value);
	
	var	command = "/bin/echo volumio | /usr/bin/sudo -S /bin/sed -i -- 's|^SNAPCLIENT_OPTS.*|SNAPCLIENT_OPTS=\"-d -h " + streamHost + " -s " + snapSoundCard + "\"|g' /etc/default/snapclient";
	
	exec(command, {uid:1000, gid:1000}, function (error, stout, stderr) {
		if(error)
			console.log(stderr);
		
		defer.resolve();
	});
	
	return defer.promise;
}

ControllerSnapCast.prototype.getAlsaCards = function () {
	var self=this;
	var cards = [];
	
	var soundCardDir = '/proc/asound/';
	var idFile = '/id';
	var regex = /card(\d+)/;
	var carddata = fs.readJsonSync(('/volumio/app/plugins/audio_interface/alsa_controller/cards.json'),  'utf8', {throws: false});

	try {
		var soundFiles = fs.readdirSync(soundCardDir);



	for (var i = 0; i < soundFiles.length; i++) {
		var fileName = soundFiles[i];
		var matches = regex.exec(fileName);
		var idFileName = soundCardDir + fileName + idFile;
		if (matches && fs.existsSync(idFileName)) {
			var id = matches[1];
			var content = fs.readFileSync(idFileName);
			var rawname = content.toString().trim();
			var name = rawname;
			self.logger.info("RAW name: " + rawname);
			for (var n = 0; n < carddata.cards.length; n++){
				var cardname = carddata.cards[n].name.toString().trim();
				if (cardname === rawname){
					var name = carddata.cards[n].prettyname;
				}
			} cards.push({id: id, name: name});

		}
	}
	} catch (e) {
		var namestring = 'No Audio Device Available';
		cards.push({id: '', name: namestring});
	}

	return cards;
};