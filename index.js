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

	self.stopService('snapserver')
	.then(function(stopClient){
		self.stopService('snapclient');
	})
	.fail(function(e)
	{
		defer.reject(new error());
	});

	return defer.promise;
};

ControllerSnapCast.prototype.stop = function() {
	var self = this;
	var defer=libQ.defer();

	self.stopService('snapserver')
	.then(function(stopClient){
		self.stopService('snapclient');
	})
	.fail(function(e)
	{
		defer.reject(new error());
	});

	return defer.promise;
};

ControllerSnapCast.prototype.onStart = function() {
	var self = this;
	var defer=libQ.defer();

	self.restartService('snapserver', true)
	.then(function(startClient){
		self.restartService('snapclient', true);
	})
	.fail(function(e)
	{
		defer.reject(new error());
	});

	return defer.promise;
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
	var volumioInstances = self.getVolumioInstances();
	//self.logger.info("INSTANCES: " + JSON.stringify(volumioInstances));
	var soundcards = self.getAlsaCards();
	//self.logger.info(JSON.stringify(soundcards));
	
    self.commandRouter.i18nJson(__dirname+'/i18n/strings_' + lang_code + '.json',
    __dirname + '/i18n/strings_en.json',
    __dirname + '/UIConfig.json')
    .then(function(uiconf)
    {
		uiconf.sections[1].content[0].value = self.config.get('server_enabled');
		uiconf.sections[0].content[1].value = self.config.get('pipe_name');
		for (var n = 0; n < ratesdata.sample_rates.length; n++){
			self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[2].options', {
				value: ratesdata.sample_rates[n].rate,
				label: ratesdata.sample_rates[n].name
			});
			
			if(ratesdata.sample_rates[n].rate == parseInt(self.config.get('sample_rate')))
			{
				uiconf.sections[0].content[2].value.value = ratesdata.sample_rates[n].rate;
				uiconf.sections[0].content[2].value.label = ratesdata.sample_rates[n].name;
			}
		}
		
		for (var n = 0; n < bitdephtdata.bit_depths.length; n++){
			self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[3].options', {
				value: bitdephtdata.bit_depths[n].bits,
				label: bitdephtdata.bit_depths[n].name
			});
			
			if(bitdephtdata.bit_depths[n].bits == parseInt(self.config.get('bit_depth')))
			{
				uiconf.sections[0].content[3].value.value = bitdephtdata.bit_depths[n].bits;
				uiconf.sections[0].content[3].value.label = bitdephtdata.bit_depths[n].name;
			}
		}
		
		uiconf.sections[0].content[4].value = self.config.get('channels');
		
		for (var n = 0; n < codecdata.codecs.length; n++){
			self.configManager.pushUIConfigParam(uiconf, 'sections[0].content[5].options', {
				value: codecdata.codecs[n].extension,
				label: codecdata.codecs[n].name
			});
			
			if(codecdata.codecs[n].extension == self.config.get('codec'))
			{
				uiconf.sections[0].content[5].value.value = codecdata.codecs[n].extension;
				uiconf.sections[0].content[5].value.label = codecdata.codecs[n].name;
			}
		}
		
		uiconf.sections[1].content[0].value = self.config.get('client_enabled');
		for (var n = 0; n < volumioInstances.list.length; n++){			
			if(volumioInstances.list[n].isSelf == true)
			{
				self.configManager.pushUIConfigParam(uiconf, 'sections[1].content[1].options', {
					value: 'localhost',
					label: 'Local host [default]'
				});				
			}
			else
			{
				self.configManager.pushUIConfigParam(uiconf, 'sections[1].content[1].options', {
					value: volumioInstances.list[n].name,
					label: volumioInstances.list[n].name
				});
			}
			
			if(volumioInstances.list[n].name == self.config.get('volumio_host'))
			{
				uiconf.sections[1].content[1].value.value = volumioInstances.list[n].name;
				uiconf.sections[1].content[1].value.label = volumioInstances.list[n].name;
			}
		}
		uiconf.sections[1].content[2].value = self.config.get('custom_host');
        uiconf.sections[1].content[3].value = self.config.get('host');
		
		for (var n = 0; n < soundcards.length; n++){
			self.configManager.pushUIConfigParam(uiconf, 'sections[1].content[4].options', {
				value: soundcards[n].cardId,
				label: soundcards[n].name
			});
			
			if(soundcards[n].cardId == self.config.get('soundcard'))
			{
				uiconf.sections[1].content[4].value.value = soundcards[n].cardId;
				uiconf.sections[1].content[4].value.label = soundcards[n].name;
			}
		}
				
		uiconf.sections[2].content[0].value = soundcards[parseInt(self.commandRouter.sharedVars.get('alsa.outputdevice'))].name;
		uiconf.sections[2].content[1].value = self.commandRouter.sharedVars.get('alsa.outputdevicemixer');
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

