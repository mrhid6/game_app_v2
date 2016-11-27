var cluster = require('cluster');
var os = require('os');
var fs = require('fs');
var path = require('path');

var loader = require("./loader");
var config = loader.config;
var logger = loader.logger;

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

            logger.debug(JSON.stringify(msg));

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

    var sigkill = false;

    cluster.on('exit', function(worker) {
        if (sigkill) {
            logger.warning("SIGINT received - not respawning workers");
            return;
        }
        var newWorker = cluster.fork();
        logger.warning('Worker ' + worker.process.pid + ' died and it will be re-spawned');

        removeWorkerFromListByPID(worker.process.pid);
        WorkerList.push(newWorker);
    });

    process.on('SIGUSR2',function(){
        console.log("Received SIGUSR2 from system");
        console.log("There are " + WorkerList.length + " workers running");
        Utils.sendPacketToWorkers(WorkerList, "packet.master.exit", null);
        setTimeout(function() {process.exit(0); }, 300);
    });

    process.on('SIGINT', function() {
        logger.warning('Shutting Down Cluster');
        sigkill = true;
        Utils.sendPacketToWorkers(WorkerList, "packet.master.exit",null);
        setTimeout(function() {process.exit(0); }, 300);
    });

    function sendPlayerListToWorkers(){
        Utils.sendPacketToWorkers(WorkerList, "packet.master.sync.playerlist", MasterPlayerList);
    }

    function removeWorkerFromListByPID(pid) {
        var counter = -1;
        WorkerList.forEach(function(worker){
            ++counter;
            if (worker.process.pid === pid) {
                WorkerList.splice(counter, 1);
            }
        });
    }
}

if (cluster.isWorker) {

    var workerID = cluster.worker.id;
    var Worker = require("./server/server_worker");

    var WrkAPP = new Worker();
    ServerAPP.workers[workerID] = WrkAPP;

    WrkAPP.init(ServerAPP.global, cluster.worker);

}