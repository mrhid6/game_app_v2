var World_Object = function(x, y, width, height, src, animation){

    var self = this;

    self.x = x;
    self.y = y;
    self.width = width;
    self.height = height;

    if(animation == null){
        self.image = new Image();
        self.image.src = src;
    }else{
        self.animation = animation;
        self.sprite = new Sprite(src, self.width, self.height, animation.speed);
        self.sprite.setFrame(self.animation.start);
    }




    self.draw = function(ctx){

        if(self.animation == null) {
            ctx.drawImage(self.image, self.x, self.y);
        }else{
            self.sprite.updateBetween(self.animation.start, self.animation.end);
            self.sprite.draw(ctx, self.x, self.y);
        }
    };

    return self;

};



