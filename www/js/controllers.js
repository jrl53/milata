
/**
 * MAIN CONTROLLER - handle inapp browser
 */

MapApp.controller('MarkerCtrl', ['$scope', function($scope) {
	
	$scope.num = 0;
	$scope.add = function(){
		$scope.num =+ 1;
		console.log("this one works");
	};
	$scope.greet = function(args){
				console.log("trying to alert!");
				alert("Hola!.. " + args.markerName);
			};
	$scope.$on('leafletDirectiveMarker.click', function(e, args) {
            // Args will contain the marker name and other relevant information
            console.log("I'm also watching here!");
			//$scope.greet = function(){
			//	console.log("trying to alert!");
			//	alert("Hola!.. " + args.markerName);
			//};
           
        }); 
	
}]);

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

MapApp.controller('SignInCtrl', ['$scope', '$cordovaOauth', 'loginService', 'helperService', 'fbURL', function($scope,  $cordovaOauth, loginService, helperService, fbURL) {
    var fb = new Firebase(fbURL);
    
    loginService.checkSession();
    
    $scope.user = {
        email: "",
        password: "",
        name: ""
    };
    $scope.logWithPass = function() {
        helperService.show('Ingresando...');
        var email = this.user.email;
        var password = this.user.password;
        if (!email || !password) {
            helperService.notify("Favor complete los campos");
            return false;
        }

        loginService.auth.$authWithPassword({
            email: email,
            password: password
        }).then(function(authData) {
            helperService.hide();
          
        }, function(error) {
            helperService.hide();
            if (error.code == 'INVALID_EMAIL') {
                helperService.notify('Email incorrecto');
            } else if (error.code == 'INVALID_PASSWORD') {
                helperService.notify('Contraseña incorrecta');
            } else if (error.code == 'INVALID_USER') {
                helperService.notify('Usuario incorrecto');
            } else {
                helperService.notify('Oops, hay un problema. Favor avisarle a Chino');
            }
        });
    }
    
    $scope.logWithFacebook = function() {
        helperService.show('Ingresando...');
        
        loginService.auth.$authWithOAuthPopup("facebook",{scope: "email"}).then(function(authData) {
          console.log("Logged in as:", authData);
        }).catch(function(error) {
          console.error("Authentication failed:", error);
          helperService.hide();
        });
     
    };
    
    $scope.logWithTwitter = function() {
        loginService.auth.$authWithOAuthPopup("twitter").then(function(authData) {
              console.log("Logged in as:", authData.uid);
            }).catch(function(error) {
              console.log("Authentication failed:" + error);
              helperService.hide();
            });
    };
}]);

MapApp.controller('SignUpCtrl', [
    '$scope', '$firebaseAuth', '$window', 'loginService', 'helperService',
    function($scope, $firebaseAuth, $window, loginService, helperService) {

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
                helperService.notify("Favor complete los campos");
                return false;
            }
            helperService.show('Registrando...');

            loginService.auth.$createUser(email, password).then(function() {
                helperService.hide();
                helperService.notify("Usuario creado");
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
                        helperService.notify('Email incorrecto');
                    } else if (error.code == 'EMAIL_TAKEN') {
                        helperService.notify('Email existente. Intente otro');
                    } else {
                        helperService.notify('Oops algo anda mal. Favor llamar a Chino');
                    }
            });
        }
    }
]);

MapApp.controller('LeftMenuCtrl', ['$scope', 'loginService', 'geoLocationService', function($scope, loginService, geoLocationService) {
    //$scope.authData = $rootScope.authData;
    $scope.uSession = loginService;
    console.log("in LeftMenuCtrl... authData: ", $scope.uSession.authData);
    $scope.logout = function(){
		if(geoLocationService.isOn) geoLocationService.stop({byLogout: true	});
        loginService.logout();
    };
}]);

/**
 * A google map / GPS controller.
 */
MapApp.controller('GpsCtrl', ['$scope', '$ionicModal', '$compile', 'leafletData', 'geoLocationService', 'displayPathService', 'leafletData', 'leafletEvents', 'loginService', 
	function($scope, $ionicModal, $compile, leafletData, geoLocationService, displayPathService, leafletData, leafletEvents, loginService) {
	
    
		leafletData.getMap().then(function(map) {
       var lc = L.control.locate({
            position: 'topleft',  // set the location of the control
            drawCircle: true,  // controls whether a circle is drawn that shows the uncertainty about the location
		    keepCurrentZoomLevel: true,
            follow: true,  // follow the user's location
            remainActive: false, // if true locate control remains active on click even if the user's location is in view.
            icon: 'icon ion-android-locate',  // class for icon, fa-location-arrow or fa-map-marker
            showPopup: false, // display a popup when the user click on the inner marker
            locateOptions: {enableHighAccuracy: true,
                maximumAge: 60000,
                timeout: 15000
            }  // define location options e.g enableHighAccuracy: true or maxZoom: 10
        }).addTo(map);
        
        map.on('dragstart', lc._stopFollowing, lc);
    });
        
    $scope.gls = geoLocationService;
    $scope.uS = loginService;
		
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
            },
			carto_light: {
                    name: 'CartoDB-Light',
                    url: 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                    type: 'xyz'
            },
			carto_dark: {
                    name: 'CartoDB-Dark',
                    url: 'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
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
		
	$scope.events = {
		map: {
            enable: ['zoomstart', 'drag', 'click', 'mousemove', 'popupopen'],
            logic: 'emit'
        },
        markers: {
            enable: leafletEvents.getAvailableMarkerEvents()
        }
	};
    
	$scope.$on('leafletDirectiveMarker.click', function(event, args){
		console.log("gls.markers: ", $scope.gls.markers);
		console.log("clicked arg: ", args);
		$scope.clickedMarker = $scope.gls.liveLocsData[args.markerName];
		var $tempContainer = $(args.leafletEvent.target._popup._container);
		console.log("tempContainer: ", $tempContainer);
		var $container = $(args.leafletEvent.target._popup._container).find('.leaflet-popup-content'); 
		$container.empty();
		var html = "<div>"+args.leafletEvent.target._popup._content + "</div>", 
		  linkFunction = $compile(angular.element(html)),             
		  linkedDOM = linkFunction($scope); 
		$container.append(linkedDOM);
	});
		
	$scope.addLike = function(){
		console.log("hi!", $scope.clickedMarker);
		$scope.clickedMarker.likes++;
		$scope.clickedMarker.liked[$scope.uS.authData.uid] = true;
		$scope.gls.liveLocsData.$save();
		
		
	
	};
    
    
    var updateMarkers = function(){
    	console.log("updating markers");
//    	$scope.markers = geoLocationService.markers;
//    	$scope.$apply();
    };


    var updateLine = function(){
    	console.log("updating line");
    	$scope.paths.p1.latlngs = geoLocationService.latLngs;
    };


    var updateLocation = function(){
    	console.log("updating");
    	//alert("yey!");
    	$scope.currentPos = geoLocationService.currentPosition;
    	//$scope.moveCenter($scope.currentPos);

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
	      geoLocationService.stop($scope.message);
          $scope.paths.p1.latlngs = [];
          $scope.submitModal.hide();
	    }
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