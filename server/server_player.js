var Player = function(data){

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

    self.changed = data.changed;

    self.focused = data.focused;

    self.lastShadowStr = "[]";

    self.setPosition = function(x, y){
        self.x = Math.floor(x);
        self.y = Math.floor(y);
        self.changed = true;
    };

    self.setFocused = function(focus){
        self.focused = focus;
    };

    self.setMoveTo = function(x, y){
        self.move_x = x;
        self.move_y = y;
        self.moving = true;
    };

    self.validateMove = function(x, y, callback){
        if(self.move_x != x || self.move_y != y){
            callback(true);
        }else{
            self.x = x;
            self.y = y;
        }

        self.moving = false;
        self.move_x = 0;
        self.move_y = 0;

        self.changed = true;
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
            move_x: self.move_x,
            move_y: self.move_y,
            moving: self.moving,
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
    }

};

module.exports = Player;