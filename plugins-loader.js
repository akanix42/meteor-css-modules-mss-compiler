var optionsFilePath = 'config/css-modules.json';
var appModulePath = Npm.require('app-module-path');
appModulePath.addPath(process.cwd() + '/packages/npm-container/.npm/package/node_modules/');

var fs = Npm.require('fs');
var cjson = Npm.require('cjson');

var corePlugins = {
	"postcss-modules-local-by-default": Npm.require("postcss-modules-local-by-default"),
	"postcss-modules-extract-imports": Npm.require("postcss-modules-extract-imports"),
	"postcss-modules-scope": Npm.require("postcss-modules-scope"),
	"postcss-modules-values": Npm.require("postcss-modules-values"),
};

corePlugins['postcss-modules-scope'].generateScopedName = function generateScopedName(exportedName, path) {
	let sanitisedPath = path.replace(/.*\{}[/\\]/, '').replace(/.*\{.*?}/, 'packages').replace(/\.[^\.\/\\]+$/, '').replace(/[\W_]+/g, '_').replace(/^_|_$/g, '');

	return `_${sanitisedPath}__${exportedName}`;
};

PluginsLoader = class PluginsLoader {
	load() {
		return loadPlugins();
	}
};


function getDefaultOptions() {
	var defaultOptions = {
		postcssPlugins: undefined,
		pluginOptions: {}
	};
	return defaultOptions;
}


function loadPlugins() {
	var options = loadOptionsFile();
	var plugins = [];

	R.forEach((pluginEntry)=> {
		var plugin = corePlugins[pluginEntry.package] || Npm.require(pluginEntry.package);
		if (plugin === undefined) throw new Error(`plugin ${pluginEntry.package} was not found by NPM!`);

		plugins.push(applyPluginOptions(plugin, pluginEntry));
	}, options.postcssPlugins);
	return plugins;
}

function loadOptionsFile() {
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
}

function applyPluginOptions(plugin, pluginEntry) {
	var options = pluginEntry.options !== undefined ? pluginEntry.options : undefined;
	var fileOptions;
	if (R.type(pluginEntry.optionsFiles) === 'Array') {
		var getFilesAsJson = R.compose(R.reduce(deepExtend, {}), R.map(R.compose(loadJsonOrMssFile, decodeFilePath)));
		fileOptions = getFilesAsJson(pluginEntry.optionsFiles);
		if (Object.keys(fileOptions).length)
			options = deepExtend(options || {}, fileOptions || {});
	}

	return options !== undefined ? plugin(options) : plugin;
}

function loadJsonOrMssFile(filePath) {
	var removeLastOccurrence = (character, str)=> {
		var index = str.lastIndexOf(character);
		return str.substring(0, index) + str.substring(index+1);
	};
	var loadMssFile = R.compose(variables=> ({variables: variables}), cjson.parse, str=>`{${str}}`, R.curry(removeLastOccurrence)(','), R.replace(/\$(.*):\s*(.*),/g, '"$1":"$2",'), R.replace(/;/g, ','), R.partialRight(fs.readFileSync, ['utf-8']));
	return filePath.endsWith(".mss") ? loadMssFile(filePath) : cjson.load(filePath);
}

function decodeFilePath(filePath) {
	const match = filePath.match(/{(.*)}\/(.*)$/);
	if (!match)
		return filePath;

	if (match[1] === '') return match[2];

	var paths = [];

	paths[1] = paths[0] = `packages/${match[1].replace(':', '_')}/${match[2]}`;
	if (!fs.existsSync(paths[0]))
		paths[2] = paths[0] = 'packages/' + match[1].replace(/.*:/, '') + '/' + match[2];
	if (!fs.existsSync(paths[0]))
		throw new Error(`Path not exist: ${filePath}\nTested path 1: ${paths[1]}\nTest path 2: ${paths[2]}`);

	return paths[0];
}

function deepExtend(destination, source) {
	for (var property in source) {
		if (source[property] && source[property].constructor &&
			source[property].constructor === Object) {
			destination[property] = destination[property] || {};
			arguments.callee(destination[property], source[property]);
		} else {
			destination[property] = source[property];
		}
	}
	return destination;
}
