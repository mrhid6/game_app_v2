var fs = require('fs');

var loader = require("../loader");
var logger = loader.logger;

var PlayerHandler = require("./server_playerhandler");

var World = {};

World.Maps = {};


World.clock = {
    time: new Date().getTime()
};

World.updateClock = function(time){
    World.clock.time = time;
    PlayerHandler.setup.sendToAll("timeSync", time);
};

World.setMaps = function(maps){
    World.Maps = maps;
};

World.getMap = function(mapid){
    return World.Maps["map"+mapid];
};

World.get = {
    getMapInitData: function(mapid){
        var map = World.Maps["map"+mapid];
        if(map != null){
            var returnArr = {};

            returnArr.m = mapid;
            returnArr.w = map.width;
            returnArr.h = map.height;

            return returnArr;
        }
    },
    getLayerData: function(mapid){
        var map = World.Maps["map"+mapid];
        if(map != null){
            var returnArr = {};
            returnArr.layers = map.layers;
            returnArr.mapid = mapid;
            return returnArr;
        }
    },
    getTileSetData: function(mapid){
        var map = World.Maps["map"+mapid];
        if(map != null){
            var returnArr = {};
            returnArr.tilesets = map.tilesets;
            returnArr.mapid = mapid;
            return returnArr;
        }
    }
};

World.net = {
    sendPlayerMap: function(socket, player){
        var mapid = player.mapid;

        socket.emit("packet.server.player.timeSync", World.clock.time);

        socket.emit("packet.server.world.map.init", World.get.getMapInitData(mapid));
        socket.emit("packet.server.world.map.tilesets", World.get.getTileSetData(mapid));
        socket.emit("packet.server.world.map.layers", World.get.getLayerData(mapid));
    }
};

World.checkPlayerOnTeleport = function(player){
    var map = World.Maps["map"+player.mapid];

    for(var i in map.teleports){
        var tele = map.teleports[i];

        if( player.x >= tele.position.x &&  player.x <= tele.position.x+tele.size.x){
            if(player.y >= tele.position.y  && player.y <= tele.position.y+tele.size.y){
                return true;
            }
        }
    }
    return false;
};

module.exports = World;