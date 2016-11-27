
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require('socket.io-redis');
var path = require('path');
var Player = require('./server_player');
var Utils = require('./server_utils');

var loader = require("../loader");
var logger = loader.logger;

io.adapter(redis({ host: 'localhost', port: 6379 }));

var Worker = function() {

    var self = this;


    self.World = require("./server_world");
    self.PlayerHandler = require("./server_playerhandler.js");
    self.AntiSpam = require("./server_antispam");

    self.init = function (APPGlobal, worker) {
        self.worker = worker;
        self.id = worker.id;
        self.globalRef = APPGlobal;
        self.options = {
            serverPort: self.globalRef.options.serverPort
        };

        worker.on("message", function(msg){

            if(msg.task == "packet.master.mapdata"){
                var mapdata = msg.data;
                self.World.setMaps(mapdata);
            }

            if(msg.task == "packet.master.synctime"){
                self.syncTime(msg.data);
            }

            if(msg.task == "packet.master.antispam.check"){
                self.AntiSpam.checkSpam();
            }

            if(msg.task == "packet.master.sync.playerlist"){
                self.PlayerHandler.resyncPlayerList(msg.data);
            }
        });

        self.setup.startServer();
        self.setup.startClientListener();
    };

    self.net = require("./server_network");

    self.syncTime = function(time){
        self.World.updateClock(time);
    };

    self.setup = {
        startServer: function () {

            app.get('/', function (req, res) {
                res.sendFile(path.resolve(__dirname + '/../client/index.html'));
            });

            app.use("/client", express.static(__dirname + '/../client'));

            http.listen(self.options.serverPort, function () {
                logger.info("Worker ["+self.id+"] up and running at "+self.options.serverPort+" port");
            });
        },
        startClientListener: function () {
            io.sockets.on('connection', function (socket) {

                self.net.onConnection(socket);

                socket.on("disconnect", function () {
                    self.net.onDisconnect(socket);
                });

                var onevent = socket.onevent;
                socket.onevent = function (packet) {
                    var args = packet.data || [];
                    onevent.call(this, packet);    // original call
                    packet.data = ["*"].concat(args);
                    onevent.call(this, packet);      // additional call to catch-all
                };

                socket.on("*", function (event, data) {
                    self.net.handlePacket(socket, event, data);
                });

            });
        }
    };

    self.cleanup = function () {
        logger.warning("Worker ["+self.id+"] Closing!");
        self.PlayerHandler.cleanup.cleanupPlayers();
        self.PlayerHandler.setup.savePlayers(self.globalRef.DB);
        self.PlayerHandler.cleanup.cleanupHandler();
        logger.warning("Worker ["+self.id+"] Closed!");
    };

    return self;
};


module.exports = Worker;