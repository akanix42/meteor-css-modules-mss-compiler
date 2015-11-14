var fs;
var optionsFile = 'config/css-modules.json';


CssModulesCompiler = class CssModulesCompiler {
	constructor(plugin) {
		fs = plugin.fs;
	}

	processFilesForTarget(files) {
		var options = loadOptionsFile(optionsFile);
		var processor = new CssProcessor('./', options);
		var firstFile = files[0];
		const { tokens } = processFiles(files, processor);
		outputCompiledJs(tokens, firstFile);
	}
};


function processFiles(files, processor) {
	const allFiles = createAllFilesMap(files);
	files.forEach(processFile.bind(this));
	return {tokens: processor.tokensByFile};

	function processFile(file) {
		var source = {
			path: ImportPathHelpers.getImportPathInPackage(file),
			contents: file.getContentsAsBuffer().toString('utf8')
		};
		return processor.process(source, './', allFiles)
			.then((result)=> {
				file.addStylesheet({
					data: result.source,
					path: file.getPathInPackage().replace('\.mss$', '.css'),
					sourceMap: JSON.stringify(result.sourceMap)
				});
				return {tokens: result.tokens};
			}).await();
	}
}

function createAllFilesMap(files) {
	var allFiles = new Map();
	files.forEach((inputFile) => {
		const importPath = ImportPathHelpers.getImportPathInPackage(inputFile);
		allFiles.set(importPath, inputFile);
	});
	return allFiles;
}

function outputCompiledJs(tokens, firstFile) {
	firstFile.addJavaScript({
		data: CssModulesJsTemplate.get(tokens),
		path: 'css-modules.js'
	});
}

function loadOptionsFile() {
	var options;
	var defaultOptions = {
		postcssPlugins: undefined,
		pluginOptions: {}
	};

	if (fs.existsSync(optionsFile))
		options = R.merge(defaultOptions, JSON.parse(fs.readFileSync(optionsFile)));

	if (options.postcssPlugins)
		options.postcssPlugins = options.postcssPlugins.map((pluginName)=> {
			var plugin = CssProcessor[pluginName];
			if (plugin === undefined) throw new Error(`plugin ${pluginName} is not a valid selection!`);
			return plugin;
		});

	options.pluginOptions = options.pluginOptions || {};
	options.pluginOptions.simpleVars = R.merge(options.pluginOptions.simpleVars || {}, {variables: retrieveGlobalVariables(options.globalVariableFiles)});
	return options;
}

function retrieveGlobalVariables(globalVariableFiles) {
	if (!globalVariableFiles) return undefined;
	var getFilesAsJson = R.compose(R.mergeAll, R.map(R.compose(JSON.parse, fs.readFileSync, decodeFilePath)));

	return getFilesAsJson(globalVariableFiles);
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
