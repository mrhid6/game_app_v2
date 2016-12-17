var loader = require("../loader");
var logger = loader.logger;

var Utils = require("./server_utils");

var Player = function(data){

    var self = this;

    self.id = data.id;

    self.username = data.username;
    self.x = data.x;
    self.y = data.y;

    self.char_id = data.char_id;

    self.mapid = data.mapid;

    self.moving = data.moving;
    self.movement = [];

    self.changed = data.changed;

    self.focused = data.focused;

    self.lastShadowStr = "[]";
    self.managed = true;

    self.teleportPlayer = function(mapid, x, y){
        self.mapid = mapid;
        self.setPosition(x, y);

        var PlayerManager = require("./server_playerhandler");
        PlayerManager.setup.sendToPlayer(self, "resyncPos", self.getPositionData());
    };

    self.setPosition = function(x, y){
        self.x = Math.floor(x);
        self.y = Math.floor(y);
        self.changed = true;
        self.sendUpdateToMaster();
    };

    self.setFocused = function(focus){
        self.focused = focus;

        self.sendUpdateToMaster();
    };

    self.setMoveTo = function(x, y){

        var World = require("./server_world");

        var aStar = require("./astar");

        var grid_start_x = Math.floor(self.x / 32);
        var grid_start_y = Math.floor(self.y / 32);

        var grid_end_x = Math.floor(x / 32);
        var grid_end_y = Math.floor(y / 32);

        var map = World.getMap(self.mapid);
        var colMap = map.collision;

        var start = [grid_start_y, grid_start_x];
        var end = [grid_end_y, grid_end_x];

        var results = aStar.findPath(colMap, start, end);

        if(results.length > 0) {

            self.movement = results;
            self.moving = true;
            self.sendUpdateToMaster();
        }
    };

    self.validateMove = function(x, y){

        if(self.moving && self.movement.length > 0){
            var last_node = self.movement[self.movement.length-1];


            if(x == (last_node[1]*32) && y == (last_node[0]*32)){

                self.x = (last_node[1]*32);
                self.y = (last_node[0]*32);

                self.moving = false;
                self.movement = [];

                self.changed = true;
                self.sendUpdateToMaster();
            }else{
                var PlayerManager = require("./server_playerhandler");
                PlayerManager.setup.sendToPlayer(self, "resyncPos", self.getPositionData());
            }
        }
    };

    self.getInitData = function(){
        var pack = {
            id: self.id,
            username: self.username,
            char_id: self.char_id,
            x: self.x,
            y: self.y
        };

        return pack;
    };

    self.getShadowData = function(){
        var pack = {
            id: self.id,
            username: self.username,
            char_id: self.char_id,
            x: self.x,
            y: self.y,
            moving: self.moving,
            movement: self.movement,
            mapid: self.mapid,
            focused: self.focused
        };

        return pack;
    };

    self.getPositionData = function(){
        var pack = {
            id: self.id,
            x: self.x,
            y: self.y
        };

        return pack;
    };

    self.sendUpdateToMaster = function(){
        Utils.sendPacketToMaster("packet.worker.playerlist.updateplayer", self.getShadowData());
    };

    self.hasMovement = function(){
        return (self.movement != null && self.movement.length > 0);
    };

};

module.exports = Player;