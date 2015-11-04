CssModulesJsTemplate = {
	get: function get(tokens) {
		return `
var tokens = ${JSON.stringify(tokens)};
CssModules = {
	'import': function importStyles(path) {
		return tokens[path];
	}
};
`;
	}
};
