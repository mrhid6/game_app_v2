var cluster = require('cluster');
var os = require('os');
var mysql = require("mysql");
var fs = require('fs');
var path = require('path');

var Player = require("./server/server_player");

var ServerAPP = {
    global: {
        options: {
            serverPort: 3001
        },
        clock: null,
        worldMaps: {}
    },
    workers: []
};

ServerAPP.global.setup = {
    startDatabase: function(){
        ServerAPP.global.DB = {};
        ServerAPP.global.DB.pool = mysql.createPool({
            connectionLimit : 100,
            host: "localhost",
            user: "node_admin",
            password: "Teddy1",
            database: "nodejs_game",
            debug    :  false
        });
        ServerAPP.global.DB.query = function(var1,var2,var3){

            var query_lenth = arguments.length;

            ServerAPP.global.DB.pool.getConnection(function(err, connection) {
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
    },
    loadServerMaps: function(){
        listFromDir("./server/maps", ".json", function(file){
            var worldmaps = ServerAPP.global.worldMaps;
            var fileName = file.split("/").pop(-1);
            var mapid = fileName.replace("map","").replace(".json","");

            worldmaps["map"+mapid] = {
                width: 0,
                height: 0,
                layers: [],
                tilesets: []
            };

            var map = worldmaps["map"+mapid];
            var mapRawJSON = JSON.parse(fs.readFileSync(file, 'utf8'));

            map.width = mapRawJSON.width;
            map.height = mapRawJSON.height;

            for (j in mapRawJSON.layers){
                var layer = mapRawJSON.layers[j];

                var newLayer = {};

                newLayer.name = layer.name;

                var result = createArray(map.width, map.height);
                for (var row = 0; row < map.height; ++row) {
                    for (var column = 0; column < map.width; ++column) {
                        var tileid = layer.data[row * map.width + column];

                        if(layer.name == "collision"){
                            if(tileid > 0){
                                tileid = 0;
                            }else{
                                tileid = 1;
                            }
                        }

                        result[column][row] = tileid;
                    }
                }
                newLayer.data = result;

                console.log(newLayer.data);
                map.layers.push(newLayer);
            }

            for (j in mapRawJSON.tilesets){
                var tileset = mapRawJSON.tilesets[j];
                var newTileset = {};

                newTileset.img = tileset.image;
                newTileset.name = tileset.name;
                newTileset.startTile = tileset.firstgid;
                newTileset.endTile = newTileset.startTile + (tileset.tilecount - 1);

                map.tilesets.push(newTileset);
            }
        });
    }
};

ServerAPP.global.setup.startDatabase();


if (cluster.isMaster) {
    // we create a HTTP server, but we do not use listen
    // that way, we have a socket.io server that doesn't accept connections
    var server = require('http').createServer();
    var io = require('socket.io').listen(server);
    var redis = require('socket.io-redis');

    io.adapter(redis({ host: 'localhost', port: 6379 }));

    ServerAPP.global.setup.loadServerMaps();
    var MapsStr = JSON.stringify({packet:"mapdata", data:ServerAPP.global.worldMaps});

    var WorkerList = [];

    var GlobalPlayerList = {};

    var findGlobalPlayer = function(pid){
        for(var i in GlobalPlayerList){
            var p = GlobalPlayerList[i];

            if(p.id == pid){
                return p;
            }
        }
        return null;
    };

    for (var i = 0; i < os.cpus().length; i++) {
        var worker = cluster.fork();
        WorkerList.push(worker);
    }

    for(i in WorkerList){
        var worker = WorkerList[i];
        worker.send(MapsStr);
    }

    setInterval(function(){
        var d = new Date();
        var t = d.getTime();

        for(i in WorkerList){
            var worker = WorkerList[i];
            worker.send(JSON.stringify({packet: "syncTime", data: t}));
        }
    }, 10000);

    setInterval(function(){
        for(i in WorkerList){
            var worker = WorkerList[i];
            worker.send(JSON.stringify({packet: "antispam.check"}));
        }
    },1000);

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });
}

if (cluster.isWorker) {

    var workerID = cluster.worker.id;
    var Worker = require("./server/server_worker");

    var WrkAPP = new Worker();
    ServerAPP.workers[workerID] = WrkAPP;

    WrkAPP.init(ServerAPP.global, cluster.worker);

    cluster.worker.on("message", function(data){

        var JsonPacket = JSON.parse(data);

        if(JsonPacket.packet == "mapdata"){
            var mapdata = JsonPacket.data;
            WrkAPP.World.setMaps(mapdata);
        }

        if(JsonPacket.packet == "syncTime"){
            WrkAPP.syncTime(JsonPacket.data);
        }

        if(JsonPacket.packet == "antispam.check"){
            WrkAPP.AntiSpam.checkSpam();
        }
    });

}

function exitHandler(options, err) {
    if (options.cleanup){
        for(var i in ServerAPP.workers){
            var worker = ServerAPP.workers[i];
            worker.cleanup();
        }
    }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));


function listFromDir(startPath, filter, callback){

    //console.log('Starting from dir '+startPath+'/');

    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath);
        return;
    }

    var files=fs.readdirSync(startPath);
    for(var i=0;i<files.length;i++){
        var filename=path.join(startPath,files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()){
            fromDir(filename,filter); //recurse
        }
        else if (filename.indexOf(filter)>=0) {
            callback(filename);
        }
    }
}

function splitArray(array, part) {
    var tmp = [];
    for(var i = 0; i < array.length; i += part) {
        tmp.push(array.slice(i, i + part));
    }
    return tmp;
}

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}