var astar_movement = function(astar_result){
    var self = this;

    self.starting_array = astar_result;
    self.currentNode = 0;
    self.nodes = [];

    for(var i in astar_result){
        var node = astar_result[i];
        self.nodes.push({x: node[1], y: node[0]});
    }

    self.isFinished = function(){
        return self.nodes.length-1 == self.currentNode;
    };

    self.progress = function(){
        self.currentNode++;
    };

    self.toString = function(){
        return JSON.stringify(self.starting_array);
    };

    self.move = function(v, x, y){

        var ret_data = {x: x, y: y, finished: false, progress: false, nid: 0};

        var node = self.nodes[self.currentNode];

        if(node) {
            var node_x = parseInt(node.x * 32);
            var node_y = parseInt(node.y * 32);

            var int_x = parseInt(Math.floor(x));
            var int_y = parseInt(Math.floor(y));

            if (int_x < node_x) {
                ret_data.x += v;
            } else if (int_x > node_x) {
                ret_data.x -= v;
            }

            if (int_y < node_y) {
                ret_data.y += v;
            } else if (int_y > node_y) {
                ret_data.y -= v;
            }

            int_x = parseInt(Math.floor(ret_data.x));
            int_y = parseInt(Math.floor(ret_data.y));

            if( (int_x+1 > node_x) && (int_x+1 <= node_x+2) && (int_y+1 > node_y) && (int_y+1 <= node_y+2)){
                if (self.isFinished()) {
                    ret_data.finished = true;
                    ret_data.x = node_x;
                    ret_data.y = node_y;
                } else {
                    ret_data.progress = true;
                    ret_data.nid = self.currentNode;
                    self.progress();
                }
            }
        }

        return ret_data;
    };

    self.drawPath = function(ctx){

        if(self.isFinished()) return;


        for(var i = self.currentNode; i < self.nodes.length; i++){
            var node = self.nodes[i];
            ctx.beginPath();
            ctx.rect(node.x * 32, node.y * 32, 32, 32);
            ctx.fillStyle = "rgba(142,214,255,0.5)";
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.stroke();
            ctx.closePath();
        }

    }
};