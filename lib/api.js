
import DBAdapter from './mongo';
let DB = new DBAdapter();

export async function postData(req, res, next) {
	let {key, range, name, value} = req.body;
	let data = {};
	data[name] = value;
	range = parseInt(range);
	if (isNaN(range)) range = null;
	console.log('range',range, typeof range);

	console.log('UPDATE DATA VAR', key, range, data);

	try {
		await DB.databasePut('pages', key, range, data);

		let x = await DB.databaseGet('pages', key, range);
		console.log(x);
	} catch(err) {
		return next(err);
	}

	res.sendStatus(200);
	next();
}
