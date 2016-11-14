var Sprite = function(path, frameWidth, frameHeight, frameSpeed){

    var self = {};

    self.image = new Image();
    self.framesPerRow = null;

    self.frameWidth = frameWidth;
    self.frameHeight = frameHeight;

    self.frameSpeed = frameSpeed;

    self.frameCount = 0;

    // calculate the number of frames in a row after the image loads
    self.image.onload = function() {
        self.framesPerRow = Math.floor(self.image.width / self.frameWidth);
        self.frameCount = Math.floor( (self.image.width / self.frameWidth) * (self.image.height / self.frameHeight));
    };

    self.image.src = path;

    self.currentFrame = 0;  // the current frame to draw
    self.counter = 0;       // keep track of frame rate

    self.forceFrame = false;

    // Update the animation
    self.update = function() {
        if(self.forceFrame) return;

        // update to the next frame if it is time
        if (self.counter == (self.frameSpeed - 1))
            self.currentFrame = (self.currentFrame + 1) % self.frameCount;

        // update the counter
        self.counter = (self.counter + 1) % self.frameSpeed;
    };

    self.updateBetween = function(startFrame, endFrame){
        if(self.forceFrame) return;

        // update to the next frame if it is time
        if (self.counter == (self.frameSpeed - 1)) {
            if(self.currentFrame == endFrame){
                self.currentFrame = startFrame;
            }else {
                self.currentFrame = (self.currentFrame + 1);
            }
        }

        // update the counter
        self.counter = (self.counter + 1) % self.frameSpeed;
    };

    self.draw = function(ctx, x, y) {
        // get the row and col of the frame
        var row = Math.floor(self.currentFrame / self.framesPerRow);
        var col = Math.floor(self.currentFrame % self.framesPerRow);

        ctx.drawImage(
            self.image,
            col * self.frameWidth, row * self.frameHeight,
            self.frameWidth, self.frameHeight,
            x, y,
            self.frameWidth, self.frameHeight);
    };

    self.setFrame = function(frame, force){

        if(self.currentFrame == frame) return;

        self.currentFrame = frame;
        self.forceFrame = force;
    };

    self.unsetForce = function(){
        self.forceFrame = false;
    };

    return self;

};