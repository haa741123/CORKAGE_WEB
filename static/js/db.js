var mysql = require('mysql2');
var db = mysql.createConnection({
    host: '121.142.17.86',
    user: 'admin',
    password: 'lg159753',
    database: 'CORKAGE_LIST'
});
db.connect();

module.exports = db;