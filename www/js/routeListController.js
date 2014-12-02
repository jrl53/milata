MapApp.controller('GpsCtrl.routeListController', ['$scope', 'fbURL', function($scope, fbURL) {
   $ionicModal.fromTemplateUrl('templates/routeModal.html', function($ionicModal) {
        $scope.routeModal = $ionicModal;
    }, {
        // Use our scope for the scope of the modal to keep it simple
        scope: $scope,
        // The animation we want to use for the modal entrance
        animation: 'slide-in-up'
    });
}]);