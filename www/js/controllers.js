
/**
 * MAIN CONTROLLER - handle inapp browser
 */



MapApp.controller('MainCtrl', ['$scope', function($scope) {
  // do something
}]);

MapApp.controller('ProfileCtrl', ['$scope', 'loginService', function($scope, loginService) {
    $scope.uS = loginService;
    
}]);

MapApp.controller('HelpCtrl', ['$scope', function($scope) {
  // do something
}]);

MapApp.controller('RouteSearchCtrl', ['$scope', '$firebase','fbURL', function($scope, $firebase, fbURL) {
    $scope.allRoutesArray = $firebase(new Firebase(fbURL).child("allRoutes")).$asArray();
    $scope.searchString = '';
    $scope.clearFilter = function(){
        $scope.searchString = '';
    };
    
}]);

MapApp.controller('SignInCtrl', ['$scope', '$cordovaOauth', 'loginService', 'displayService', 'fbURL', function($scope,  $cordovaOauth, loginService, displayService, fbURL) {
    var fb = new Firebase(fbURL);
    
    loginService.checkSession();
    
    $scope.user = {
        email: "",
        password: "",
        name: ""
    };
    $scope.logWithPass = function() {
        displayService.show('Ingresando...');
        var email = this.user.email;
        var password = this.user.password;
        if (!email || !password) {
            displayService.notify("Favor complete los campos");
            return false;
        }

        loginService.auth.$authWithPassword({
            email: email,
            password: password
        }).then(function(authData) {
            displayService.hide();
          
        }, function(error) {
            displayService.hide();
            if (error.code == 'INVALID_EMAIL') {
                displayService.notify('Email incorrecto');
            } else if (error.code == 'INVALID_PASSWORD') {
                displayService.notify('Contraseña incorrecta');
            } else if (error.code == 'INVALID_USER') {
                displayService.notify('Usuario incorrecto');
            } else {
                displayService.notify('Oops, hay un problema. Favor avisarle a Chino');
            }
        });
    }
    
    $scope.logWithFacebook = function() {
        displayService.show('Ingresando...');
        $cordovaOauth.facebook("635359303242813", ["email"]).then(function(result) {
            console.log("ngCordova loging returned: " ,result);
            fb.authWithOAuthToken("facebook", result.access_token, function(error, authData){
                if(error) {console.log("Within firebase logging flow: " + error); displayService.hide()}
                else console.log("Within firebase logging flow: Success: " + authData);
            })
        }, function(error) {
            console.log(error);
            console.log("Maybe we are in a browser, trying with normal FB logging..");
            loginService.auth.$authWithOAuthPopup("facebook").then(function(authData) {
              console.log("Logged in as:", authData.uid);
            }).catch(function(error) {
              console.error("Authentication failed:", error);
              displayService.hide();
            });
        });
    };
    
    $scope.logWithTwitter = function() {
        simpleLog.$login('twitter');
    };

}]);

MapApp.controller('SignUpCtrl', [
    '$scope', '$firebaseAuth', '$window', 'loginService', 'displayService',
    function($scope, $firebaseAuth, $window, loginService, displayService) {

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
                displayService.notify("Favor complete los campos");
                return false;
            }
            displayService.show('Registrando...');

            loginService.auth.$createUser(email, password).then(function() {
                displayService.hide();
                displayService.notify("Usuario creado");
                return loginService.auth.$authWithPassword({
                    email: email,
                    password: password}
                );
            }).then(function(authData){
                console.log("Created/logged in.. Saving name");
                loginService.mainFb.child("users").child(authData.uid).child("data").update({name: name});
            }).catch(function(error){
                console.log("Error while creating/logging in", error);
                if (error.code == 'INVALID_EMAIL') {
                        displayService.notify('Email incorrecto');
                    } else if (error.code == 'EMAIL_TAKEN') {
                        displayService.notify('Email existente. Intente otro');
                    } else {
                        displayService.notify('Oops algo anda mal. Favor llamar a Chino');
                    }
            });
        }
    }
]);

MapApp.controller('LeftMenuCtrl', ['$scope', 'loginService', function($scope, loginService) {
    //$scope.authData = $rootScope.authData;
    $scope.uSession = loginService;
    console.log("in LeftMenuCtrl... authData: ", $scope.uSession.authData);
    $scope.logout = function(){
        loginService.logout();
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