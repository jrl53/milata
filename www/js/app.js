//'use strict';
var MapApp = angular.module('MapApp', [
	'ionic', 'leaflet-directive', 'firebase']);

MapApp.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
});

MapApp.constant('fbURL',"https://boiling-inferno-6943.firebaseio.com");


/**
 * Routing table including associated controllers.
 */
MapApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$stateProvider
		.state('menu', {url: "/map", abstract: true, templateUrl: "templates/menu.html"})
		.state('menu.home', {url: '/home', views:	 {'menuContent': {templateUrl: 'gpsView.html', controller: 'GpsCtrl'} }  })
		.state('menu.help', {url: '/help', views: {'menuContent': {templateUrl: 'helpView.html', controller: 'HelpCtrl'} }  })
		.state('menu.form', {url: '/form', views: {'menuContent': {templateUrl: 'templates/search.html', controller: 'HelpCtrl'} }  });

	// if none of the above states are matched, use this as the fallback
	$urlRouterProvider.otherwise('/map/home');
}]);

/**
* Geolocation service.
*/

MapApp.factory('geoLocationService', function ($ionicPopup, $firebase, fbURL) {
//	'use strict';
	
	//Globals
	
	var username = generateRandomString(5);
	//-------------------

	var service = {};
	var watchId;
	var lt = 0;
	var ls = false;
	
	var fb = new Firebase(fbURL);
	var geoFire = new GeoFire(fb.child("liveLocs"));
	
	var sessionRef;

	var observerCallbacks = [];

	var userStopCount = 0;

	service.latLngs = [];
	service.currentPosition = {};
	

	service.routeData = {};

    service.allRoutes = {};

    //Set initial static markers
    service.markers = {
    	office:{
            lat: 9.965061,
            lng:  -84.120121,
            message: "UltraPark II",
            focus: false,
            draggable: false,
            layer: 'stops',
            icon: {
                iconUrl: 'img/office.png',
                iconSize: [30, 30]
            }
        }    
    };

	
	//Notification system*********************************
	service.registerObserverCallback = function(callback){
		observerCallbacks.push(callback);
	};

	var notifyObservers = function(){
		angular.forEach(observerCallbacks, function(callback){
	      console.log("notifying");
	      callback();
	    });
  	};

	
	service.allRoutes = $firebase(fb.child("allRoutes")).$asObject();
	console.log(service.allRoutes);

	var onChangeError = function (error) {
  		alert("Error: " + error);
	};	
	
	var onChange = function(newPosition) {

		var now = new Date().getTime();
		if (ls != 1 || now - lt > 2000) {
			//alert("in service");
			service.currentPosition = newPosition;

			var toPush = {
				lat:newPosition.coords.latitude, 
				lng:newPosition.coords.longitude,
				time:now
			};
			service.latLngs.$add(toPush);

			geoFire.set(username,[newPosition.coords.latitude, newPosition.coords.longitude]).then(function(){
				console.log("Setting new position in geoFire");
			      
			  }).catch(function(error){
			  	console.log(error);
			  });

			notifyObservers();
			lt = now;
			ls = 1;
		}
		
	};

	var startWatching = function(){
		 watchId = navigator.geolocation.watchPosition(onChange, onChangeError, {
			enableHighAccuracy: true,
			maximumAge: 60000,
			timeout: 15000
		});
	};

	service.start = function () {
	    var positionSuccess = function(position){
		    //Get the unique id object reference from Firebase
		    sessionRef = fb.child("routes").child(service.routeData.currentRouteId).push({
		    	created: Firebase.ServerValue.TIMESTAMP,
		    	username: username,
		    	routeID: service.routeData.currentRouteId
		    });	

		    //Set up binding
			var sync = $firebase(sessionRef.child("geometry"));
			service.latLngs = sync.$asArray();

		    fb.child("liveLocsData").child(username).update(service.allRoutes[service.routeData.currentRouteId]);

		    geoFire.set(username,[position.coords.latitude, position.coords.longitude]).then(function(){
				console.log("Current user " + username + "'s location has been added to GeoFire");
			      // When the user disconnects from Firebase (e.g. closes the app, exits the browser),
			      // remove their GeoFire entry
			      fb.child("liveLocs").child(username).onDisconnect().remove();
			      
			      
			  }).catch(function(error){
			  	console.log(error);
			  });
		    
		    

	    	startWatching();

	    };
	    
	    navigator.geolocation.getCurrentPosition(positionSuccess)


	}
	
	service.stop = function () {
	    if (watchId) {
	       navigator.geolocation.clearWatch(watchId);
	    }

	    fb.child("liveLocs").child(username).remove();
	}

	service.resume = function() {
		startWatching();
	}

	service.addStop = function(){
		service.markers["US"+userStopCount] = {
    		lat: service.currentPosition.coords.latitude,
    		lng:  service.currentPosition.coords.longitude,
            message: "new stop",
            focus: false,
            draggable: true,
            layer: 'stops',
            icon: {
                iconUrl: 'img/bus_stop3.png',
                iconSize: [50, 50]
            }
		}
		userStopCount += 1;
		observerCallbacks[2]();
	}

	service.sendtoFBase = function(message){
		
		sessionRef.update(message,				
			function(error){
					if (error) {
						alert("Error" + error);
					} else {
						$ionicPopup.alert({
						     title: 'Pura vida!',
						     template: 'Data enviada satisfactoriamente. Muchas gracias por contribuir.'
						   });
						   
					}
			}
		);
	
	}

	  /*************/
	  /*  HELPERS  */
	  /*************/
	  /* Returns a random string of the inputted length */
	  function generateRandomString(length) {
	      var text = "";
	      var validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	      for(var i = 0; i < length; i++) {
	          text += validChars.charAt(Math.floor(Math.random() * validChars.length));
	      }

	      return text;
	  }

	  	function addMarker(vehicle, vehicleId, inColor){
    		console.log("Adding Marker in factory side", vehicle.l[0])
			service.markers[vehicleId] = 
				{
		    		lat: vehicle.l[0],
		    		lng:  vehicle.l[1],
		            message: vehicleId,
		            focus: false,
		            draggable: false,
		            layer: 'buses',
		            icon: {
		            	type: 'awesomeMarker',
		            	markerColor: 'red'
		            }
		        };
		    observerCallbacks[2]();
		};

		function updateMarker(location, vehicleId){
    		console.log("Updating Marker in factory side", location[0])
			service.markers[vehicleId].lat = location[0];
			service.markers[vehicleId].lng = location[1];
		    		
		    observerCallbacks[2]();
		};

		function deleteMarker(vehicleId){
			delete service.markers[vehicleId];
			observerCallbacks[2]();
		};

	  	/*************/
		/*  GEOQUERY */
		/*************/
		// Keep track of all of the vehicles currently within the query
		var vehiclesInQuery = {};

		// Create a new GeoQuery instance
		var geoQuery = geoFire.query({
		  center: [9.961140, -84.109657],
		  radius: 60
		});

		/* Adds new vehicle markers to the map when they enter the query */
		geoQuery.on("key_entered", function(vehicleId, vehicleLocation) {
			  console.log("someone entered!", vehicleId);
			  // Specify that the vehicle has entered this query
			  
			  vehiclesInQuery[vehicleId] = true;

			  // Look up the vehicle's data in the Transit Open Data Set
			  fb.child("liveLocs").child(vehicleId).once("value", function(dataSnapshot) {
			    // Get the vehicle data from the Open Data Set
			    var vehicle = dataSnapshot.val();

			    // If the vehicle has not already exited this query in the time it took to look up its data in the Open Data
			    // Set, add it to the map
			    if (vehicle !== null && vehiclesInQuery[vehicleId] === true) {

			      // Add the vehicle to the list of vehicles in the query
			      vehiclesInQuery[vehicleId] = vehicle;
					// Create a new marker for the vehicle
			      
				  

				  fb.child("liveLocsData").child(vehicleId).once("value", function(snap){ 
				  	addMarker(vehicle, vehicleId);
				  	service.markers[vehicleId].icon.markerColor = snap.val().color;
				  	service.markers[vehicleId].message = snap.val().name;
				  	observerCallbacks[2]();
					
				  });

			      }
			  }); 


		});

		/* Moves vehicles markers on the map when their location within the query changes */
		geoQuery.on("key_moved", function(vehicleId, vehicleLocation) {
		  // Get the vehicle from the list of vehicles in the query
		  console.log(vehicleId + " moved to " + vehicleLocation[0] + ", " + vehicleLocation[1]);
		  var vehicle = vehiclesInQuery[vehicleId];

		  // Animate the vehicle's marker
		  if (typeof vehicle !== "undefined") {
		    updateMarker(vehicleLocation, vehicleId);
		  }
		});

		/* Removes vehicle markers from the map when they exit the query */
		geoQuery.on("key_exited", function(vehicleId, vehicleLocation) {
		  // Get the vehicle from the list of vehicles in the query
		  console.log(vehicleId + " was removed");
		  var vehicle = vehiclesInQuery[vehicleId];

		  // If the vehicle's data has already been loaded from the Open Data Set, remove its marker from the map
		  
		  deleteMarker(vehicleId);

		  // Remove the vehicle from the list of vehicles in the query
		  delete vehiclesInQuery[vehicleId];
		});

	return service;
});





/**
 * Menu item click directive - intercept, hide menu and go to new location
 */
MapApp.directive('clickMenulink', function() {
    return {
        link: function(scope, element, attrs) {
            element.on('click', function() {
                scope.sideMenuController.toggleLeft();
            });
        }
    }
})
