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
    },
    getWorldObjects: function(mapid){
        var map = World.Maps["map"+mapid];
        if(map != null){
            var returnArr = {};
            returnArr.objects = map.objects;
            returnArr.mapid = mapid;
            return returnArr;
        }
    },
    getWorldTeleports: function(mapid){
        var map = World.Maps["map"+mapid];
        if(map != null){
            var returnArr = {};
            returnArr.teleports = map.teleports;
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
        socket.emit("packet.server.world.map.objects", World.get.getWorldObjects(mapid));
        socket.emit("packet.server.world.map.teleports", World.get.getWorldTeleports(mapid));
    }
};

World.CheckMapExists = function(mapid){
    return (World.Maps["map"+mapid] != null);
};

World.checkPlayerOnTeleport = function(player){
    var map = World.Maps["map"+player.mapid];

    for(var i in map.teleports){
        var tele = map.teleports[i];

        if( player.x >= tele.x &&  player.x <= tele.x+tele.width){
            if(player.y >= tele.y  && player.y <= tele.y+tele.height){
                return true;
            }
        }
    }
    return false;
};

World.getTeleportUnderPlayer = function(player){
    var map = World.Maps["map"+player.mapid];

    for(var i in map.teleports){
        var tele = map.teleports[i];

        if( player.x >= tele.x &&  player.x <= tele.x+tele.width){
            if(player.y >= tele.y  && player.y <= tele.y+tele.height){
                return tele;
            }
        }
    }
    return null;
};

module.exports = World;