//'use strict';
var MapApp = angular.module('MapApp', [
	'ionic', 'leaflet-directive', 'firebase']);

MapApp.constant('fbURL',"https://boiling-inferno-6943.firebaseio.com");
MapApp.constant('version', "0.0.3");

MapApp.value('userSession', {});

MapApp.run(function($ionicPlatform, $ionicPopup, $ionicModal, $state, $rootScope, $firebaseAuth, $firebase, $ionicLoading,
                     $window, version, fbURL, userSession) {
  $ionicPlatform.ready(function() {
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
    //check version**********************************************************
    var fb = new Firebase(fbURL);
  
    $rootScope.mainFb = fb;
      
      
    fb.child("version").once("value",function(snap){
        if (snap.val() != version){
            $ionicPopup.alert({
                             title: 'Version desactualizada',
                             template: 'Se necesita correr la ultima version del app para poder seguir con el pilot. Favor actualizar desde el Play Store'
                           });

            $ionicModal.fromTemplateUrl('templates/blockModal.html', {
                scope: '',
                animation: 'slide-in-up'
              }).then(function(modal) {
                modal.show();
              });

            console.log("lets close");
        } 
    });
    //Authentication*************************************************************************
    
    
      
    $rootScope.uid = {};  
    $rootScope.auth = $firebaseAuth(fb);
    
    //Set listener*****
    $rootScope.auth.$onAuth(function(authData){
        if(authData){
            console.log("Saving user in fb", authData);
            fb.child("users").child(authData.uid).update(authData);
            var dataFb = fb.child("users").child(authData.uid).child("data");
            //set name and picture
            switch(authData.provider){
                case 'facebook':
                    dataFb.update({
                        name: authData.facebook.displayName,
                        pic_url: authData.facebook.cachedUserProfile.picture.data.url
                    });
                    break;
                case 'twitter':
                    dataFb.update({
                        name: authData.twitter.displayName,
                        pic_url: authData.twitter.cachedUserProfile.profile_image_url
                    });
                    break;
                case 'password':
                    dataFb.update({
                        pic_url: "http://www.milatacr.com/www/img/milata_icon_512.png"
                    });
                    break;
            };
            
            userSession.authData = authData;
            userSession.userData = $firebase(fb.child("users").child(authData.uid).child("data")).$asObject();
            //$rootScope.authData = authData;
            console.log("trying to go to home");
            $state.go('menu.home');
        }
        else {
            console.log("not authorizing right now");
            $state.go('auth.signin');
        }
    });
    
    $rootScope.logout = function() {
        console.log("logging out...");
        $rootScope.auth.$unauth();

        userSession.authData = {};
        //$rootScope.authData = {};
    };
      
    $rootScope.checkSession = function(){
        var authData = $rootScope.auth.$getAuth();
        if (authData){
            console.log("Already logged in.. rerouting to main", authData);
            $state.go("menu.home");
        }
        else {
            console.log("Not logged in.. redirecting to login page");
        }
    };
      
    //display helpers*********************************************************  
    $rootScope.show = function(text) {
        $rootScope.loading = $ionicLoading.show({
                template: text ? text : 'Loading..',
                animation: 'fade-in',
                showBackdrop: true,
                maxWidth: 200,
                showDelay: 0
            });
    };

    $rootScope.hide = function() {
        $ionicLoading.hide();
    };

    $rootScope.notify = function(text) {
        $rootScope.show(text);
        $window.setTimeout(function() {
            $rootScope.hide();
        }, 1999);
    };

      
  });
});


/**
 * Routing table including associated controllers.
 */
MapApp.config(['$stateProvider', '$urlRouterProvider', '$ionicConfigProvider', function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
	$stateProvider
		.state('menu', {url: "/map", abstract: true, templateUrl: "templates/menu.html"})
		.state('menu.home', {url: '/home', views:	 {'menuContent': {templateUrl: 'templates/gpsView.html', controller: 'GpsCtrl'} }  })
		.state('menu.help', {url: '/help', views: {'menuContent': {templateUrl: 'helpView.html', controller: 'HelpCtrl'} }  })
		.state('menu.profile', {url: '/profile', views: {'menuContent': {templateUrl: 'templates/profile.html', controller: 'ProfileCtrl'} }  })
        .state('auth', {
            url: "/auth",
            abstract: true,
            templateUrl: "templates/auth.html"
        })
        .state('auth.signin', {
            url: '/signin',
            views: {
                'auth-signin': {
                    templateUrl: 'templates/auth-signin.html',
                    controller: 'SignInCtrl'
                }
            }
        })
        .state('auth.signup', {
            url: '/signup',
            views: {
                'auth-signup': {
                    templateUrl: 'templates/auth-signup.html',
                    controller: 'SignUpCtrl'
                }
            }
        })
    ;

	// if none of the above states are matched, use this as the fallback
	$urlRouterProvider.otherwise('/auth/signin');
    
    //Set bottom tabs for Android
    $ionicConfigProvider.tabs.position('bottom');
    
}]);

/**
* Geolocation service.
*/

MapApp.factory('geoLocationService', function ($ionicPopup, $firebase, fbURL, userSession) {
//	'use strict';
	
	//Globals
	
	var uS = userSession;
    
   // var username = uS.authData.uid;
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
	var userStops = []; 

	service.latLngs = [];
	service.currentPosition = {};
	
	service.isOn = false;

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

	//Retrieve all routs from FB***************************
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

			geoFire.set(userSession.authData.uid,[newPosition.coords.latitude, newPosition.coords.longitude]).then(function(){
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
		    	username: userSession.authData.uid,
		    	routeID: service.routeData.currentRouteId
		    });	

		    //Set up bindings
			var sync = $firebase(sessionRef.child("geometry"));
			service.latLngs = sync.$asArray();
			userStops = $firebase(sessionRef.child("stops")).$asArray();

		    fb.child("liveLocsData").child(userSession.authData.uid)
                .update(service.allRoutes[service.routeData.currentRouteId]);
            
            fb.child("liveLocsData").child(userSession.authData.uid).onDisconnect().remove(function(err){
                console.log("Trying to attach onDisconnect to liveLocs", err);
            });
            

		    geoFire.set(userSession.authData.uid,[position.coords.latitude, position.coords.longitude]).then(function(){
				console.log("Current user " + userSession.authData.uid + "'s location has been added to GeoFire");
			      // When the user disconnects from Firebase (e.g. closes the app, exits the browser),
			      // remove their GeoFire entry
			      fb.child("liveLocs").child(userSession.authData.uid).onDisconnect().remove();
			      
			      
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

	    fb.child("liveLocs").child(userSession.authData.uid).remove();
        fb.child("liveLocsData").child(userSession.authData.uid).remove();
        
	}

	service.resume = function() {
		startWatching();
	}

	
	
	service.addStop = function(){	
		var mark = {
    		lat: service.currentPosition.coords.latitude,
    		lng:  service.currentPosition.coords.longitude,
            message: "new stop",
            focus: false,
            draggable: false,
            layer: 'stops',
            icon: {
                iconUrl: 'img/bus_stop3.png',
                iconSize: [50, 50]
            }
		};
		service.markers["US"+userStopCount] = mark;
		userStops.$add(mark);
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
