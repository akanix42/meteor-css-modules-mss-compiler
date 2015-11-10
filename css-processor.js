var postcss = Npm.require('postcss');
var localByDefault = Npm.require('postcss-modules-local-by-default');
var extractImports = Npm.require('postcss-modules-extract-imports');
var scope = Npm.require('postcss-modules-scope');
var values = Npm.require('postcss-modules-values');

var Parser = Npm.require('css-modules-loader-core/lib/parser');

// Additional PostCSS plugins
var nestedProps = Npm.require('postcss-nested-props');
var nested = Npm.require('postcss-nested');
var mediaMinMax = Npm.require('postcss-media-minmax');
var colorHexAlpha = Npm.require('postcss-color-hex-alpha');
var anyLink = Npm.require('postcss-pseudo-class-any-link');
var notSelector = Npm.require('postcss-selector-not');

CssProcessor = class CssProcessor {
	constructor(root, plugins) {
		this.root = root;
		this.importNr = 0;
		this.plugins = plugins || CssProcessor.defaultPlugins;
		this.tokensByFile = {};
	}

	process(_source, _relativeTo, allFiles) {
		return processInternal.call(this, _source, _relativeTo);

		function processInternal(source, relativeTo, _trace) {
			relativeTo = relativeTo.replace(/.*(\{.*)/, '$1').replace(/\\/g, '/');
			source = getSourceContents(source, relativeTo);
			var trace = _trace || String.fromCharCode(this.importNr++);

			return new Promise((resolve, reject) => {
				const tokens = this.tokensByFile[source.path];
				if (tokens)
					return resolve(tokens);

				this.load(source.contents, source.path, trace, processInternal.bind(this))
					.then(({ injectableSource, exportTokens, sourceMap }) => {
						this.tokensByFile[source.path] = exportTokens;
						resolve({source: injectableSource, tokens: exportTokens, sourceMap: sourceMap});
					}, reject);
			});
		}

		function getSourceContents(source, relativeTo) {
			if (source instanceof String || typeof source === "string") {
				source = ImportPathHelpers.getImportPathRelativeToFile(source, relativeTo);
				return {path: source, contents: importModule(source)};
			}
			return source;
		}

		function importModule(importPath) {
			try {
				var file = allFiles.get(importPath);
				var contents = file.getContentsAsString();
				return contents;
			}
			catch (e) {
				throw new Error(`CSS Modules: unable to read file ${importPath}: ${JSON.stringify(e)}`);
			}
		}
	}

	load(sourceString, sourcePath, trace, pathFetcher) {
		let parser = new Parser(pathFetcher, trace);

		return postcss(this.plugins.concat([parser.plugin]))
			.process(sourceString, {
				from: sourcePath,
				to: sourcePath.replace('\.mss$', '.css'),
				map: {inline: false}
			})
			.then(result => {
				return {injectableSource: result.css, exportTokens: parser.exportTokens, sourceMap: result.map};
			});
	}

};

CssProcessor.values = values;
CssProcessor.localByDefault = localByDefault;
CssProcessor.extractImports = extractImports;
CssProcessor.scope = scope;
CssProcessor.mediaMinMax = mediaMinMax;
CssProcessor.nestedProps = nestedProps;
CssProcessor.nested = nested;
CssProcessor.colorHexAlpha = colorHexAlpha;
CssProcessor.anyLink = anyLink;
CssProcessor.notSelector = notSelector;

CssProcessor.defaultPlugins = [
	values,
	nestedProps,
	nested,
	colorHexAlpha,
	mediaMinMax,
	anyLink,
	notSelector,
	localByDefault,
	extractImports,
	scope
];

CssProcessor.scope.generateScopedName = function (exportedName, path) {
	let sanitisedPath = path.replace(/.*\{}[/\\]/, '').replace(/.*\{.*?}/, 'packages').replace(/\.[^\.\/\\]+$/, '').replace(/[\W_]+/g, '_').replace(/^_|_$/g, '');

	return `_${sanitisedPath}__${exportedName}`;
};
