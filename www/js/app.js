//'use strict';
var MapApp = angular.module('MapApp', [
    'ionic', 'leaflet-directive', 'firebase', 'ngCordova', 'yaru22.md'
]);

MapApp.constant('fbURL', "https://boiling-inferno-6943.firebaseio.com");
MapApp.constant('version', "0.0.3");


MapApp.run(function ($ionicPlatform, $ionicPopup, $ionicModal, $state, $firebaseAuth, $firebase, $ionicLoading,
    $window, version, fbURL) {
    $ionicPlatform.ready(function () {
        if (window.StatusBar) {
            StatusBar.styleDefault();
        }
        //check version**********************************************************
        var fb = new Firebase(fbURL);




        fb.child("version").once("value", function (snap) {
            if (snap.val() != version) {
                $ionicPopup.alert({
                    title: 'Version desactualizada',
                    template: 'Se necesita correr la ultima version del app para poder seguir con el pilot. Favor actualizar desde el Play Store'
                });

                $ionicModal.fromTemplateUrl('templates/blockModal.html', {
                    scope: '',
                    animation: 'slide-in-up'
                }).then(function (modal) {
                    modal.show();
                });

                console.log("lets close");
            } else {
                console.log("version checked successfully");
            }
        });

    });

});


/**
 * Routing table including associated controllers.
 */
MapApp.config(['$stateProvider', '$urlRouterProvider', '$ionicConfigProvider', function ($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
    $stateProvider
        .state('menu', {
            url: "/map",
            abstract: true,
            templateUrl: "templates/menu.html"
        })
        .state('menu.home', {
            url: '/home',
            views: {
                'menuContent': {
                    templateUrl: 'templates/gpsView.html',
                    controller: 'GpsCtrl'
                }
            }
        })
        .state('menu.help', {
            url: '/help',
            views: {
                'menuContent': {
                    templateUrl: 'templates/about.html',
                    controller: 'HelpCtrl'
                }
            }
        })
        .state('menu.profile', {
            url: '/profile',
            views: {
                'menuContent': {
                    templateUrl: 'templates/profile.html',
                    controller: 'ProfileCtrl'
                }
            }
        })
	
		.state('menu.settings', {
            url: '/settings',
            views: {
                'menuContent': {
                    templateUrl: 'templates/settings.html',
                    controller: 'SettingsCtrl'
                }
            }
        })

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
        });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/auth/signin');

    //Set bottom tabs for Android
    $ionicConfigProvider.tabs.position('bottom');
    $ionicConfigProvider.navBar.alignTitle('center');

}]);

