var World = function(){
    var self = this;

    self.mouse_x = 0;
    self.mouse_y = 0;

    self.textures = {};

    self.clock = {
        time: null,
        isDawn: false,
        isDay: false,
        isDusk: false,
        isNight: false,
        resetBools: function(){
            isDawn = false; isDay = false; isDusk = false; isNight = false;
        }
    };

    self.width = 0;
    self.height = 0;

    self.init = function(width, height){

        self.width = width;
        self.height = height;

        self.mapdata = {
            layers: [],
            tilesets: [],
            objects: []
        };
        self.teledata = {};

        self.loadImages("tile_select", "/client/img/tile_selector.png");

        var animation = {speed:200,start:2, end:3};
        var trafficlight = new World_Object(32,64,32,96,"/client/img/objects/trafficlight.png", animation);
        self.mapdata.objects.push(trafficlight);

    };

    self.initMapData = function(data){
        self.mapdata.initialized = false;
        var map = self.mapdata;

        for(var i in data.layers){
            var layer = data.layers[i];

            if(layer.name == "collision"){
                map.collision = layer.data;
            }else{

                map.layers.push(layer);
            }
        }
    };

    self.initTileSets = function(data){
        var map = self.mapdata;

        for(var i in data.tilesets){
            var tileset = data.tilesets[i];
            var t = new TileSet(tileset.name, tileset.img.replace("../../","/"), tileset.startTile, tileset.endTile);
            t.init();

            map.tilesets.push(t);
        }
    };

    self.initMapImage = function(){
        var canvas2 = document.createElement('canvas');
        canvas2.width = self.width;
        canvas2.height = self.height;
        var ctx = canvas2.getContext('2d');

        for(var i in self.mapdata.layers) {
            var layer = self.mapdata.layers[i];

            for (var iy = 0; iy < layer.data.length; iy++) {
                for (var ix = 0; ix < layer.data[iy].length; ix++) {
                    var x = ix * 32;
                    var y = iy * 32;

                    var tileid = parseInt(layer.data[iy][ix]);

                    if (tileid != 0) {
                        for (var t in self.mapdata.tilesets) {
                            var tileset = self.mapdata.tilesets[t];
                            if (tileset.tileInTileset(tileid)) {
                                tileset.drawTile(tileid, x, y, ctx);
                            }
                        }

                    }
                }
            }
        }

        self.mapimage = new Image();
        self.mapimage.src = ctx.canvas.toDataURL("image/png");
    };

    self.loadImages = function(name, src){
        self.textures[name] = new Image();
        self.textures[name].src = src;
    };

    self.updateTime = function(time){
        self.clock.time = time;

        self.clock.resetBools();

        var d = new Date(time);

        var hour = d.getHours();
        var min = d.getMinutes();

        if(hour >=0 && hour < 5){
            self.clock.isNight = true;
        }else if(hour >=5 && hour < 7){
            self.clock.isDawn = true;
        }else if(hour >=7 && hour < 18){
            self.clock.isDay = true;
        }else if(hour >=18 && hour < 20){
            self.clock.isDusk = true;
        }else if(hour >=20 && hour < 24){
            self.clock.isNight = true;
        }
    };

    self.setMousePosition = function(mx, my){
        self.mouse_x = mx;
        self.mouse_y = my;
    };

    self.draw = function(ctx){
        self.drawGround(ctx);

        self.drawObjects(ctx);

        if(APP.settings.debug.showboundingboxes){
            self.drawgrid(ctx);
            //self.drawTeleports(ctx);
            self.drawCollisions(ctx);
        }
    };

    self.getTileSet = function(name){
        for(var i in self.mapdata.tilesets){
            var tileset = self.mapdata.tilesets[i];

            if(tileset.name == name){
                return tileset;
            }
        }
    };

    self.drawGround = function(ctx){

        if(!self.mapdata.initialized){
            var Tempinit = true;
            for(var i in self.mapdata.tilesets){
                var tileset = self.mapdata.tilesets[i];

                if(tileset.initialized == false){
                    Tempinit = false;
                    break;
                }
            }

            self.mapdata.initialized = Tempinit;
        }

        if(self.mapdata.initialized && self.mapimage == null){
            self.initMapImage();
        }

        if(self.mapimage != null) {
            ctx.drawImage(self.mapimage, 0, 0, self.width, self.height);
        }
    };

    self.drawSky = function(ctx){
        self.drawDusk(ctx);
        self.drawNight(ctx);
    };

    self.drawDusk = function(ctx){
        if(self.clock.isDusk) {

            ctx.beginPath();
            ctx.fillStyle = "rgba(247, 139, 67, 0.2)";
            ctx.fillRect(0, 0, self.width, self.height);
            ctx.closePath();
        }
    };

    self.drawNight = function(ctx){
        if(self.clock.isNight) {

            ctx.beginPath();
            ctx.fillStyle = "rgba(0, 0, 100, 0.3)";
            ctx.fillRect(0, 0, self.width, self.height);
            ctx.closePath();
        }
    };

    self.drawgrid = function(ctx){

        var bw = 800;
        var bh = 640;
        var p = 0;
        ctx.beginPath();
        for (var x = 0; x <= bw; x += 32) {
            ctx.moveTo(0.5 + x + p, p);
            ctx.lineTo(0.5 + x + p, bh + p);
        }


        for (x = 0; x <= bh; x += 32) {
            ctx.moveTo(p, 0.5 + x + p);
            ctx.lineTo(bw + p, 0.5 + x + p);
        }

        ctx.strokeStyle = "black";
        ctx.stroke();
        ctx.closePath();
    };

    self.drawCollisions = function(ctx){
        var colmap = self.mapdata.collision;
        var tileset = self.getTileSet("collision");
        var tileid = tileset.start;

        for(var i=0;i<colmap.length;i++){
            for (var j = 0; j < colmap[i].length; j++) {
                var weight = self.mapdata.collision[i][j];

                if(weight == 0){
                    tileset.drawTile(tileid, j * 32, i * 32, ctx);
                }
            }
        }

    };

    self.drawTeleports = function(ctx){

        for(var i in self.teledata){
            var teleport = self.teledata[i];

            var x = teleport.position.x;
            var y = teleport.position.y;

            var size_x = teleport.size.x;
            var size_y = teleport.size.y;

            ctx.beginPath();
            ctx.rect(x, y, size_x, size_y);
            ctx.fillStyle = "#ff3333";
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.stroke();

            ctx.font="10px Arial";
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#000';
            ctx.fillText("M:"+teleport.destination.mapid, x+1, y+1);
            ctx.fillText("X:"+teleport.destination.x, x+1, y+10);
            ctx.fillText("Y:"+teleport.destination.y, x+1, y+21);
            ctx.closePath();
        }

    };

    self.drawTileSelector = function(ctx){

        var grid_x = Math.floor(self.mouse_x/32) * 32;
        var grid_y = Math.floor(self.mouse_y/32) * 32;

        ctx.drawImage(
            self.textures["tile_select"],
            0, 0,
            32, 32,
            grid_x, grid_y,
            32, 32);

    };

    self.drawObjects = function(ctx){
        for(var i in self.mapdata.objects){
            var object = self.mapdata.objects[i];

            object.draw(ctx);
        }
    };

    return self;
};