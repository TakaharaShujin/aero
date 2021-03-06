let fs = Promise.promisifyAll(require('fs'))
let path = require('path')
let babel = require('babel-core')
let uglifyJS = require('uglify-js')

const uglifyJSOptions = {
	fromString: true,
	compress: {
		screw_ie8: true
	},
	mangle: {
		screw_ie8: true
	}
}

const babelOptions = {
	plugins: [
		'babel-plugin-transform-es2015-template-literals',
		'babel-plugin-transform-es2015-literals',
		'babel-plugin-transform-es2015-function-name',
		'babel-plugin-transform-es2015-arrow-functions',
		'babel-plugin-transform-es2015-block-scoped-functions',
		'babel-plugin-transform-es2015-classes',
		'babel-plugin-transform-es2015-object-super',
		'babel-plugin-transform-es2015-shorthand-properties',
		'babel-plugin-transform-es2015-computed-properties',
		'babel-plugin-transform-es2015-for-of',
		'babel-plugin-transform-es2015-sticky-regex',
		'babel-plugin-transform-es2015-unicode-regex',
		'babel-plugin-check-es2015-constants',
		'babel-plugin-transform-es2015-spread',
		'babel-plugin-transform-es2015-parameters',
		'babel-plugin-transform-es2015-destructuring',
		'babel-plugin-transform-es2015-block-scoping'
	].map(pluginName => {
		// For backwards compatibility:
		// On older babel versions these need to be included directly,
		// on newer ones a string array is expected.
		try {
			return require(pluginName)
		} catch(e) {
			return pluginName
		}
	})
}

let minify = function(source, file) {
	// Translate ES 2015 to standard JavaScript
	source = babel.transform(source, Object.assign({
		filename: file
	}, babelOptions)).code

	// Minify
	source = uglifyJS.minify(source, Object.assign({
		parse: {
			filename: file
		}
	}, uglifyJSOptions)).code

	return source
}

module.exports = function*(file) {
	file = path.resolve(file)

	try {
		if(this.cache) {
			let cached = this.cache.scripts[file]

			if(cached && (yield fs.statAsync(file)).mtime <= new Date(cached.mtime))
				return cached.code
		}

		let source = yield fs.readFileAsync(file, 'utf8')

		if(!path.basename(file).endsWith('.min.js'))
			source = minify(source, file)

		// Cache it
		if(this.cache) {
			this.cache.scripts[file] = {
				code: source,
				mtime: (new Date()).toISOString()
			}
		}

		return source
	} catch(e) {
		if(e.code !== 'ENOENT' || e.path !== file)
			this.log(e)

		return null
	}
}
