var Player = require("./server_player.js");

var PlayerManager = {};
PlayerManager.Player_List = {};

PlayerManager.settings = {};

PlayerManager.signinUser = function(db, socket, data, cb){
    var res = {};

    if(data.username != "" && data.password != "") {
        db.query("SELECT * FROM users WHERE user_username=? AND user_password=?", [data.username, data.password], function (err, rows) {
            if (err) throw err;

            if(rows.length == 1) {
                var row = rows[0];
                row.user_password = null;

                res.success = true;
                res.user = row;

                PlayerManager.setup.createNewPlayer(socket, res.user);
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
        socket.id = user.user_id;

        var player = new Player(socket, user);
        PlayerManager.Player_List[user.user_id] = player;

        player.sendPacket("initdata", player.getInitData());
        PlayerManager.player_list_changed = true;

        PlayerManager.setup.sendShadows();
    },
    sendToAll: function(name, data){
        for(i in PlayerManager.Player_List) {
            player = PlayerManager.Player_List[i];

            player.sendPacket(name, data);
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

            if(player.lastShadowStr != packStr) {
                player.sendPacket("shadows", newpack);
                player.lastShadowStr = packStr;
            }
        }
    },
    removePlayer: function(db, id){
        var player = PlayerManager.get.playerfromid(id);
        if(player != null) {
            console.log("remove Player "+id);
            PlayerManager.setup.savePlayer(db, player);
            delete PlayerManager.Player_List[id];
            PlayerManager.player_list_changed = true;
            PlayerManager.setup.sendShadows();
        }
    },
    savePlayers: function(db){
        console.log("Saving Players to DB");
        for(var i in PlayerManager.Player_List){
            var player = PlayerManager.Player_List[i];
            PlayerManager.setup.savePlayer(db, player);
        }
    },
    savePlayer: function(db, player){
        if(player.changed){
            console.log("Saving Player: "+player.id);
            db.query("UPDATE users SET user_x=?, user_y=?, user_mapid=? WHERE user_id=?", [player.x, player.y, player.mapid, player.id], function (err, rows) {
                if (err) throw err;
            });
            player.changed = false;
        }
    }
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
            player.sendPacket("kick",{reason: "Server Connection Closed!"});
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