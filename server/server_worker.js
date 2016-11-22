
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require('socket.io-redis');
var path = require('path');
var Player = require('./server_player');
var Utils = require('./server_utils');

io.adapter(redis({ host: 'localhost', port: 6379 }));

var Worker = function() {

    var self = this;


    self.World = require("./server_world");
    self.PlayerHandler = require("./server_playerhandler.js");
    self.PacketList = require("./server_packetlist.js");
    self.AntiSpam = require("./server_antispam");

    self.init = function (APPGlobal, worker) {
        self.worker = worker;
        self.id = worker.id;
        self.globalRef = APPGlobal;
        self.options = {
            serverPort: self.globalRef.options.serverPort
        };

        self.setup.startServer();
        self.setup.startClientListener();
    };

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
                console.log('Worker (%s) up and running at %s port', self.id, self.options.serverPort);
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

    self.net = {
        isInPacketList: function (event) {
            return self.PacketList.indexOf(event) != -1;
        },
        handlePacket: function (socket, event, data) {

            if (!self.net.isInPacketList(event)) {
                console.log("Packet was not recognised! " + event + " count:" + socket.badpacketcount);

                if (socket.badpacketcount != null && socket.badpacketcount >= 10) {
                    console.log("Client was kicked!");
                    socket.emit("packet.server.player.kick", {reason: "Too Many Bad Packets!"});
                    socket.disconnect();
                }

                socket.badpacketcount++;

                return;
            }

            self.AntiSpam.addSpam(socket);

            console.log(event);
            console.log(data);

            var player;

            if (event == "packet.client.player.signin") {
                self.PlayerHandler.signinUser(self.globalRef.DB, socket, data, function (result) {
                    if (!result.success) {
                        socket.emit("packet.server.player.signin.failed", {result: result});
                    } else {
                        var player = self.PlayerHandler.get.playerfromid(result.user.id);
                        if (player != null) {
                            self.World.net.sendPlayerMap(self.PlayerHandler.Socket_List[player.id],player);
                        }
                    }
                });
            }

            if (event == "packet.client.click") {

                /* client requested to move player to their mouse position;
                 * first translate mouse position to grid position (astar pathfinding).
                 * add the proposed movement to the server player so it can be double checked when the move is complete.
                 * then send packet with new position to client.
                 */

                player = self.PlayerHandler.get.playerfromid(data.id);
                if (player != null) {
                    var pack = toGridPosition(data.x, data.y);
                    player.setMoveTo(pack.x, pack.y);
                    self.PlayerHandler.setup.sendToPlayer(player, "moveto", {d: player.movement});
                    self.PlayerHandler.setup.sendShadows();
                }
            }

            if (event == "packet.client.player.completemove") {
                /* Client has moved the new location successfully
                 * But we dont trust the client that he is the correct location
                 * so we check the position the client sent us and check with what was proposed.
                 * if data is not valid we need to resync it.
                 */

                player = self.PlayerHandler.get.playerfromid(data.id);
                if (player != null) {
                    player.validateMove(data.x, data.y);

                    if(self.World.checkPlayerOnTeleport(player)){
                        console.log("Player:"+player.id+" is on teleport!");
                    }

                    self.PlayerHandler.setup.sendShadows();
                    self.PlayerHandler.setup.savePlayer(self.globalRef.DB, player);
                }
            }

            if (event == "packet.client.player.completeAStarNode") {
                player = self.PlayerHandler.get.playerfromid(data.id);
                if (player != null) player.setPosition(data.x, data.y);

                self.PlayerHandler.setup.sendShadows();
            }

            if (event == "packet.client.clientfocused") {
                player = self.PlayerHandler.get.playerfromid(data.id);
                if (player != null) {
                    player.setFocused(true);
                    self.PlayerHandler.setup.sendShadows();
                }
            }
            if (event == "packet.client.clientblured") {
                player = self.PlayerHandler.get.playerfromid(data.id);
                if (player != null) {
                    player.setFocused(false);
                    self.PlayerHandler.setup.sendShadows();
                }
            }
        },
        onConnection: function (socket) {
            var clientIp = socket.request.connection.remoteAddress;
            console.log('new connection from: ' + clientIp+ "on worker:"+self.id);

            socket.badpacketcount = 0;
        },
        onDisconnect: function (socket) {
            self.PlayerHandler.setup.removePlayer(self.globalRef.DB, socket.id);
            console.log("Client Disconnected!");
        }
    };

    self.cleanup = function () {
        console.log('Worker Closing!');
        self.PlayerHandler.cleanup.cleanupPlayers();
        self.PlayerHandler.setup.savePlayers(self.globalRef.DB);
        self.PlayerHandler.cleanup.cleanupHandler();
        console.log('Worker Closed!');
    };

    return self;
};


function toGridPosition(x, y){

    var ret_x = Math.floor(x / 32) * 32;
    var ret_y = Math.floor(y / 32) * 32;

    return {x: ret_x, y: ret_y}
}


module.exports = Worker;