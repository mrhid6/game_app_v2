var Map = function(){
    var self = this;

    self.mapname = "";

    self.width = 0;
    self.height = 0;

    self.collision = [];

    self.layers = [];
    self.tilesets = [];

    self.objects = [];
    self.teleports = [];

    return self;
};

module.exports = Map;