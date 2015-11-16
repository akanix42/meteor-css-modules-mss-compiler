var optionsFilePath = 'config/css-modules.json';
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
	return loadJsonFile(optionsFilePath);
}

function applyPluginOptions(plugin, pluginEntry) {
	var options = pluginEntry.options !== undefined ? pluginEntry.options : undefined;
	var fileOptions;
	if (R.type(pluginEntry.optionsFiles) === 'Array') {
		var getFilesAsJson = R.compose(R.reduce(deepExtend, {}), R.map(R.compose(loadJsonFile, decodeFilePath)));
		fileOptions = getFilesAsJson(pluginEntry.optionsFiles);
		if (Object.keys(fileOptions).length)
			options = deepExtend(options || {}, fileOptions || {});
	}

	return options !== undefined ? plugin(options) : plugin;
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
