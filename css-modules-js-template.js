CssModulesJsTemplate = {
	get: function get(tokens) {
		return `
var tokens = ${JSON.stringify(tokens)};
window.CssModules = {
	'import': function importStyles(path) {
		return tokens[path];
	}
};
`;
	}
};
