var Firebase = require("firebase");

var fbLiveLocs = new Firebase("https://boiling-inferno-6943.firebaseio.com/liveLocs");

fbLiveLocs.on("child_added", function(){
    console.log("added!");
});