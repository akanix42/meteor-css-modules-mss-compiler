var postcss = Npm.require('postcss');
var Parser = Npm.require('css-modules-loader-core/lib/parser');

CssModulesProcessor = class CssModulesProcessor {
	constructor(root, pluginsAndOptions) {
		this.root = root;
		this.importNr = 0;
		this.plugins = pluginsAndOptions.plugins;
		this.options = pluginsAndOptions.options;
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
						resolve({source: injectableSource, tokens: tokens, sourceMap: sourceMap});
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
			} catch (e) {
				throw new Error(`CSS Modules: unable to read file ${importPath}: ${JSON.stringify(e)}`);
			}
		}
	}

	load(sourceString, sourcePath, trace, pathFetcher) {
		let parser = new Parser(pathFetcher, trace);
		let simpleVariables = {};
		var plugins = this.plugins.slice();
		setUpSimpleVarsExtraction(this.options, plugins);

		return postcss(plugins.concat([parser.plugin]))
			.process(sourceString, {
				from: sourcePath,
				to: sourcePath.replace('\.mss$', '.css'),
				map: {inline: false}
			})
			.then(result => {
				return {
					injectableSource: result.css,
					exportTokens: R.merge(simpleVariables, parser.exportTokens),
					sourceMap: result.map
				};
			});

		function setUpSimpleVarsExtraction(options, plugins) {
			if (options.extractSimpleVars === false) return;

			var findSimpleVarsPlugin = R.findIndex(plugin=>plugin.postcss && plugin.postcss.postcssPlugin === 'postcss-simple-vars');
			var pluginIndex = findSimpleVarsPlugin(plugins)

			if (pluginIndex === -1) return;

			let appendPrefixToVariableNames = R.compose(R.fromPairs, R.map(pair=> {
				pair[0] = '$' + pair[0];
				return pair;
			}), R.toPairs);
			plugins[pluginIndex] = plugins[pluginIndex](R.merge(plugins[pluginIndex].options, {
					onVariables: variables => simpleVariables = appendPrefixToVariableNames(variables) || {}
				}
			));
		}
	}
};
