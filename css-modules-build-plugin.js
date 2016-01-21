fs = null;
path = null;

CssModulesBuildPlugin = class CssModulesBuildPlugin {
	constructor(plugin) {
		fs = plugin.fs;
		path = plugin.path;
	}

	processFilesForBundle(files, meteorOptions) {
		var options = loadOptionsFile();
		var plugins = new PluginsLoader().load(options);
		var processor = new CssModulesProcessor('./', plugins);
		var firstFile = files[0];
		const { tokens } = processFiles(files, processor, meteorOptions);
		outputCompiledJs(tokens, firstFile);
	}
};

function processFiles(files, processor, meteorOptions) {
	const allFiles = createAllFilesMap(files);
	var processedFiles = R.map(processFile.bind(this), files);
	var minifier = new CssToolsMinifier();
	minifier.processFilesForBundle(files, meteorOptions );

	return {tokens: processor.tokensByFile};

	function processFile(file) {
		var source = {
			path: ImportPathHelpers.getImportPathInPackage(file),
			contents: file.getContentsAsBuffer().toString('utf8')
		};
		return processor.process(source, './', allFiles)
			.then((result)=> {
				// override getContentsAsString so the css minifier can handle it
				file.getContentsAsString = () => result.source;

				return {tokens: result.tokens, css: result.source, sourceMap: JSON.stringify(result.sourceMap)};
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

