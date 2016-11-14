var TileSet = function(name, src, start, end){
    var self = this;

    self.name = name;
    self.src = src;
    self.start = start;
    self.end = end;

    self.tilesPerRow = 0;

    self.init = function(){
        self.loadImages(self.name, self.src);
    };

    self.loadImages = function(name, src){
        self.img = new Image();
        self.img.src = src;

        self.img.onload = function() {
            self.tilesPerRow = Math.floor(self.img.width / 32);
        };
    };

    self.drawTile = function(tileid, x, y, ctx){
        var newid = tileid - self.start;

        // get the row and col of the frame
        var row = Math.floor(newid / self.tilesPerRow);
        var col = Math.floor(newid % self.tilesPerRow);

        ctx.drawImage(
            self.img,
            col * 32, row * 32,
            32, 32,
            x, y,
            32, 32);
    };

    self.tileInTileset = function(tileid){
        if(tileid>= self.start && tileid <= self.end){
            return true;
        }
        return false;
    };


    return self;
};