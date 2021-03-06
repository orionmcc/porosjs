import {fileRead} from './core';

export default class Template {
	constructor(path, templateDef) {
		this.meta = "";
		this.body = "";
		this.imports = templateDef.imports;
		this.collections = templateDef.collections;
		this.libs = templateDef.libs;
		this.styles = templateDef.styles;
		this.vars = templateDef.vars;

		let sections = templateDef.sections || {};
		for (let templ of sections.body) {
			console.log(`${path}/${templ}`);
			try {
				let templateData = fileRead(`${path}/${templ}.tmpl`);
				this.body += templateData;
			} catch (err) {
				console.error('could not read template file', `${path}/${templ}.tmpl`);
				console.log(err);
			}
		}

		for (let templ of sections.meta) {
			console.log(`${path}/${templ}`);
			try {
				let templateData = fileRead(`${path}/${templ}.tmpl`);
				this.meta += templateData;
			} catch (err) {
				console.error('could not read template file', `${path}/${templ}.tmpl`);
				console.log(err);
			}
		}

		//Unroll the style dependencies

		//Unroll the lib dependencies
	}

	getMeta() {
		return this.meta;
	}

	getBody() {
		return this.body;
	}

	getVars() {
		return this.vars;
	}

	getStyles() {
		return this.styles;
	}

	getLibs() {
		return this.libs;
	}

	getImports(name) {
		if(!name) return this.imports;
		return this.imports[name];
	}

	getCollections(name) {
		if(!name) return this.collections;
		return this.collections[name];
	}
}
