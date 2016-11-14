var fs = require('fs');
var xml2js = require('xml2js');

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

World.loadMaps2 = function(){

    var i, j;

    for(i in World.Maps) {
        var map = World.Maps[i];

        var mapPath = "./server/maps/"+map.mapfile;
        var mapRawJSON = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

        map.width = mapRawJSON.width;
        map.height = mapRawJSON.height;

        for (j in mapRawJSON.layers){
            var layer = mapRawJSON.layers[j];

            var newLayer = {};

            newLayer.name = layer.name;
            newLayer.data = layer.data;

            map.layers.push(newLayer);
        }

        for (j in mapRawJSON.tilesets){
            var tileset = mapRawJSON.tilesets[j];
            var newTileset = {};

            newTileset.img = tileset.image;
            newTileset.name = tileset.name;
            newTileset.startTile = tileset.firstgid;
            newTileset.endTile = newTileset.startTile + (tileset.tilecount - 1);

            map.tilesets.push(newTileset);
        }

        console.log(map);
    }
};

World.loadMaps = function(){

    for(var i in World.Maps){
        var map = World.Maps[i];

        var XMLPath = "./server/maps/"+map.mapfile;
        var rawJSON = JSON.parse(loadXMLDoc(XMLPath));

        var m = rawJSON.map;
        var mapdata = m.mapdata;

        map.mapwidth = parseInt(m.mapsettings[0]["$"].width);

        for(var r in mapdata[0].row) {
            var row = mapdata[0].row[r];

            for (var j in row.tile) {
                var tile = row.tile[j];
                var tile_id = parseInt(tile["$"].tile_id);
                map.mapdata.push(tile_id);
            }
        }

        var teleports = m.teleports;

        for(var j in teleports[0].teleport) {
            var teleport = teleports[0].teleport[j];

            var temp_tele = {
                position:{x:0, y:0},
                size: {x:0, y:0},
                destination: {mapid:0, x:0, y:0}
            };

            temp_tele.position.x = parseInt(teleport.position[0]["$"].x);
            temp_tele.position.y = parseInt(teleport.position[0]["$"].y);
            temp_tele.size.x = parseInt(teleport.size[0]["$"].x);
            temp_tele.size.y = parseInt(teleport.size[0]["$"].y);
            temp_tele.destination.mapid = parseInt(teleport.destination[0]["$"].mapid);
            temp_tele.destination.x = parseInt(teleport.destination[0]["$"].x);
            temp_tele.destination.y = parseInt(teleport.destination[0]["$"].y);
            map.teleports.push(temp_tele);
        }
        console.log("Loaded map file: "+map.mapfile);
    }

};

World.get = {
    getMapInitData: function(mapid){
        var map = World.Maps["map"+mapid];
        if(map != null){
            var returnArr = {};

            returnArr.mapid = mapid;
            returnArr.width = map.width;
            returnArr.height = map.height;

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
    getMapData: function(mapid){
        var map = World.Maps["map"+mapid];
        if(map != null) return map.mapdata;
    },
    getMapTeleportData: function(mapid){
        var map = World.Maps["map"+mapid];
        if(map != null) return map.teleports;
    }
};

World.net = {
    sendPlayerMap: function(player){
        var mapid = player.mapid;

        player.sendPacket("timeSync", World.clock.time);

        player.socket.emit("packet.server.world.map.init", World.get.getMapInitData(mapid));
        player.socket.emit("packet.server.world.map.layers", World.get.getLayerData(mapid));
        player.socket.emit("packet.server.world.map.tilesets", World.get.getTileSetData(mapid));
        //player.socket.emit("packet.server.world.mapdata", {mapid: player.mapid, mapdata: World.get.getMapData(player.mapid)});

        //player.socket.emit("packet.server.world.mapteledata", {mapid: player.mapid, teledata: World.get.getMapTeleportData(player.mapid)});
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

function loadXMLDoc(filePath) {
    var json;
    try {
        var fileData = fs.readFileSync(filePath, 'ascii');

        var parser = new xml2js.Parser();
        parser.parseString(fileData.substring(0, fileData.length), function (err, result) {
            json = JSON.stringify(result);
        });
        return json;
    } catch (ex) {console.log(ex)}
}

module.exports = World;