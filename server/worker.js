var Firebase = require("firebase");
var WorkQueue = require("./workqueue.js");

var itemsRef = new Firebase("https://boiling-inferno-6943.firebaseio.com/liveLocs");

var workCallback = function(data, whenFinished) {
  //This is where we actually process the data. We need to call "whenFinished" when we're done
  //to let the queue know we're ready to handle a new job.
  console.log("Started Processing: " + data.number);

  //This demo task simply pauses for the amount of time specified in data.time
  setTimeout(function() {
  	console.log("Finished Processing: " + data.number + " for " + data.time + " milliseconds");
  	whenFinished();
  }, 5000);
}

new WorkQueue(itemsRef, workCallback);