ControllerSnapCast.prototype.restartService = function (serviceName, boot)
{
	var self = this;
	var defer=libQ.defer();

	if((serviceName == 'snapserver' && self.config.get('server_enabled') == true) || (serviceName == 'snapclient' && self.config.get('client_enabled') == true))
	{
		var command = "/usr/bin/sudo /bin/systemctl restart " + serviceName;
		
		exec(command, {uid:1000,gid:1000}, function (error, stdout, stderr) {
			if (error !== null) {
				self.commandRouter.pushConsoleMessage('The following error occurred while starting ' + serviceName + ': ' + error);
				self.commandRouter.pushToastMessage('error', "Restart failed", "Restarting " + serviceName + " failed with error: " + error);
				defer.reject();
			}
			else {
				self.commandRouter.pushConsoleMessage(serviceName + ' started');
				if(boot == false)
					self.commandRouter.pushToastMessage('success', "Restarted " + serviceName, "Restarted " + serviceName + " for the changes to take effect.");
				
				defer.resolve();
			}
		});
	}
	else
	{
		self.logger.info("Not starting " + serviceName + "; it's not enabled.");
		defer.resolve();
	}

	return defer.promise;
}

ControllerSnapCast.prototype.stopService = function (serviceName)
{
	var self = this;
	var defer=libQ.defer();

	var command = "/usr/bin/sudo /bin/systemctl stop " + serviceName;
	
	exec(command, {uid:1000,gid:1000}, function (error, stdout, stderr) {
		if (error !== null) {
			self.commandRouter.pushConsoleMessage('The following error occurred while stopping ' + serviceName + ': ' + error);
			self.commandRouter.pushToastMessage('error', "Stopping service failed", "Stopping " + serviceName + " failed with error: " + error);
			defer.reject();
		}
		else {
			self.commandRouter.pushConsoleMessage(serviceName + ' stopped');
			self.commandRouter.pushToastMessage('success', "Stopping", "Stopped " + serviceName + ".");
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
	
	self.config.set('server_enabled', data['server_enabled']);
	self.config.set('pipe_name', data['pipe_name']);
	self.config.set('sample_rate', data['sample_rate'].value);
	self.config.set('bit_depth', data['bit_depth'].value);
	self.config.set('channels', data['channels']);
	self.config.set('codec', data['codec'].value);
	
	self.logger.info("Successfully updated snapserver configuration");
	
	self.updateSnapServerConfig(data)
	.then(function (restartService) {
		if(data['server_enabled'] == true)
			self.restartService("snapserver", false);
		else
			self.stopService("snapserver");
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
	
	self.config.set('client_enabled', data['client_enabled']);
	self.config.set('volumio_host', data['volumio_host'].value);
	self.config.set('custom_host', data['custom_host']);
	self.config.set('host', data['host']);
	self.config.set('soundcard', data['soundcard'].value);
	
	self.logger.info("Successfully updated sound configuration");
	
	self.updateSnapClientConfig(data)
	.then(function (restartService) {
		if(data['client_enabled'] == true)
			self.restartService("snapclient", false);
		else
			self.stopService("snapclient");
	})
	.fail(function(e)
	{
		defer.reject(new error());
	})
	
	return defer.promise;
}

ControllerSnapCast.prototype.updateSnapServerConfig = function (data)
{
	var self = this;
	var defer = libQ.defer();
	
	var format = data['sample_rate'].value + ':' + data['bit_depth'].value + ':' + data['channels'];
	
	var streamName = (data['pipe_name'] == undefined ? 'SNAPSERVER' : data['pipe_name']);
	var snapMode = (data['mode'] == undefined ? '\\&mode=read' : '\\&mode=' + data['mode']);
	var snapFormat = (format == undefined ? '' : '\\&sampleformat=' + format);
	var snapCodec = (data['codec'].value == undefined ? '' : '\\&codec=' + data['codec'].value);
	
	// Omit default
	if(snapFormat == "\\&sampleformat=48000:16:2")
		snapFormat = '';
	if(snapCodec == "\\&codec=flac")
		snapCodec = '';
	
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
		
	var streamHost = (data['volumio_host'].value == undefined ? 'localhost' : data['volumio_host'].value);
	if(data['custom_host'] == true)
		streamHost = (data['host'] == undefined ? 'localhost' : data['host']);
	
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
	var self = this;
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
			for (var n = 0; n < carddata.cards.length; n++){
				var cardname = carddata.cards[n].name.toString().trim();
				if (cardname === rawname){
					var name = carddata.cards[n].prettyname;
				}
			} cards.push({ id: id, cardId: rawname, name: name});

		}
	}
	} catch (e) {
		var namestring = 'No Audio Device Available';
		cards.push({id: '', name: namestring});
	}

	return cards;
}

ControllerSnapCast.prototype.getVolumioInstances = function () {
	var self = this;
	var results = self.commandRouter.executeOnPlugin('system_controller', 'volumiodiscovery', 'getDevices', '');
	
	return results;
}