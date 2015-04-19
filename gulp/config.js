module.exports = {
	browserify: {
		bundleConfigs: [{
			entries: './src/tokensec.js',
			dest: './dist',
			outputName: 'tokensec-crypto.js'
		},
		{
			entries: './dist/tokensec.min.js',
			dest: './dist',
			outputName: 'tokensec-crypto.min.js'
		}]
	},
	uglify: {
		src: './src/tokensec.js',
		dest: './dist',
	}
}	