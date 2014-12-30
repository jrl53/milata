
/**
 * MAIN CONTROLLER - handle inapp browser
 */
MapApp.controller('MainCtrl', ['$scope', function($scope) {
  // do something
}]);

MapApp.controller('HelpCtrl', ['$scope', function($scope) {
  // do something
}]);

MapApp.controller('SignInCtrl', ['$scope', '$rootScope', 'fbURL', function($scope, $rootScope, fbURL) {
    $rootScope.checkSession();
    
    $scope.user = {
        email: "",
        password: "",
        name: ""
    };
    $scope.validateUser = function() {
        $rootScope.show('Please wait.. Authenticating');
        var email = this.user.email;
        var password = this.user.password;
        if (!email || !password) {
            $rootScope.notify("Please enter valid credentials");
            return false;
        }

        $rootScope.auth.$authWithPassword({
            email: email,
            password: password
        }).then(function(authData) {
            $rootScope.hide();
          
        }, function(error) {
            $rootScope.hide();
            if (error.code == 'INVALID_EMAIL') {
                $rootScope.notify('Invalid Email Address');
            } else if (error.code == 'INVALID_PASSWORD') {
                $rootScope.notify('Invalid Password');
            } else if (error.code == 'INVALID_USER') {
                $rootScope.notify('Invalid User');
            } else {
                $rootScope.notify('Oops something went wrong. Please try again later');
            }
        });
    }

}]);

MapApp.controller('SignUpCtrl', [
    '$scope', '$rootScope', '$firebaseAuth', '$window',
    function($scope, $rootScope, $firebaseAuth, $window) {

        $scope.user = {
            email: "",
            password: "",
            name: ""
        };
        $scope.createUser = function() {
            var email = this.user.email;
            var password = this.user.password;
            var name = this.user.name;
            if (!email || !password || !name) {
                $rootScope.notify("Please enter valid credentials");
                return false;
            }
            $rootScope.show('Please wait.. Registering');

            $rootScope.auth.$createUser(email, password).then(function() {
                $rootScope.hide();
                $rootScope.notify("User created successfully");
                return $rootScope.auth.$authWithPassword({
                    email: email,
                    password: password}
                );
            }).then(function(authData){
                console.log("Created/logged in.. Saving name");
                $rootScope.mainFb.child("users").child(authData.uid).update({name: name});
            }).catch(function(error){
                console.log("Error while creating/logging in", error);
                if (error.code == 'INVALID_EMAIL') {
                        $rootScope.notify('Invalid Email Address');
                    } else if (error.code == 'EMAIL_TAKEN') {
                        $rootScope.notify('Email Address already taken');
                    } else {
                        $rootScope.notify('Oops something went wrong. Please try again later');
                    }
            });
        }
    }
]);

MapApp.controller('LeftMenuCtrl', ['$scope', '$rootScope', function($scope, $rootScope) {
    $scope.authData = $rootScope.authData;
    $scope.logout = function(){
        $rootScope.logout();
    };
}]);

/**
 * A google map / GPS controller.
 */
MapApp.controller('GpsCtrl', ['$scope', '$ionicModal', 'leafletData', 'geoLocationService', 'displayPathService', 
	function($scope, $ionicModal, leafletData, geoLocationService, displayPathService) {
	
    $scope.allRoutes = geoLocationService.allRoutes;
    $scope.routeData = geoLocationService.routeData;   
	$scope.markers = geoLocationService.markers;
    $scope.isOn = geoLocationService.isOn;
	
    $scope.filters = {};
    $scope.filters.center = {
        lat: 9.933253,
        lng:  -84.077001,
        zoom: 12
    };

    $scope.tiles = {
             mapbox_streets: {
                    name: 'Mapbox Streets',
                    url: 'http://api.tiles.mapbox.com/v4/jrl53.kk1j4m92/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoianJsNTMiLCJhIjoiTDFXaDdubyJ9.rTD1KwpSkwwrLjoBc1EImw',
                    type: 'xyz'
            }
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
        comment: ''

    };	    

    $scope.layers = {
    	baselayers : {
    		
             mapbox_streets: {
                    name: 'Mapbox',
                    url: 'http://api.tiles.mapbox.com/v4/jrl53.kk1j4m92/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoianJsNTMiLCJhIjoiTDFXaDdubyJ9.rTD1KwpSkwwrLjoBc1EImw',
                    type: 'xyz'
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
        
    
    displayPathService.searchPath("CB08");
    
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
          geoLocationService.isOn = on;
	      geoLocationService.start();
	    } else {
          $scope.isOn = on;
	      geoLocationService.stop();
          geoLocationService.isOn = on;
          $scope.paths.p1.latlngs = [];
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