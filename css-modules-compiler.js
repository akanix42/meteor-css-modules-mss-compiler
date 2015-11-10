var fs;
var optionsFile = 'config/css-modules.json';


CssModulesCompiler = class CssModulesCompiler {
	constructor(plugin) {
		fs = plugin.fs;
	}

	processFilesForTarget(files) {
		var options = loadOptionsFile(optionsFile);
		var processor = new CssProcessor('./', options.postcssPlugins);
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
	if (fs.existsSync(optionsFile))
		options = JSON.parse(fs.readFileSync(optionsFile));
	if (!options) return {};
	if (options.postcssPlugins)
		options.postcssPlugins = options.postcssPlugins.map((pluginName)=> {
			var plugin = CssProcessor[pluginName];
			if (plugin === undefined) throw new Error(`plugin ${pluginName} is not a valid selection!`);
			return plugin;
		});
	return options;
}
