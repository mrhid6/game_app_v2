var Player = function(socket, data){

    var self = this;

    self.socket = socket;
    self.id = data.user_id;

    self.username = data.user_username;
    self.x = data.user_x;
    self.y = data.user_y;

    self.char_id = data.user_char_id;

    self.mapid = data.user_mapid;

    self.move_x = 0;
    self.move_y = 0;
    self.moving = false;

    self.changed = false;

    self.focused = true;

    self.lastShadowStr = "";

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

    self.validateMove = function(x, y){
        if(self.move_x != x || self.move_y != y){
            self.sendPacket("resyncPos", self.getPositionData());
        }else{
            self.x = x;
            self.y = y;
        }

        self.moving = false;
        self.move_x = 0;
        self.move_y = 0;

        self.changed = true;
    };

    self.sendPacket = function(name, data){
        socket.emit("packet.server.player."+name, data);
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