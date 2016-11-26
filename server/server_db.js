var config = require("../config");
var mysql = require("mysql");

var DB = {};
DB.pool = mysql.createPool({
    connectionLimit : config.mysql.connections,
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    debug    :  false
});

DB.query = function(var1,var2,var3){

    var query_lenth = arguments.length;

    DB.pool.getConnection(function(err, connection) {
        if(err) {
            console.log('Error getting sql connection');
            console.dir(err);

            if(typeof connection !== "undefined")
                connection.release();
            var callback = null;

            if(query_lenth == 2){callback=var2;}else{callback=var3;}

            callback(err);
        }

        if(query_lenth == 2) {

            var query = var1;
            var callback = var2;

            //console.log('with 2 params');
            connection.query( query, function(err, rows) {
                connection.release();

                if(err) {
                    console.log('err:' + err);
                    callback(err, rows);
                }else{
                    callback(err, rows);
                }
            });
        } else if(query_lenth == 3){

            var query = var1;
            var data = var2;
            var callback = var3;

            // console.log('with 3 params:' + cb);
            connection.query( query, data, function(err, rows){
                connection.release();

                if(err) {
                    console.log('err:' + err);
                    callback(err, rows);
                }else{
                    callback(err, rows);
                }

            });
        }
    });
};

module.exports = DB;