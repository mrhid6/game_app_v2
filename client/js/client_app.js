$(document).ready(function(){
    window.APP = window.APP || {};

    APP.settings = {
        debug: {
            showboundingboxes: false
        }
    };

    APP.init = function(){
        APP.net.initNet();
        APP.setup.createCanvas();
        APP.setup.addListeners();
        APP.setup.createHtmlObjs();
        APP.setup.createPlayer();
        APP.setup.createWorld();
        APP.start();
    };

    APP.stop = function() {
        window.cancelAnimationFrame(APP.core.animationFrame);
        APP.core.isRunning = false;
    };

    APP.start = function() {
        if(!APP.core.isRunning) {
            APP.core.then = Date.now();
            APP.core.isRunning = true;
            APP.core.frame();
        }
    };

    APP.core = {
        isRunning: false,

        frame: function() {
            if(!APP.core.isRunning) return;
            APP.core.setDelta();
            APP.core.update();
            APP.core.render();
            APP.core.animationFrame = window.requestAnimationFrame(APP.core.frame);
        },

        setDelta: function() {
            APP.core.now = Date.now();
            APP.core.delta = (APP.core.now - APP.core.then) / 1000; // seconds since last frame
            APP.core.then = APP.core.now;
        },

        update: function() {
            APP.workers.movePlayers();
        },

        render: function() {
            APP.workers.clearCanvas();
            APP.workers.renderFrameRate();

            if(APP.Entities.ThePlayer.initialized) {
                APP.world.draw(APP.canvas.ctx);
                APP.workers.renderPlayers();
                APP.world.drawSky(APP.canvas.ctx);
                APP.world.drawTileSelector(APP.canvas.ctx);
            }
        }
    };

    APP.Entities = {
        ThePlayer: null,
        Shadows: []
    };

    APP.setup = {
        addListeners: function() {
            APP.canvas.addEventListener("click", APP.workers.onmouseclick, false);
            APP.canvas.addEventListener('mousemove', function(evt) {
                var mousePos = getMousePos(APP.canvas, evt);
                APP.world.setMousePosition(mousePos.x, mousePos.y);
            }, false);

            window.addEventListener('focus', function() {
                APP.net.sendPacket("client.clientfocused", {id: APP.Entities.ThePlayer.id});
                APP.start();
            },false);

            window.addEventListener('blur', function() {
                APP.stop();
                APP.net.sendPacket("client.clientblured", {id: APP.Entities.ThePlayer.id});
            },false);
        },
        createCanvas: function() {
            APP.canvas = document.createElement('canvas');
            APP.canvas.width = 800;
            APP.canvas.height = 640;
            APP.canvas.ctx = APP.canvas.getContext('2d');
            document.getElementById('canvas-wrapper').appendChild(APP.canvas);
        },
        createHtmlObjs: function(){
            APP.framerateDisplay = document.getElementById('framerate');
            APP.framerateDisplay.timer = 0;

            $(".loginScreen .inp_button").click(function(){
                var user = $(".loginScreen .inp_username").val();
                var pass = $(".loginScreen .inp_password").val();

                if(user != "" && pass != ""){
                    var hash = CryptoJS.MD5(user+":"+pass).toString();
                    APP.net.sendPacket("client.player.signin",{u: user, p: hash});
                }else{
                    $(".loginScreen .error_div").text("Please Fill In All Fields!");
                }
            });

            $('.loginScreen input').keyup(function(e){
                if(e.keyCode == 13) $(".loginScreen .inp_button").trigger("click");
            });

            $('#debug_boundboxes').change(function() {APP.settings.debug.showboundingboxes = $(this).is(":checked")});
        },
        createPlayer: function(){
            APP.Entities.ThePlayer = new Player();
            document.addEventListener("playerCompletedMove", function(){
                var player = APP.Entities.ThePlayer;
                var data = {
                    id: player.id,
                    x: player.x,
                    y: player.y
                };

                APP.net.sendPacket("client.player.completemove", data);
            });
            document.addEventListener("playerCompletedAStarNode", function(e){
                var data = e.detail;
                var packet = {
                    id: data.pid,
                    ni: data.node,
                    x: Math.floor(data.x),
                    y: Math.floor(data.y)
                };

                APP.net.sendPacket("client.player.completeAStarNode", packet);
            });
        },
        createWorld: function(){
            APP.world = new World();
            APP.world.init(APP.canvas.width, APP.canvas.height);
        }
    };

    APP.workers = {
        clearCanvas: function() {
            APP.canvas.ctx.clearRect ( 0, 0, APP.canvas.width, APP.canvas.height);
        },
        renderFrameRate: function() {
            // Render Framerate every 1/4 second
            if(APP.framerateDisplay.timer > 0.25) {
                APP.framerateDisplay.innerHTML = (1/APP.core.delta) | 0; // fast round to whole pixel
                APP.framerateDisplay.timer = 0;
            } else {
                APP.framerateDisplay.timer += APP.core.delta;
            }
        },
        renderPlayers: function(){
            APP.Entities.ThePlayer.draw(APP.canvas.ctx);

            for(var i in APP.Entities.Shadows){
                var player = APP.Entities.Shadows[i];

                player.draw(APP.canvas.ctx);
            }
        },
        renderServerClosed: function(reason){

            APP.canvas.ctx.clearRect(0, 0, APP.canvas.width, APP.canvas.height);

            var font = "Bold 40px Arial";
            var Text = reason;

            var text_x = APP.canvas.width/2;
            var text_y = APP.canvas.height/2;

            APP.canvas.ctx.save();
            APP.canvas.ctx.font = font;
            APP.canvas.ctx.textBaseline = 'top';
            var width = APP.canvas.ctx.measureText(Text).width;
            var height = 30;

            text_x-=(width/2);
            APP.canvas.ctx.fillStyle = '#000';
            APP.canvas.ctx.fillText(Text, text_x, text_y-height);
            APP.canvas.ctx.restore();

        },
        movePlayers: function(){
            APP.Entities.ThePlayer.move(APP.core.delta, true);

            for(var i in APP.Entities.Shadows){
                var player = APP.Entities.Shadows[i];
                player.move(APP.core.delta, false);
            }
        },
        onmouseclick: function(e){
            var player = APP.Entities.ThePlayer;

            var mx = APP.world.mouse_x;
            var my = APP.world.mouse_y;

            var grid_x = Math.floor(mx/32) * 32;
            var grid_y = Math.floor(my/32) * 32;


            if(grid_x != player.x || grid_y != player.y) {
                APP.net.sendPacket("client.click", {id: player.id, x: mx, y: my});
            }
        },
        getShadow: function(id){
            for(var i in APP.Entities.Shadows){
                var player = APP.Entities.Shadows[i];

                if(player.id == id){
                    return player;
                }
            }

            return null;
        }
    };

    APP.cleanup = function(reason){
        APP.Entities.Shadows = [];
        APP.Entities.ThePlayer.initialized = false;
        APP.stop();
        $(".loginScreen").remove();
        APP.workers.renderServerClosed(reason);
    };

    APP.net = {
        socket: null,

        initNet: function(){

            APP.net.socket = io({transports: [ 'websocket' ]});

            var onevent = APP.net.socket.onevent;
            APP.net.socket.onevent = function (packet) {
                var args = packet.data || [];
                onevent.call(this, packet);    // original call
                packet.data = ["*"].concat(args);
                onevent.call(this, packet);      // additional call to catch-all
            };

            APP.net.socket.on("*", function (event, data) {
                APP.net.handlePacket(event, data);
            });
        },

        sendPacket: function(name, data){
            if(APP.Entities.ThePlayer.initialized || name == "client.player.signin") {
                APP.net.socket.emit("packet." + name, data);
            }
        },

        handlePacket: function(event, data){
            console.log(event);
            console.log(data);

            var size = strToBytes(event + JSON.stringify(data));
            console.log(size);

            if(event == "packet.server.player.kick"){
                APP.net.socket.disconnect();
                APP.cleanup(data.reason);
            }

            if(event == "packet.server.player.initdata"){
                $(".loginScreen").remove();
                APP.Entities.ThePlayer.init(data);
            }

            if(event == "packet.server.player.resyncPos"){
                APP.Entities.ThePlayer.setPosition(data.x, data.y);
            }

            if(event == "packet.server.player.timeSync"){
                APP.world.updateTime(data);
            }

            if(event == "packet.server.world.map.init"){
                var w = APP.world;
                var map = w.mapdata;

                map.mapid = data.m;
                map.width = data.w;
                map.height = data.h;
            }

            if(event == "packet.server.world.map.layers"){
                var w = APP.world;
                var map = w.mapdata;

                for(i in data.layers){
                    var layer = data.layers[i];

                    if(layer.name == "collision"){
                        map.collision = layer.data;
                        w.astarMap = new Graph(map.collision,{ diagonal: false });
                    }else{
                        map.layers.push(layer);
                    }
                }
            }

            if(event == "packet.server.world.map.tilesets"){
                var w = APP.world;
                var map = w.mapdata;

                for(i in data.tilesets){
                    var tileset = data.tilesets[i];
                    var t = new TileSet(tileset.name, tileset.img.replace("../../","/"), tileset.startTile, tileset.endTile);
                    t.init();

                    map.tilesets.push(t);
                }
            }

            if(event == "packet.server.world.mapteledata"){
                APP.world.teledata = data.teledata;
            }

            if(event == "packet.server.player.shadows"){
                var i, p;
                for(i in data){
                    p = data[i];

                    if(APP.workers.getShadow(p.id) == null && p.id != APP.Entities.ThePlayer.id) {

                        player = new Player();
                        player.init(p);

                        APP.Entities.Shadows.push(player);
                    }else if(APP.workers.getShadow(p.id) != null){
                        var shadow = APP.workers.getShadow(p.id);

                        var tstr1 = (shadow.moveTo_astar)?shadow.moveTo_astar.toString():"[]";
                        var tstr2 = JSON.stringify(p.movement);

                        if(!shadow.moveToActive && p.moving){
                            shadow.setPosition(p.x, p.y);
                            shadow.moveTo(p.movement);
                        }else if(shadow.moveToActive && p.moving && tstr1 != tstr2){
                            shadow.setPosition(p.x, p.y);
                            shadow.moveTo(p.movement);
                        } else if(shadow.moveToActive && !p.moving) {
                            shadow.setPosition(p.x, p.y);
                            shadow.moveToActive = false;
                        }
                        shadow.setFocused(p.focused);

                        var shad_pos = shadow.getPosition();
                        if(!shadow.focused && (p.x != shad_pos.x || p.y != shad_pos.y)){
                            shadow.setPosition(p.x, p.y);
                        }

                    }
                }

                for(i in APP.Entities.Shadows){
                    p = APP.Entities.Shadows[i];

                    var found = false;
                    for(var j in data){
                        var tp = data[j];
                        if(tp.id == p.id){
                            found = true;
                            break;
                        }
                    }

                    if(!found){
                        delete APP.Entities.Shadows[i];
                    }
                }
            }

            if(event == "packet.server.player.moveto"){
                APP.Entities.ThePlayer.moveTo(data.d);
            }
        }
    };


    APP.init();
});


function splitArray(array, part) {
    var tmp = [];
    for(var i = 0; i < array.length; i += part) {
        tmp.push(array.slice(i, i + part));
    }
    return tmp;
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function strToBytes(str){
    var bytes = byteCount(str, true);
    var bytesStr = "";

    bytesStr = formatBytes(bytes);
    return bytesStr;
}

function byteCount(s, addNET) {
    var returnStr
    var bytes = encodeURI(s).split(/%(?:u[0-9A-F]{2})?[0-9A-F]{2}|./).length - 1;

    if(addNET){
        var netbytes = (bytes / 1460)*54;
        bytes += netbytes;
    }
    return bytes;
}

function formatBytes(bytes){
    var bytesStr = "";
    if(bytes >= (1024*1024)){bytesStr = (bytes / (1024*1024)).toFixed(2) + " MB";}
    else if(bytes >= 1024){bytesStr = (bytes / 1024).toFixed(2) + " KB";}
    else{bytesStr = bytes.toFixed(2) + " Bytes";}

    return bytesStr;
}