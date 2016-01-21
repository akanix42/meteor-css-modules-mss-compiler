var optionsFilePath = 'config/css-modules.json';

Package.describe({
	name: 'nathantreid:css-modules-mss-compiler',
	version: '0.6.0',
	// Brief, one-line summary of the package.
	summary: 'CSS modules MSS compiler.',
	// URL to the Git repository containing the source code for this package.
	git: 'https://github.com/nathantreid/meteor-css-modules-mss-compiler.git',
	// By default, Meteor will default to using README.md for documentation.
	// To avoid submitting documentation, set this field to null.
	documentation: 'README.md'
});

Package.onUse(function (api) {
	api.versionsFrom('1.2.0.1');
	api.use([
		'ecmascript',
		'nathantreid:css-modules-import-path-helpers@0.0.1',
		'ramda:ramda@0.17.1',
		'meteorhacks:npm@1.5.0'
	]);

	api.addAssets('default-options-file.json', 'server');

	api.addFiles([
		'options-loader.js',
		'plugins-loader.js',
		'css-modules-js-template.js',
		'css-modules-processor.js',
		'css-modules-build-plugin.js'
	]);

	api.export('ImportPathHelpers');
	api.export('CssModulesBuildPlugin');
});

Npm.depends(
	{
		"app-module-path": "1.0.4",
		"cjson": "0.3.3",
		"css-modules-loader-core": "1.0.0",
		"postcss": "5.0.10",
		"postcss-modules-local-by-default": "1.0.0",
		"postcss-modules-extract-imports": "1.0.0",
		"postcss-modules-scope": "1.0.0",
		"postcss-modules-values": "1.1.1",

	}
);

function shouldHaveOptionsFile() {
	var unAcceptableCommands = {'test-packages': 1, 'publish': 1};
	if (process.argv.length > 2) {
		var command = process.argv[2];
		if (unAcceptableCommands[command])
			return false;
	}

	return true;
}
