
var Firebase = require("firebase");
var newWorkPeriod = 700;
var workItems = new Firebase("https://boiling-inferno-6943.firebaseio.com/testQueue");

var i = 0;
setInterval(function() {
 workItems.push({number: i, time: Math.floor(Math.random()*2000)});
 i++;
}, newWorkPeriod);