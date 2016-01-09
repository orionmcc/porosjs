import fs from "fs";
import path from "path";
import Mustache from "mustache";

import DBAdapter from './mongo';
let DB = new DBAdapter();

function GetDefaults(type) {
	switch(type) {
		case 'text':
			return "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras ut mauris dui. Vestibulum in tortor molestie, dictum velit ut, finibus leo. Aenean vitae quam non nisi tristique facilisis eget nec dui. Donec leo odio, euismod ut mi a, pellentesque iaculis tortor. Aliquam leo velit, sodales blandit lectus eu, feugiat varius purus. Integer sed velit at felis ultrices luctus. Nullam sapien risus, tincidunt vitae pellentesque nec, vestibulum nec massa. Aenean laoreet et magna eu volutpat. Quisque scelerisque ligula in dapibus hendrerit. Nam vel condimentum sem. Nulla facilisi. Nullam nec ipsum nunc.";
		case 'img':
			return 'http://lorempixel.com/640/480/';
		case 'date':
			return '01/01/1970';
		case 'number':
			return Date.now().toString(10);
		default:
			return "Lorem ipsum dolor sit amet";
	}
}

async function getCollection(name) {
	let result = await DB.databaseGet('collections', name);
	return result;
}

export function fileRead(filePath) {
	return fs.readFileSync(filePath, 'utf8')
}


export function handleStaticAssets(site) {
	return function(req, res, next) {
		console.info(path.join(site+req.originalUrl));
		try {
				let data = fs.readFileSync(path.join(site+req.originalUrl));
				res.write(data);
		} catch(err) {
			console.error(err);
		}
		res.end();

		next();
	};
}

export function handleLib(site, libs) {
	return function(req, res, next) {
		console.log("Lib compose");
		let basename = path.basename(req.originalUrl, path.extname(req.originalUrl));
		let lib = libs[basename];
		for (let file of libs[basename]) {
				console.log('file', file, path.join(site+file));
				let data = fs.readFileSync(path.join(site+file), 'utf8');
				res.write(data);
		}
		res.end();

		next();
	}
};

export function handlePage(pageId, siteVars, getTemplate, getData) {
	return async function(req, res, next) {
		try {
			console.log("Render Page", pageId);

			let editable = true;

			let styles = '';
			let scripts = '';

			let Template = getTemplate();
			const pageVars = getTemplate().getVars();

			//Pull the global data
			let SITEDATA = await DB.databaseGet('pages', '_GLOBALS');

			//Style Injection
			for (let style of Template.getStyles()) {
				styles = `<link rel='stylesheet' href='/styles/${style}.css'>`;
				console.log('styles', styles);
			}

			//Js injection (this gets expanded and served by the router)
			for (let lib of Template.getLibs()) {
				scripts = `<script async="" src="/lib/${lib}.js"></script>`;
				console.log('scripts', scripts);
			}

			//Attach page vars
			let Page = {};
			let PAGEDATA = await DB.databaseGet('pages', 'page', pageId);

			//Page styles Injection
			if (PAGEDATA.cssinjection) {
				styles += `<style>${PAGEDATA.cssinjection}</style`;
			}


			//Attach imported data
			let imports = {};
			for (let name in Template.getImports()) {
				imports[name] = getData(Template.getImports(name));
			}

			//Attach collections
			let collections = {};
			for (let name in Template.getCollections()) {
				collections[name] = await getCollection(Template.getCollections(name));
			}

			//fill in with defaults based on type
			for (let n in pageVars) {
				const type = pageVars[n];
				const name = n[0] == '_' ? n.substr(1) : n;
				if(!PAGEDATA[0][name]) {
					PAGEDATA[0][name] = GetDefaults(type);
				}

				if (editable
					&& type != 'img'
					&& n[0] != '_') {
					PAGEDATA[0][name] = `<span class='editable' data-key='page' data-id='${pageId}' data-name='${name}'>`+PAGEDATA[0][name]+"</span>";
				}
			}

			//Inject editing code
			if (editable) {
				for (let name in SITEDATA[0]) {
					SITEDATA[0][name] = `<span class='editable' data-key='_GLOBALS' data-name='${name}'>`+SITEDATA[0][name]+"</span>";
				}

				styles += "<link rel='stylesheet' href='/porosedit.css'>";
				styles += "<link rel='stylesheet' href='/editor/skin.min.css'>";
				scripts += "<script async='' src='/porosedit.js'></script>";
			} else {

			}

			//Look for templates + concat
			let composedTemplate = `<!DOCTYPE html><html><head>${styles}${scripts}${Template.getMeta()}</head><body>${Template.getBody()}</body></html>`;


			//Render the final page
			let view = {
				...SITEDATA[0],
				...PAGEDATA[0],
				...imports,
				...collections
			};
			console.log(view);
			let output = Mustache.render(composedTemplate, view);
			res.send(output);
		} catch(ex) {
			console.error(e);
		}
		next();
	};
}
