var loader = require("../loader");
var logger = loader.logger;

var RefPlayer = function(data){

    var self = this;

    self.id = data.id;

    self.username = data.username;
    self.x = data.x;
    self.y = data.y;

    self.char_id = data.char_id;

    self.mapid = data.mapid;

    self.move_x = data.move_x;
    self.move_y = data.move_y;
    self.moving = data.moving;
    self.movement = data.movement;

    self.focused = data.focused;
    self.workerid = data.workerid;

    self.managed = false;

    self.getShadowData = function(){
        var pack = {
            id: self.id,
            username: self.username,
            char_id: self.char_id,
            x: self.x,
            y: self.y,
            move_x: self.move_x,
            move_y: self.move_y,
            moving: self.moving,
            movement: self.movement,
            mapid: self.mapid,
            focused: self.focused
        };

        return pack;
    };

    self.updateData = function(data){
        self.id = data.id;

        self.username = data.username;
        self.x = data.x;
        self.y = data.y;

        self.char_id = data.char_id;

        self.mapid = data.mapid;

        self.move_x = data.move_x;
        self.move_y = data.move_y;
        self.moving = data.moving;
        self.movement = data.movement;

        self.focused = data.focused;
        self.workerid = data.workerid;
    }

};

module.exports = RefPlayer;