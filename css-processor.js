const Core = Npm.require('css-modules-loader-core');
const path = Plugin.path;
const fs = Plugin.fs;

// Sorts dependencies in the following way:
// AAA comes before AA and A
// AB comes after AA and before A
// All Bs come after all As
// This ensures that the files are always returned in the following order:
// - In the order they were required, except
// - After all their dependencies
const traceKeySorter = (a, b) => {
	if (a.length < b.length) {
		return a < b.substring(0, a.length) ? -1 : 1
	} else if (a.length > b.length) {
		return a.substring(0, b.length) <= b ? -1 : 1
	} else {
		return a < b ? -1 : 1
	}
};

CssProcessor = class CssProcessor {
	constructor(root, plugins) {
		this.root = root;
		this.sources = {};
		this.importNr = 0;
		this.core = new Core(plugins);
		this.tokensByFile = {};
	}

	process(source, relativeTo, allFiles) {
		return processInternal.call(this, source, relativeTo);

		function processInternal(source, relativeTo, _trace) {
			relativeTo = relativeTo.replace(/.*(\{.*)/, '$1').replace(/\\/g, '/');
			source = getSourceContents(source, relativeTo);
			var trace = _trace || String.fromCharCode(this.importNr++);

			return new Promise((resolve, reject) => {
				var relativeDir = path.dirname(relativeTo);
				var rootRelativePath = path.resolve(relativeDir, source.path);
				const tokens = this.tokensByFile[source.path];
				if (tokens)
					return resolve(tokens);

				this.core.load(source.contents, rootRelativePath, trace, processInternal.bind(this))
					.then(({ injectableSource, exportTokens }) => {
						this.sources[trace] = injectableSource;
						this.tokensByFile[source.path] = exportTokens;
						resolve({source: injectableSource, tokens: exportTokens});
					}, reject);
			});

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
					throw `CSS Modules: unable to read file ${importPath}: ${JSON.stringify(e)}`;
				}

			}
		}
	}

	get finalSource() {
		return Object.keys(this.sources).sort(traceKeySorter).map(s => this.sources[s])
			.join("")
	}
};
