var cluster = require("cluster");
var fs = require('fs');
var path = require('path');

const util = require('util');

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
                fromDir(filename,filter); //recurse
            }
            else if (filename.indexOf(filter)>=0) {
                callback(filename);
            }
        }
    },

    loadServerMaps: function(){

        var Maps = {};

        this.listFromDir("./server/maps", ".json", function(file){
            var worldmaps = Maps;
            var fileName = file.split("/").pop(-1);
            var mapid = fileName.replace("map","").replace(".json","");

            worldmaps["map"+mapid] = {
                width: 0,
                height: 0,
                layers: [],
                tilesets: []
            };

            var map = worldmaps["map"+mapid];
            var mapRawJSON = JSON.parse(fs.readFileSync(file, 'utf8'));

            map.width = mapRawJSON.width;
            map.height = mapRawJSON.height;

            for (j in mapRawJSON.layers){
                var layer = mapRawJSON.layers[j];

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
            worker.send({
                task: task,
                data: data
            });
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