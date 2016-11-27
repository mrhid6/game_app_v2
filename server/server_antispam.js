var loader = require("../loader");
var logger = loader.logger;

var AntiSpam = {
    options: {spamRemove:5,maxSpam:150},
    spamData: {},
    checkSpam: function(){
        for(var id in AntiSpam.spamData){
            if(AntiSpam.spamData[id].spamScore>=1){
                AntiSpam.spamData[id].spamScore-=AntiSpam.options.spamRemove;
            }
        }
        return;
    },
    createSpamUser: function(socket){
        AntiSpam.spamData[socket.id]={
            spamScore:0
        };
    },
    addSpam: function(socket){
        if(socket.spamViolated) return;
        if(AntiSpam.spamData[socket.id] == null ){
            AntiSpam.createSpamUser(socket);
        }
        AntiSpam.spamData[socket.id].spamScore+=1;
        AntiSpam.maxSpamCheck(socket);
    },
    maxSpamCheck: function(socket){
        if(AntiSpam.spamData[socket.id].spamScore>=AntiSpam.options.maxSpam && !socket.spamViolated){
            socket.spamViolated = true;
            logger.warning("Client was kicked: Spam Violation");
            socket.emit("packet.server.player.kick", {reason: "Too Many Packets!"});
            socket.disconnect();
        }
    }
};

module.exports = AntiSpam;