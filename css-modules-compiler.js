var stripJsonComments = Npm.require('strip-json-comments');
var optionsFilePath = 'config/css-modules.json';
loadJsonFile = null;

fs = null;


CssModulesCompiler = class CssModulesCompiler {
	constructor(plugin) {
		fs = plugin.fs;

		loadJsonFile = R.compose(JSON.parse, stripJsonComments, R.partialRight(fs.readFileSync, 'utf-8'));
	}

	processFilesForTarget(files) {
		var plugins = new PluginsLoader().load();
		var processor = new CssProcessor('./', plugins);
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

