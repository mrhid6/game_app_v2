var Player = function(){
    var self = this;


    self.id = -1;
    self.x = 0;
    self.y = 0;

    self.prev_x = 0;
    self.prev_y = 0;

    self.initialized = false;

    self.moveTo_astar = null;
    self.moveToActive = false;

    self.speed = 75;

    self.width = 32;
    self.height = 48;

    self.direction = 1;

    self.focused = true;

    self.init = function(data){
        self.id = data.id;
        self.username = data.username;
        self.x = data.x;
        self.y = data.y;

        self.char_id = data.char_id;

        self.sprite = new Sprite("/client/img/characters/char_"+self.char_id+".png", self.width, self.height, 14);

        self.initialized = true;
    };

    self.setFocused = function(focus){
        self.focused = focus;
    };

    self.draw = function(ctx){
        if(self.initialized) {


            if(APP.settings.debug.showboundingboxes){
                if(self.moveTo_astar != null){
                    self.moveTo_astar.drawPath(ctx);
                }
            }

            var int_x = (self.x + 0.5) | 0;
            var int_y = (self.y + 0.5) | 0;

            if(self.moveToActive && self.focused) {
                var start = (self.direction*4) - 4;
                var end = (self.direction*4) - 1;
                self.sprite.updateBetween(start, end);
            }
            if(!self.focused) {
                ctx.globalAlpha = 0.4;
            }
            self.sprite.draw(ctx, int_x, int_y);
            self.drawName(ctx);

            ctx.globalAlpha = 1;
        }
    };

    self.drawName = function(ctx){
        var name_x = self.x+16;
        var name_y = self.y-18;

        var font = "Bold 12px AdvoCut";
        ctx.save();
        ctx.font = font;
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        var padding = 6;
        var width = ctx.measureText(self.username).width + padding;
        var height = 14 + (padding/2);

        name_x-=(width/2);
        ctx.fillRect(name_x, name_y, width, height);
        name_y-=2;
        name_x+=1;
        ctx.fillStyle = '#000';
        ctx.fillText(self.username, name_x + (padding/2), name_y);
        ctx.restore();
    };

    self.move = function(d, doEvent){
        if(self.initialized) {

            if(self.moveToActive && self.moveTo_astar != null && self.focused) {
                var velocity = self.speed * d;

                self.prev_x = Math.floor(self.x);
                self.prev_y = Math.floor(self.y);

                var result = self.moveTo_astar.move(velocity, self.x, self.y);

                if(!result.finished){
                    self.x = result.x;
                    self.y = result.y;

                    if(result.progress){
                        if(doEvent) {
                            if((self.moveTo_astar.progressCounter % 3) === 0) {
                                document.dispatchEvent(new CustomEvent("playerCompletedAStarNode",
                                    {"detail": {
                                        pid: self.id,
                                        node: result.nid,
                                        x: self.x,
                                        y: self.y
                                    }}
                                    ));
                            }

                            self.moveTo_astar.progressCounter++;
                        }
                    }

                }else{
                    self.x = result.x;
                    self.y = result.y;
                    self.moveToActive = false;
                    self.moveTo_astar = null;
                    if(doEvent) document.dispatchEvent(new Event("playerCompletedMove"));
                }
            }
            self.calcDirection();
        }

    };

    self.calcDirection = function() {

        var int_x = Math.floor(self.x);
        var int_y = Math.floor(self.y);

        if(self.prev_y > int_y){
            if(self.direction != 4){
                self.direction = 4; // moved down
                self.sprite.setFrame(12,false);
            }
        }else if(self.prev_y < int_y){
            if(self.direction != 1) {
                self.direction = 1; // moved up
                self.sprite.setFrame(0, false);
            }
        }else {
            if (self.prev_x > int_x) {
                if (self.direction != 2) {
                    self.direction = 2; // moved left
                    self.sprite.setFrame(4, false);
                }
            } else if (self.prev_x < int_x) {
                if (self.direction != 3) {
                    self.direction = 3; // moved right
                    self.sprite.setFrame(8, false);
                }
            }
        }

        if(!self.moveToActive || !self.focused) {
            if(self.direction == 1) self.sprite.setFrame(0,false);
            if(self.direction == 2) self.sprite.setFrame(4,false);
            if(self.direction == 3) self.sprite.setFrame(8,false);
            if(self.direction == 4) self.sprite.setFrame(12,false);
        }

    };

    self.moveTo = function(movement){
        if(self.initialized) {
            if(movement.length > 0) {
                self.moveTo_astar = new astar_movement(movement);
                self.moveTo_astar.rotatation = self.moveTo_astar.nodes.length / 3;
                self.moveTo_astar.progressCounter = 0;
                self.moveToActive = true;
            }
        }
    };

    self.setPosition = function(x, y){
        self.x = parseFloat(x);
        self.y = parseFloat(y);
    };

    self.getPosition = function(){
        return {x:self.x, y:self.y};
    }
};