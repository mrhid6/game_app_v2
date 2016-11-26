var cluster = require('cluster');
var os = require('os');
var fs = require('fs');
var path = require('path');

var config = require("./config");

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

ServerAPP.global.DB = require("./server/server_db");


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
    }, config.general.timesyncInterval);

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

