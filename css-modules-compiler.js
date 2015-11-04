CssModulesCompiler = class CssModulesCompiler {
	processFilesForTarget(files) {
		var processor = new CssProcessor('./');
		var firstFile = files[0];
		const {css, tokens } = processFiles(files, processor);
		outputCompiledCss(css, firstFile);
		outputCompiledJs(tokens, firstFile);
	}
};


function processFiles(files, processor) {
	const allFiles = createAllFilesMap(files);
	files.forEach(processFile.bind(this));
	return {css: processor.finalSource, tokens: processor.tokensByFile};

	function processFile(file) {
		var source = {path: ImportPathHelpers.getImportPathInPackage(file), contents: file.getContentsAsBuffer().toString('utf8')};
		return processor.process(source, './', allFiles)
			.then((result)=> {
				return {css: result.source, tokens: result.tokens};
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

function outputCompiledCss(css, firstFile) {
	firstFile.addStylesheet({
		data: css,
		path: 'css-modules.css'
		// sourceMap: compileResult.sourceMap
	});
}

function outputCompiledJs(tokens, firstFile) {
	firstFile.addJavaScript({
		data: CssModulesJsTemplate.get(tokens),
		path: 'css-modules.js'
	});
}
