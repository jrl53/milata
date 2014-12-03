
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
	
    $scope.allRoutes = geoLocationService.allRoutes;
    $scope.routeData = geoLocationService.routeData;   
	$scope.markers = geoLocationService.markers;
	
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
    		buses : {
    			name : 'Live buses',
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
          $scope.isOn = on;
	      geoLocationService.start();
	    } else {
	      geoLocationService.stop();
          $scope.isOn = on;
	    }
	  };

	$scope.sendtoFBase = function(){
		geoLocationService.sendtoFBase($scope.message);
	};

    $scope.addStop = function(){
        geoLocationService.addStop();
    };
	
	// Load the modal from the given template URL
    $ionicModal.fromTemplateUrl('templates/submitModal.html', function($ionicModal) {
        $scope.submitModal = $ionicModal;
    }, {
        // Use our scope for the scope of the modal to keep it simple
        scope: $scope,
        // The animation we want to use for the modal entrance
        animation: 'slide-in-up'
    });
	
    $ionicModal.fromTemplateUrl('templates/routeModal.html', function($ionicModal) {
        $scope.routeModal = $ionicModal;
    }, {
        // Use our scope for the scope of the modal to keep it simple
        scope: $scope,
        // The animation we want to use for the modal entrance
        animation: 'slide-in-up'
    });
    
	
}]);