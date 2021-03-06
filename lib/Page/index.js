let extendClass = require('../extendClass')
let path = require('path')

class Page {
	constructor(app, id) {
		this.id = id
		this.app = app
		this.url = id   // Unlike the id, url can be changed by the user
		this.baseName = path.basename(id)
		this.path = path.join(app.root, app.config.path.pages, this.id)

		let getComponentPath = extension => path.resolve(path.join(this.path, this.baseName + extension))

		this.controllerPath = getComponentPath('.js')
		this.templatePath = getComponentPath('.jade')
		this.stylePath = getComponentPath('.styl')
		this.scriptPath = getComponentPath('.client.js')
		this.markdownPath = getComponentPath('.md')
		this.jsonPath = getComponentPath('.json')
		this.linkedDataPath = getComponentPath('.jsonld')

		this.defaultParams = {
			app,
			page: this
		}
	}
}

module.exports = extendClass(Page, __dirname)