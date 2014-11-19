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
		.state('menu.help', {url: '/help', views: {'menuContent': {templateUrl: 'helpView.html', controller: 'HelpCtrl'} }  });

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

	var observerCallbacks = [];
	
	service.latLngs = [];
	service.currentPosition = {};
	
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
MapApp.controller('GpsCtrl', ['$scope','leafletData', 'geoLocationService',
	function($scope, leafletData, geoLocationService) {
	
	
	 
	//$scope.ta = document.querySelector('textarea');
	//$scope.ts = document.querySelector('#stopstext');
	$scope.lt = 0;
	$scope.ls = false;
	$scope.track = false;
	$scope.watchID;
	
	$scope.filters = {};
    $scope.filters.center = {
        lat: 51.505,
        lng: -0.09,
        zoom: 5
    };
    
    $scope.paths = {
            p1: {
                color: '#008000',
                weight: 8,
                latlngs: [
                    { lat: 51.50, lng: -0.082 },
                    { lat: 48.83, lng: 2.37 },
                    { lat: 41.91, lng: 12.48 }
                ],
            }
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
	
	
		

/*	function onChange(newPosition) {
		$scope.currentPosition = newPosition;	  //Set for two-way binding
		

		var now = new Date().getTime();
		if ($scope.ls != 1 || now - $scope.lt > 1000) {
			
			geoLocationService.doYourThing();
			
			$scope.lt = now;
			$scope.ls = 1;
		}
		
	}
*/
	

	
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
