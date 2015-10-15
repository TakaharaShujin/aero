'use strict';

let Promise = require('bluebird');

class Server {
	constructor() {
		this.favIconData = null;
		this.regexRoutes = new Set();
		this.routes = {};
		this.raw = {};
		this.modifiers = [];
		this.protocol = '';
	}

	run(port, security, callBack) {
		if(security && security.key && security.cert) {
			this.protocol = 'https';
			this.httpServer = require('http2').createServer(security, this.handleRequest.bind(this));
		} else {
			this.protocol = 'http';
			this.httpServer = require('http').createServer(this.handleRequest.bind(this));
		}

		this.httpServer.listen(port, callBack);
	}

	stop() {
		let closeAsync = Promise.promisify(this.httpServer.close, this.httpServer);
		return closeAsync();
	}

	sendFavIcon(response) {
		// 404
		if(!this.favIconData) {
			response.writeHead(404);
			response.end();
			return;
		}

		// Send image data
		response.writeHead(200, {
			'Content-Type': 'image/x-icon'
		});
		response.end(this.favIconData);
	}

	removeParameters(url) {
		let paramsPosition = url.indexOf('?', 1);

		if(paramsPosition === -1)
			return url.substring(1);
		else
			return url.substring(1, paramsPosition);
	}

	execute(route, request, response) {
		// Execute handler
		if(this.modifiers.length === 0) {
			route(request, response, function() {
				console.log('next');
			});
		} else {
			let generateNext = function(index) {
				if(index === this.modifiers.length)
					return route.bind(undefined, request, response);

				return this.modifiers[index].bind(undefined, request, response, generateNext(index + 1));
			}.bind(this);

			generateNext(0)();
		}
	}

	handleRequest(request, response) {
		let url = request.url;

		// Favicon
		if(url === '/favicon.ico') {
			this.sendFavIcon(response);
			return;
		}

		// Remove traditional parameters: ?x=42
		url = this.removeParameters(url);

		// Always ignore trailing slashes
		if(url.endsWith('/'))
			url = url.slice(0, -1);

		let routes = null;

		if(url.startsWith('_')) {
			routes = this.raw;
			url = url.substring(2);
		} else {
			routes = this.routes;
		}

		// Determine which page has been requested
		let route = routes[url];

		if(route) {
			request.params = [];
			return this.execute(route, request, response);
		}

		// Remove right part of the URL and try again
		let slashPosition = url.length;

		while((slashPosition = url.lastIndexOf('/', slashPosition - 1)) !== -1) {
			let page = url.substring(0, slashPosition);
			route = routes[page];

			if(route) {
				request.params = url.substr(slashPosition + 1).split('/');
				return this.execute(route, request, response);
			}
		}

		// Search regex routes
		let match = null;

		for(let regexRoute of this.regexRoutes) {
			match = url.match(regexRoute.regEx);

			if(!match)
				continue;

			route = regexRoute.route;

			// We skip the first parameter because it just includes the full URL
			request.params = match.splice(1);
			return this.execute(route, request, response);
		}

		// Still not found? 404...
		response.writeHead(404);
		response.end();
	}
}

module.exports = Server;