MapApp.factory('loginService', function ($state, $firebaseAuth, $firebase, helperService, fbURL) {

    //Authentication*********************
    var s = {};

    s.mainFb = new Firebase(fbURL);

    s.uid = {};
    s.authData = {};
    s.userData = {};
    s.auth = $firebaseAuth(s.mainFb);

    //Set listener*****
    s.auth.$onAuth(function (authData) {
        helperService.hide();
        if (authData) {
            console.log("Saving user in fb", authData);
            s.mainFb.child("users").child(authData.uid).update(authData);
            var dataFb = s.mainFb.child("users").child(authData.uid).child("data");
            //set name and picture
            switch (authData.provider) {
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

            s.authData = authData;
            s.userData = $firebase(s.mainFb.child("users").child(authData.uid).child("data")).$asObject();
            //$rootScope.authData = authData;
            console.log("trying to go to home");
            $state.go('menu.home');
        } else {
            console.log("not authorizing right now");
            $state.go('auth.signin');
        }
    });

    s.logout = function () {
        console.log("logging out...");
        s.auth.$unauth();

        s.authData = {};
        //$rootScope.authData = {};
    };
	
	
    s.checkSession = function () {
        var authData = s.auth.$getAuth();
        if (authData) {
            console.log("Already logged in.. rerouting to main", authData);
            $state.go("menu.home");
        } else {
            console.log("Not logged in.. redirecting to login page");
        }
    };

    return s;



});

MapApp.factory('helperService', function ($ionicLoading, $window, $rootScope) {

    var s = {};

    //distance calculation helpers

    function toRad(value) {
        var RADIANT_CONSTANT = 0.0174532925199433;
        return (value * RADIANT_CONSTANT);
    }

    s.calcDistance = function (starting, ending) {
        var KM_RATIO = 6371;
        try {
            var dLat = toRad(ending.coords.latitude - starting.coords.latitude);
            var dLon = toRad(ending.coords.longitude - starting.coords.longitude);
            var lat1Rad = toRad(starting.coords.latitude);
            var lat2Rad = toRad(ending.coords.latitude);

            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            var d = KM_RATIO * c;



            return d;
        } catch (e) {

            return -1;
        }
    }


    //update binding helpers*********************************************************

    s.apply = function (toUpdate) {
        if ($rootScope.$root.$$phase != '$apply' && $rootScope.$root.$$phase != '$digest') {
            console.log("Applying with apply", toUpdate);
            $rootScope.$apply(toUpdate);
        } else {
            console.log("Applying without apply", toUpdate);
            toUpdate();
        }
    };

    //display helpers*********************************************************  
    s.show = function (text) {
        s.loading = $ionicLoading.show({
            template: text ? text : 'Loading..',
            animation: 'fade-in',
            showBackdrop: true,
            maxWidth: 200,
            showDelay: 0
        });
    };

    s.hide = function () {
        $ionicLoading.hide();
    };

    s.notify = function (text) {
        s.show(text);
        $window.setTimeout(function () {
            s.hide();
        }, 3500);
    };

    //remove "-" from the firebase push key
    s.remDash = function (inString) {
        return inString.replace(/\W/g, '');
    };

    s.randString = function () {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    };

    return s;
});

/**
 * Geolocation service.
 */

MapApp.factory('geoLocationService', function ($ionicPopup, $firebase, $interval, $rootScope, fbURL, loginService, helperService) {
    //	'use strict';

    //Globals

    var uS = loginService;

    // var username = uS.authData.uid;
    //-------------------

    var service = {};
    var watchId;

    var fb = new Firebase(fbURL);
    var geoFire = new GeoFire(fb.child("liveLocs"));

    var sessionRef;

    var observerCallbacks = [];

    var userStopCount = 0;
    var userStops = [];

    var prevLoc = {};

    service.randName = '';
    service.tripDistance = 0;
    service.latLngs = [];
    service.currentPosition = {};

    service.isOn = false;

    service.routeData = {};

    service.allRoutes = {};
    service.liveLocsData = {};


    //Set initial static markers
    service.markers = {
        office: {
            name: 'office!',
            lat: 9.965061,
            lng: -84.120121,
            message: "Ultrapark II",
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
    service.registerObserverCallback = function (callback) {
        observerCallbacks.push(callback);
    };

    var notifyObservers = function () {
        angular.forEach(observerCallbacks, function (callback) {
            console.log("notifying");
            callback();
        });
    };

    //Retrieve all routes from FB***************************
    service.allRoutes = $firebase(fb.child("allRoutes")).$asObject();
    console.log(service.allRoutes);

    service.liveLocsData = $firebase(fb.child("liveLocsData")).$asObject();

    //service.pushDict = $firebase(fb.child("Helper").child("pushDict")).$asObject();
    //service.revPushDict = $firebase(fb.child("Helper").child("revPushDict")).$asObject();


    var onChangeError = function (error) {
        alert("Error: " + error);
    };

    var onChange = function (newPosition) {

        var now = new Date().getTime();

        //alert("in service");
        service.currentPosition = newPosition;

        //update distance
        service.tripDistance += helperService.calcDistance(prevLoc, newPosition);
        prevLoc = newPosition;

        var toPush = {
            lat: newPosition.coords.latitude,
            lng: newPosition.coords.longitude,
            time: now
        };
        service.latLngs.$add(toPush);

        geoFire.set(service.randName, [newPosition.coords.latitude, newPosition.coords.longitude]).then(function () {
            console.log("Setting new position in geoFire");

        }).catch(function (error) {
            console.log(error);
        });

        notifyObservers();



    };

    var startWatching = function () {
        /*	 watchId = navigator.geolocation.watchPosition(onChange, onChangeError, {
			enableHighAccuracy: true,
			maximumAge: 60000,
			timeout: 15000
		}); */

        watchId = $interval(function () {
            console.log("starting interval function");
            navigator.geolocation.getCurrentPosition(onChange, onChangeError, {
                enableHighAccuracy: true,
                maximumAge: 60000,
                timeout: 15000
            })
        }, 5000);
    };

    service.start = function () {
        service.isOn = true;
        var positionSuccess = function (position) {

            prevLoc = position;
            service.randName = helperService.randString();

            //Get the unique id object reference from Firebase
            sessionRef = fb.child("routes").child(service.routeData.currentRouteId).push({
                created: Firebase.ServerValue.TIMESTAMP,
                username: uS.authData.uid,
                routeID: service.routeData.currentRouteId
            });

            //Set up bindings
            var sync = $firebase(sessionRef.child("geometry"));
            service.latLngs = sync.$asArray();
            userStops = $firebase(sessionRef.child("stops")).$asArray();

            var toSend = service.allRoutes[service.routeData.currentRouteId];
            toSend.likes = 0;
            toSend.liked = {
                dummy: true
            };
            toSend.pushKey = sessionRef.key();
			toSend.created = Firebase.ServerValue.TIMESTAMP;
            fb.child("liveLocsData").child(service.randName).update(toSend);

            fb.child("liveLocsData").child(service.randName).onDisconnect().remove(function (err) {
                console.log("Trying to attach onDisconnect to liveLocs", err);
            });


            geoFire.set(service.randName, [position.coords.latitude, position.coords.longitude]).then(function () {
                console.log("Current user " + uS.authData.uid + "'s location has been added to GeoFire");
                // When the user disconnects from Firebase (e.g. closes the app, exits the browser),
                // remove their GeoFire entry
                fb.child("liveLocs").child(service.randName).onDisconnect().remove();
                helperService.hide();

            }).catch(function (error) {
                console.log(error);
            });



            startWatching();

        };
        helperService.show("Cargando ubicación...");
        navigator.geolocation.getCurrentPosition(positionSuccess)


    }

    service.stop = function (message) {

        //send to routes FB
        message.totalDistKM = service.tripDistance;
        message.likes = service.liveLocsData[service.randName].likes;
        sessionRef.update(message,
            function (error) {
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

        //send to username FB

        if (uS.userData.likes) uS.userData.likes += service.liveLocsData[service.randName].likes;
        else uS.userData['likes'] = service.liveLocsData[service.randName].likes;

        if (uS.userData.totalKm) uS.userData.totalKm += service.tripDistance;
        else uS.userData.totalKm = service.tripDistance;

        uS.userData.$save();

        //Finish
        service.isOn = false;
        service.tripDistance = 0;
        if (watchId) {
            $interval.cancel(watchId);
        }

        fb.child("liveLocs").child(service.randName).remove();
        fb.child("liveLocsData").child(service.randName).remove();

    }


    service.addStop = function () {
        var mark = {
            lat: service.currentPosition.coords.latitude,
            lng: service.currentPosition.coords.longitude,
            message: "new stop",
            focus: false,
            draggable: true,
            layer: 'stops',
            icon: {
                iconUrl: 'img/bus_stop3.png',
                iconSize: [50, 50]
            }
        };
        service.markers["US" + userStopCount] = mark;
        userStops.$add(mark);
        userStopCount += 1;
        observerCallbacks[2]();
    }

    /*************/
    /*  HELPERS  */
    /*************/
    /* Returns a random string of the inputted length */

    function addMarker(vehicle, vehicleId, inColor, inName) {
        console.log("Adding Marker in factory side", vehicle.l[0])
        helperService.apply(function () {
            service.markers[vehicleId] = {
                name: inName,
                lat: vehicle.l[0],
                lng: vehicle.l[1],
                message: "<div ng-include src=\"'templates/busMarkerTemplate.html'\"></div>",
                focus: false,
                draggable: false,
                layer: 'buses',
                icon: {
                    type: 'awesomeMarker',
                    markerColor: inColor
                }

            };
        });


    };

    function updateMarker(location, vehicleId) {
        console.log("Updating Marker in factory side", location[0]);
        helperService.apply(function () {
            service.markers[vehicleId].lat = location[0];
            service.markers[vehicleId].lng = location[1];
        });

    };

    function deleteMarker(vehicleId) {
        helperService.apply(function () {
            delete service.markers[vehicleId];

        });

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
    geoQuery.on("key_entered", function (vehicleId, vehicleLocation) {
        console.log("someone entered!", vehicleId);
        // Specify that the vehicle has entered this query

        vehiclesInQuery[vehicleId] = true;

        // Look up the vehicle's data in the Transit Open Data Set
        fb.child("liveLocs").child(vehicleId).once("value", function (dataSnapshot) {
            // Get the vehicle data from the Open Data Set
            var vehicle = dataSnapshot.val();

            // If the vehicle has not already exited this query in the time it took to look up its data in the Open Data
            // Set, add it to the map
            if (vehicle !== null && vehiclesInQuery[vehicleId] === true) {

                // Add the vehicle to the list of vehicles in the query
                vehiclesInQuery[vehicleId] = vehicle;
                // Create a new marker for the vehicle


                fb.child("liveLocsData").child(vehicleId).once("value", function (snap) {
                    addMarker(vehicle, vehicleId, snap.val().color,
                        snap.val().name);

                });

            }
        });


    });

    /* Moves vehicles markers on the map when their location within the query changes */
    geoQuery.on("key_moved", function (vehicleId, vehicleLocation) {
        // Get the vehicle from the list of vehicles in the query
        console.log(vehicleId + " moved to " + vehicleLocation[0] + ", " + vehicleLocation[1]);
        var vehicle = vehiclesInQuery[vehicleId];

        // Animate the vehicle's marker
        if (typeof vehicle !== "undefined") {
            updateMarker(vehicleLocation, vehicleId);
        }
    });

    /* Removes vehicle markers from the map when they exit the query */
    geoQuery.on("key_exited", function (vehicleId, vehicleLocation) {
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
MapApp.directive('clickMenulink', function () {
    return {
        link: function (scope, element, attrs) {
            element.on('click', function () {
                scope.sideMenuController.toggleLeft();
            });
        }
    }
})