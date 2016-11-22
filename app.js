var cluster = require('cluster');
var os = require('os');
var mysql = require("mysql");
var fs = require('fs');
var path = require('path');

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
    }
};

ServerAPP.global.setup.startDatabase();


if (cluster.isMaster) {

    var server = require('http').createServer();
    var io = require('socket.io').listen(server);
    var redis = require('socket.io-redis');
    var Utils = require('./server/server_utils');

    io.adapter(redis({ host: 'localhost', port: 6379 }));

    var WorkerList = [];

    var MasterPlayerList = {};

    for (var i = 0; i < os.cpus().length; i++) {
        var worker = cluster.fork();
        WorkerList.push(worker);

        worker.on('message', function(msg) {

            if(msg.task == "packet.worker.playerlist.newplayer"){
                var p = msg.data;
                p.workerid = msg.workerid;

                MasterPlayerList[p.id] = p;
                sendPlayerListToWorkers();
            }

            if(msg.task == "packet.worker.playerlist.updateplayer"){
                var p = MasterPlayerList[msg.data.id];
                if(p != null){
                    var tp = msg.data;
                    tp.workerid = msg.workerid;
                    MasterPlayerList[p.id] = tp;

                    sendPlayerListToWorkers();
                }
            }

            if(msg.task == "packet.worker.playerlist.removeplayer"){
                var p = MasterPlayerList[msg.data.id];
                if(p != null){
                    delete MasterPlayerList[msg.data.id];
                    sendPlayerListToWorkers();
                }
            }
        });
    }

    var WorldMaps = Utils.loadServerMaps();
    Utils.sendPacketToWorkers(WorkerList, "packet.master.mapdata", WorldMaps);

    setInterval(function(){
        var d = new Date();
        var t = d.getTime();
        Utils.sendPacketToWorkers(WorkerList, "packet.master.synctime", t);
    }, 10000);

    setInterval(function(){
        Utils.sendPacketToWorkers(WorkerList, "packet.master.antispam.check", null);
    },1000);

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });

    function sendPlayerListToWorkers(){
        Utils.sendPacketToWorkers(WorkerList, "packet.master.sync.playerlist", MasterPlayerList);
    }
}

if (cluster.isWorker) {

    var workerID = cluster.worker.id;
    var Worker = require("./server/server_worker");

    var WrkAPP = new Worker();
    ServerAPP.workers[workerID] = WrkAPP;

    WrkAPP.init(ServerAPP.global, cluster.worker);

    cluster.worker.on("message", function(msg){

        if(msg.task == "packet.master.mapdata"){
            var mapdata = msg.data;
            WrkAPP.World.setMaps(mapdata);
        }

        if(msg.task == "packet.master.synctime"){
            WrkAPP.syncTime(msg.data);
        }

        if(msg.task == "packet.master.antispam.check"){
            WrkAPP.AntiSpam.checkSpam();
        }

        if(msg.task == "packet.master.sync.playerlist"){
            WrkAPP.PlayerHandler.resyncPlayerList(msg.data);
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


function splitArray(array, part) {
    var tmp = [];
    for(var i = 0; i < array.length; i += part) {
        tmp.push(array.slice(i, i + part));
    }
    return tmp;
}
