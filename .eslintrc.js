module.exports = {
	root: true,
	env: {
		browser: false,
		es6: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
	},
	plugins: ['@typescript-eslint'],
	extends: [
		'eslint:recommended',
	],
	rules: {
		'prefer-const': 'error',
		'no-var': 'error',
		'no-unused-vars': 'off', // TypeScript handles this
	},
	ignorePatterns: ['dist/**', '*.js'],
};
