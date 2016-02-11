var sass = Npm.require('node-sass');
var optionsFilePath = 'config/css-modules.json';

fs = null;
path = null;


CssModulesBuildPlugin = class CssModulesBuildPlugin {
	constructor(plugin) {
		fs = plugin.fs;
		path = plugin.path;
	}

	processFilesForTarget(files) {
		var pluginsAndOptions = new PluginsLoader().load();
		var processor = new CssModulesProcessor('./', pluginsAndOptions);
		var firstFile = files[0];
		const { tokens } = processFiles(files, processor, getGlobalVariables(pluginsAndOptions.options, pluginsAndOptions.plugins));
		outputCompiledJs(tokens, firstFile);
	}
};

function getGlobalVariables(options, plugins) {
	if (options.extractSimpleVars === false) return;

	var findSimpleVarsPlugin = R.findIndex(plugin=>plugin.postcss && plugin.postcss.postcssPlugin === 'postcss-simple-vars');
	var pluginIndex = findSimpleVarsPlugin(plugins);

	if (pluginIndex === -1) return;

	let variables = plugins[pluginIndex].options.variables;
	let variablesString = R.compose(R.reduce((variables, pair)=>variables + `$${pair[0]}: ${pair[1]};\n`, ''), R.toPairs)(variables);
	return variablesString;
}

function processFiles(files, processor, globalVariables) {
	const allFiles = createAllFilesMap(files);
	files.forEach(file=> {
		var contents = file.getContentsAsBuffer().toString('utf8');
		if (contents && contents.length && file.getFileOptions()['isScss']) {
			file.contents = `${globalVariables}\n\n${contents}`;
			console.log('before sass');
			console.log(`${globalVariables}\n\n${contents}`)
		}
		else
			file.contents = contents;
	});
	files.forEach(processFile.bind(this));
	return {tokens: processor.tokensByFile};

	function processFile(file) {
		var source = {
			path: ImportPathHelpers.getImportPathInPackage(file),
			contents: file.contents
		};
		if (source.contents && source.contents.length && file.getFileOptions()['isScss']) {
			source.contents = sass.renderSync({
				data: source.contents
			}).css.toString('utf-8');
			console.log('after sass');
			console.log(source.contents)
		}
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

