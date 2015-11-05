Package.describe({
	name: 'nathantreid:css-modules-mss-compiler',
	version: '0.1.0',
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
		'nathantreid:css-modules-import-path-helpers@0.0.1'
	]);

	api.addFiles([
		'css-modules-js-template.js',
		'css-processor.js',
		'css-modules-compiler.js'
	]);

	api.export("ImportPathHelpers");
	api.export("CssModulesCompiler");
});


Npm.depends({
	'css-modules-loader-core': '1.0.0'
});
