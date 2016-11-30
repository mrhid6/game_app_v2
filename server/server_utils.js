var cluster = require("cluster");
var fs = require('fs');
var path = require('path');

const util = require('util');

var loader = require("../loader");
var logger = loader.logger;

var Map = require("./server_map");

var Utils = {
    createArray: function(length) {
        var arr = new Array(length || 0),
            i = length;

        if (arguments.length > 1) {
            var args = Array.prototype.slice.call(arguments, 1);
            while(i--) arr[length-1 - i] = this.createArray.apply(this, args);
        }

        return arr;
    },
    listFromDir: function(startPath, filter, callback){

        //console.log('Starting from dir '+startPath+'/');

        if (!fs.existsSync(startPath)){
            console.log("no dir ",startPath);
            return;
        }

        var files=fs.readdirSync(startPath);
        for(var i=0;i<files.length;i++){
            var filename=path.join(startPath,files[i]);
            var stat = fs.lstatSync(filename);
            if (stat.isDirectory()){
                this.listFromDir(filename,filter, callback); //recurse
            }
            else if (filename.indexOf(filter)>=0) {
                callback(filename);
            }
        }
    },

    loadServerMaps: function(){

        var Maps = {};

        this.listFromDir("./server/maps", "map.json", function(file){
            var mapfile = require(file.replace("server/","./"));
            var map = new Map();

            map.mapname = mapfile.mapname;

            var mapdata = require("./maps/"+mapfile.mapdata);

            map.width = mapdata.width;
            map.height = mapdata.height;

            for (var j in mapdata.layers){
                var layer = mapdata.layers[j];

                var newLayer = {};

                newLayer.name = layer.name;

                var result = Utils.createArray(map.height, map.width);
                for (var row = 0; row < map.height; ++row) {
                    for (var column = 0; column < map.width; ++column) {
                        var tileid = layer.data[row * map.width + column];

                        if(layer.name == "collision"){
                            if(tileid > 0){
                                tileid = 0;
                            }else{
                                tileid = 1;
                            }
                        }

                        result[row][column] = tileid;
                    }
                }
                newLayer.data = result;
                map.layers.push(newLayer);

                if(layer.name == "collision"){
                    map.collision = newLayer.data;
                }

                result = null;
                newLayer = null;
                layer = null;
            }

            for (j in mapdata.tilesets){
                var tileset = mapdata.tilesets[j];
                var newTileset = {};

                newTileset.img = tileset.image;
                newTileset.name = tileset.name;
                newTileset.startTile = tileset.firstgid;
                newTileset.endTile = newTileset.startTile + (tileset.tilecount - 1);

                map.tilesets.push(newTileset);
                tileset = null;
                newTileset = null;
            }

            var mapobjs = require("./maps/"+mapfile.objects);

            map.objects = mapobjs;

            mapobjs = null;
            mapdata = null;
            mapfile = null;

            logger.info("Loaded Map: "+ map.mapname);

            Maps[map.mapname] = map;

        });
        return Maps;
    },

    sendPacketToMaster: function(task, data){
        process.send({
            task: task,
            workerid: cluster.worker.id,
            data: data
        });
    },
    sendPacketToWorkers: function(workers, task, data){
        for(var i in workers) {
            var worker = workers[i];

            if (worker.isConnected() && !worker.isDead()) {
                worker.send({
                    task: task,
                    data: data
                });
            }else{
                console.log("worker Dead!");
            }
        }
    },

    getWorkerID: function(){
        return cluster.worker.id;
    },

    toGridPosition: function(x, y){
        var ret_x = Math.floor(x / 32) * 32;
        var ret_y = Math.floor(y / 32) * 32;
        return {x: ret_x, y: ret_y}
    },
    generateRandomString: function(length){
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < length; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    },
    generateUUID: function(format){
        formatdata = format.split("-");

        var ret_str = "";

        for(var i in formatdata){
            var d = formatdata[i];
            if(i>0) {
                ret_str = ret_str + "-" + Utils.generateRandomString(d.length);
            }else{
                ret_str = ret_str + Utils.generateRandomString(d.length);
            }
        }
        return ret_str;
    }
};

module.exports = Utils;