var World_Teleport = function(x, y, width, height, teleport){
    var self = this;

    self.x = x;
    self.y = y;
    self.width = width;
    self.height = height;

    self.teleport = teleport;


    self.draw = function(ctx){

        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.fillStyle = "rgba(255,0,0,0.4)";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        ctx.stroke();

        ctx.font="10px Arial";
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#000';
        ctx.fillText("M:"+self.teleport.mapid, x+1, y+1);
        ctx.fillText("X:"+self.teleport.x, x+1, y+10);
        ctx.fillText("Y:"+self.teleport.y, x+1, y+21);
        ctx.closePath();
    };

    return self;
};