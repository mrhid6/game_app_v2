
var DB = require("./server_db");

var PacketList = require("./server_packetlist.js");
var PlayerHandler = require("./server_playerhandler.js");
var AntiSpam = require("./server_antispam");
var World = require("./server_world");
var Utils = require("./server_utils");

var Network = {};

Network.generateClientUID = function(){
    return Utils.generateUUID("XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX");
};

Network.onConnection = function (socket) {
    var clientIp = socket.request.connection.remoteAddress;
    socket.badpacketcount = 0;
    socket.clientid = Network.generateClientUID();
    console.log('new connection from: ' + clientIp+ " on worker:"+Utils.getWorkerID() + " client id: "+socket.clientid);
    socket.emit("packet.server.init.client",{cid:socket.clientid});
};

Network.onDisconnect = function (socket) {
    PlayerHandler.setup.removePlayer(DB, socket.id);
    console.log("Client Disconnected!");
};

Network.isInPacketList = function (event) {
    return PacketList.indexOf(event) != -1;
};

Network.handlePacket = function (socket, event, data) {

    if (!Network.isInPacketList(event)) {
        console.log("Packet was not recognised! " + event + " count:" + socket.badpacketcount);

        if (socket.badpacketcount != null && socket.badpacketcount >= 10) {
            console.log("Client was kicked!");
            socket.emit("packet.server.player.kick", {reason: "Too Many Bad Packets!"});
            socket.disconnect();
        }

        socket.badpacketcount++;

        return;
    }

    if(data.cid == null || data.cid != socket.clientid){
        console.log("Client was kicked! client id didn't match");
        socket.emit("packet.server.player.kick", {reason: "Packet Was Tampered With!"});
        socket.disconnect();
        return;
    }


    AntiSpam.addSpam(socket);

    console.log(event);
    console.log(data);

    var player;

    if (event == "packet.client.player.signin") {
        PlayerHandler.signinUser(DB, socket, data, function (result) {
            if (!result.success) {
                socket.emit("packet.server.player.signin.failed", {result: result});
            } else {
                var player = PlayerHandler.get.playerfromid(result.user.id);
                if (player != null && player.managed) {
                    World.net.sendPlayerMap(PlayerHandler.Socket_List[player.id],player);
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

        player = PlayerHandler.get.playerfromid(data.id);
        if (player != null && player.managed) {
            var pack = Utils.toGridPosition(data.x, data.y);
            player.setMoveTo(pack.x, pack.y);

            if(player.movement.length > 0) {
                PlayerHandler.setup.sendToPlayer(player, "moveto", {d: player.movement});
                PlayerHandler.setup.sendShadows();
            }
        }
    }

    if (event == "packet.client.player.completemove") {
        /* Client has moved the new location successfully
         * But we dont trust the client that he is the correct location
         * so we check the position the client sent us and check with what was proposed.
         * if data is not valid we need to resync it.
         */

        player = PlayerHandler.get.playerfromid(data.id);
        if (player != null && player.managed) {
            player.validateMove(data.x, data.y);

            if(World.checkPlayerOnTeleport(player)){
                console.log("Player:"+player.id+" is on teleport!");
            }

            PlayerHandler.setup.sendShadows();
            PlayerHandler.setup.savePlayer(DB, player);
        }
    }

    if (event == "packet.client.player.completeAStarNode") {
        player = PlayerHandler.get.playerfromid(data.id);
        if (player != null && player.managed) {

            if(player.hasMovement()) {

                var movement = player.movement;
                var node = movement[data.ni];

                var grid_pos = Utils.toGridPosition(data.x, data.y);

                if(node != null && (grid_pos.x == node[1] * 32 && grid_pos.y == node[0] * 32) ) {
                    player.setPosition(data.x, data.y);
                }
            }
        }

        PlayerHandler.setup.sendShadows();
    }

    if (event == "packet.client.clientfocused") {
        player = PlayerHandler.get.playerfromid(data.id);
        if (player != null && player.managed) {
            player.setFocused(true);
            PlayerHandler.setup.sendShadows();
        }
    }
    if (event == "packet.client.clientblured") {
        player = PlayerHandler.get.playerfromid(data.id);
        if (player != null && player.managed) {
            player.setFocused(false);
            PlayerHandler.setup.sendShadows();
        }
    }
};

module.exports = Network;