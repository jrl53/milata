//'use strict';
var MapApp = angular.module('MapApp', [
	'ionic', 'leaflet-directive']);

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

MapApp.factory('geoLocationService', function () {
//	'use strict';
	var service = {};
	var watchId;
	var lt = 0;
	var ls = false;

	var fb = new Firebase("https://boiling-inferno-6943.firebaseio.com");
	var geoFire = new GeoFire(fb.child("liveLocs"));

	var observerCallbacks = [];
	
	var username = generateRandomString(5);

	service.latLngs = [];
	service.currentPosition = {};
	service.markers = {};

	//Notification system*********************************
	service.registerObserverCallback = function(callback){
		observerCallbacks.push(callback);
	}

	var notifyObservers = function(){
		angular.forEach(observerCallbacks, function(callback){
	      console.log("notifying");
	      callback();
	    });
  	};

	//*******************************************************
	
	var onChangeError = function (error) {
  		alert("Error: " + error);
	};	
	
	var onChange = function(newPosition) {

		var now = new Date().getTime();
		if (ls != 1 || now - lt > 1000) {
			//alert("in service");
			service.currentPosition = newPosition;
			var toPush = {lat:newPosition.coords.latitude, lng:newPosition.coords.longitude};
			service.latLngs.push(toPush);

			geoFire.set(username,[newPosition.coords.latitude, newPosition.coords.longitude]).then(function(){
				console.log("Current user " + username + "'s location has been added to GeoFire");

			      // When the user disconnects from Firebase (e.g. closes the app, exits the browser),
			      // remove their GeoFire entry
			      fb.child("liveLocs").child(username).onDisconnect().remove();
			  }).catch(function(error){
			  	console.log(error);
			  });

			notifyObservers();
			lt = now;
			ls = 1;
		}
		
	};

	service.start = function () {
	    watchId = navigator.geolocation.watchPosition(onChange, onChangeError, {
			enableHighAccuracy: true,
			maximumAge: 60000,
			timeout: 15000
		});
	}
	
	service.stop = function () {
	    if (watchId) {
	       navigator.geolocation.clearWatch(watchId);
	    }
		alert(watchId);
	}

	service.sendtoFBase = function(message){
		
        message.geometry = service.latLngs;
		
		fb.push(message,				
			function(error){
					if (error) {
						alert("Error" + error);
					} else {
						alert("Data submitted successfully");
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

	  	function addMarker(vehicle, vehicleId){
    		console.log("Adding Marker in factory side", vehicle.l[0])
			service.markers[vehicleId] = 
				{
		    		lat: vehicle.l[0],
		    		lng:  vehicle.l[1],
		            message: vehicleId,
		            focus: false,
		            draggable: false
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
		  radius: 20
		});

		/* Adds new vehicle markers to the map when they enter the query */
		geoQuery.on("key_entered", function(vehicleId, vehicleLocation) {
		  console.log("someone entered!", vehicleId);
		  // Specify that the vehicle has entered this query
		  
		  vehiclesInQuery[vehicleId] = true;

		  // Look up the vehicle's data in the Transit Open Data Set
		  fb.child("liveLocs").child(vehicleId).once("value", function(dataSnapshot) {
		    // Get the vehicle data from the Open Data Set
		    vehicle = dataSnapshot.val();

		    // If the vehicle has not already exited this query in the time it took to look up its data in the Open Data
		    // Set, add it to the map
		    if (vehicle !== null && vehiclesInQuery[vehicleId] === true) {
		      // Add the vehicle to the list of vehicles in the query
		      vehiclesInQuery[vehicleId] = vehicle;

		      // Create a new marker for the vehicle
		      addMarker(vehicle, vehicleId);
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
 * HEADER - handle menu toggle
 */
MapApp.controller('HeaderCtrl', function($scope) {
	// Main app controller, empty for the example
	$scope.leftButtons = [
		{ 
		type: 'button-clear',
		content: '<i class="icon ion-navicon"></i>',
		tap: function(e) {
			$scope.sideMenuController.toggleLeft();
			}
		}
	];
});
/**
 * MAIN CONTROLLER - handle inapp browser
 */
MapApp.controller('MainCtrl', ['$scope', function($scope) {
  // do something
}]);

/**
 * A google map / GPS controller.
 */
MapApp.controller('GpsCtrl', ['$scope','$ionicModal','leafletData', 'geoLocationService', 
	function($scope, $ionicModal, leafletData, geoLocationService) {
	
	$scope.username = "Jose";
	
	$scope.filters = {};
    $scope.filters.center = {
        lat: 9.933253,
        lng:  -84.077001,
        zoom: 12
    };

    $scope.tiles = {
            url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          };
    
    $scope.paths = {
            p1: {
                color: '#008000',
                weight: 4,
                latlngs: [],
            }
        };

   

    $scope.markers = {};

    $scope.message = {
    	routeName : '',
    	company : '',
    	name : '',
    	email : '',


    };	    

    $scope.layers = {
    	baselayers : {
    		osm : {
    			name: 'OpenStreetMap',
                type: 'xyz',
                url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                layerOptions: {
                    subdomains: ['a', 'b', 'c'],
                    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    continuousWorld: true
    			}
    		}
    	}, 
    	overlays : {
    		vehicles : {
    			name : 'Vehicles',
    			type : 'group',
    			visible : true
    		},
    		stops : {
    			name : 'Stops',
    			type : 'group',
    			visible : true
    		}

    	}

    };

    
    var updateMarkers = function(){
    	console.log("updating markers");
    	$scope.markers = geoLocationService.markers;
    	$scope.$apply();
    };


    var updateLine = function(){
    	console.log("updating line");
    	$scope.paths.p1.latlngs = geoLocationService.latLngs;
    	
    };


    var updateLocation = function(){
    	console.log("updating");
    	//alert("yey!");
    	$scope.currentPos = geoLocationService.currentPosition;
    	$scope.moveCenter($scope.currentPos);

    	$scope.$apply();

    };

  	geoLocationService.registerObserverCallback(updateLocation);
	geoLocationService.registerObserverCallback(updateLine);
	geoLocationService.registerObserverCallback(updateMarkers);

    $scope.moveCenter = function(newPos) {
         $scope.filters.center.lat = newPos.coords.latitude;
         $scope.filters.center.lng = newPos.coords.longitude;

    
    }

	$scope.recording = function (on) {
	    if (on) {
	      geoLocationService.start();
	    } else {
	      geoLocationService.stop();
	    }
	  };

	$scope.sendtoFBase = function(){
		geoLocationService.sendtoFBase($scope.message);
	};
	
	// Load the modal from the given template URL
    $ionicModal.fromTemplateUrl('templates/modal.html', function($ionicModal) {
        $scope.modal = $ionicModal;
    }, {
        // Use our scope for the scope of the modal to keep it simple
        scope: $scope,
        // The animation we want to use for the modal entrance
        animation: 'slide-in-up'
    });
	
    
	
}]);


/**
 * MAIN CONTROLLER - handle inapp browser
 */
MapApp.controller('HelpCtrl', ['$scope', function($scope) {
  // do something
}]);

// formats a number as a latitude (e.g. 40.46... => "40°27'44"N")
MapApp.filter('lat', function () {
    return function (input, decimals) {
        if (!decimals) decimals = 0;
        input = input * 1;
        var ns = input > 0 ? "N" : "S";
        input = Math.abs(input);
        var deg = Math.floor(input);
        var min = Math.floor((input - deg) * 60);
        var sec = ((input - deg - min / 60) * 3600).toFixed(decimals);
        return deg + "°" + min + "'" + sec + '"' + ns;
    }
});

// formats a number as a longitude (e.g. -80.02... => "80°1'24"W")
MapApp.filter('lon', function () {
    return function (input, decimals) {
        if (!decimals) decimals = 0;
        input = input * 1;
        var ew = input > 0 ? "E" : "W";
        input = Math.abs(input);
        var deg = Math.floor(input);
        var min = Math.floor((input - deg) * 60);
        var sec = ((input - deg - min / 60) * 3600).toFixed(decimals);
        return deg + "°" + min + "'" + sec + '"' + ew;
    }
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
