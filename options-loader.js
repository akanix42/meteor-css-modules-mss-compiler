var optionsFilePath = 'config/css-modules.json';
var cjson = Npm.require('cjson');
var fs = Npm.require('fs');

loadOptionsFile = function loadOptionsFile() {
	createDefaultOptionsFile();

	return cjson.load(optionsFilePath);


	function createDefaultOptionsFile() {
		if (shouldHaveOptionsFile() && !fs.existsSync(optionsFilePath)) {
			console.log('\n');
			console.log("-> creating `config/css-modules.json` for the first time.");
			console.log("-> customize your PostCSS plugins in `config/css-modules.json`");
			console.log();

			var directory = path.dirname(optionsFilePath);
			fs.existsSync(directory) || fs.mkdirSync(directory);
			fs.writeFileSync(optionsFilePath, Assets.getText('default-options-file.json'));
		}
	}

	function shouldHaveOptionsFile() {
		var unAcceptableCommands = {'test-packages': 1, 'publish': 1};
		if (process.argv.length > 2) {
			var command = process.argv[2];
			if (unAcceptableCommands[command])
				return false;
		}

		return true;
	}
};
