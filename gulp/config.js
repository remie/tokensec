module.exports = {
	browserify: {
		// A separate bundle will be generated for each
		// bundle config in the list below
		bundleConfigs: [{
			entries: './src/tokensec.js',
			dest: './dist',
			outputName: 'tokensec.js'
		}]
	},
}	