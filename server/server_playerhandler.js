var cluster = require("cluster");
var loader = require("../loader");
var logger = loader.logger;

var Player = require("./server_player.js");
var RefPlayer = require("./server_refplayer.js");

var Utils = require("./server_utils");

var PlayerManager = {};
PlayerManager.Player_List = {};
PlayerManager.Socket_List = {};

PlayerManager.settings = {};

PlayerManager.signinUser = function(db, socket, data, cb){
    var res = {};

    if(data.username != "" && data.password != "") {
        db.query("SELECT * FROM users WHERE user_username=? AND user_password=?", [data.u, data.p], function (err, rows) {
            if (err) throw err;

            if(rows.length == 1) {
                var row = rows[0];
                row.user_password = null;

                res.success = true;

                var newUser = {
                    id: row.user_id,
                    username: row.user_username,
                    x: row.user_x,
                    y: row.user_y,
                    char_id: row.user_char_id,
                    mapid: row.user_mapid,
                    moving:false,
                    changed:false,
                    focused:true
                };

                res.user = newUser;

                PlayerManager.setup.createNewPlayer(socket, newUser);



                cb(res);
            }else{
                res.success = false;
                res.reason = "invalid details";
                cb(res);
            }
        });
    }else{
        res.success = false;
        res.reason = "missing data";
        cb(res);
    }

};

PlayerManager.setup = {
    createNewPlayer: function(socket, user){
        socket.id = user.id;

        var player = new Player(user);
        PlayerManager.Player_List[user.id] = player;
        PlayerManager.Socket_List[user.id] = socket;

        PlayerManager.setup.sendToPlayer(player, "initdata", player.getInitData());

        Utils.sendPacketToMaster("packet.worker.playerlist.newplayer", player.getShadowData());
        PlayerManager.setup.sendShadows();
    },

    sendToPlayer: function(player, name, data){

        var socket = PlayerManager.Socket_List[player.id];
        if(socket != null) {
            socket.emit("packet.server.player." + name, data);
        }
    },

    sendToAll: function(name, data){
        for(i in PlayerManager.Player_List) {
            player = PlayerManager.Player_List[i];

            PlayerManager.setup.sendToPlayer(player, name, data);
        }
    },
    sendShadows: function(){
        var shadow_pack = [];

        var i, player;

        for(i in PlayerManager.Player_List){
            player = PlayerManager.Player_List[i];
            shadow_pack.push(player.getShadowData());
        }
        for(i in PlayerManager.Player_List){
            player = PlayerManager.Player_List[i];

            var newpack = [];

            for(var j in shadow_pack){
                var d = shadow_pack[j];

                if(d.id != player.id && d.mapid == player.mapid){
                    newpack.push(d);
                }
            }

            var packStr = JSON.stringify(newpack);

            if(player.managed && player.lastShadowStr != packStr) {
                PlayerManager.setup.sendToPlayer(player,"shadows", newpack);
                player.lastShadowStr = packStr;
            }
        }
    },
    removePlayer: function(db, id){
        var player = PlayerManager.get.playerfromid(id);
        if(player != null) {
            logger.log("Remove Player "+id);
            PlayerManager.setup.savePlayer(db, player);
            delete PlayerManager.Player_List[id];
            Utils.sendPacketToMaster("packet.worker.playerlist.removeplayer", {id: id});

            PlayerManager.setup.sendShadows();
        }
    },
    savePlayers: function(db){
        logger.log("Saving All Players to DB");
        for(var i in PlayerManager.Player_List){
            var player = PlayerManager.Player_List[i];
            PlayerManager.setup.savePlayer(db, player);
        }
    },
    savePlayer: function(db, player){
        if(player.changed){
            logger.log("Saving Player: "+player.id);
            db.query("UPDATE users SET user_x=?, user_y=?, user_mapid=? WHERE user_id=?", [player.x, player.y, player.mapid, player.id], function (err, rows) {
                if (err) throw err;
            });
            player.changed = false;
        }
    }
};


PlayerManager.resyncPlayerList = function(masterlist){
    var wid = Utils.getWorkerID();

    for(var i in masterlist){
        var mp = masterlist[i];

        if(mp.workerid != wid){
            var tp = PlayerManager.get.playerfromid(mp.id);

            if(tp == null){
                var refp = new RefPlayer(mp);
                PlayerManager.Player_List[mp.id] = refp;
            }else{
                tp.updateData(mp);
            }

        }
    }

    for(i in PlayerManager.Player_List){
        var tp = masterlist[i];

        if(tp == null){
            delete PlayerManager.Player_List[i];
        }
    }

    PlayerManager.setup.sendShadows();

};

PlayerManager.get = {
    playerfromid: function(id){
        return PlayerManager.Player_List[id];
    }
};

PlayerManager.cleanup = {
    cleanupPlayers: function(){
        for(var i in PlayerManager.Player_List) {
            var player = PlayerManager.Player_List[i];

            if(player.moving){
                player.x = player.move_x;
                player.y = player.move_y;
                player.moving = false;
            }

            player.changed = true;
            PlayerManager.setup.sendToPlayer(player, "kick",{reason: "Server Connection Closed!"});
        }
    },
    cleanupHandler: function(){
        for(var i in PlayerManager.Player_List) {
            var player = PlayerManager.Player_List[i];

            PlayerManager.setup.removePlayer(player.id);
        }
    }
};

module.exports = PlayerManager;