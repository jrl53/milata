MapApp.factory('displayPathService', function ($firebase, fbURL) {

    var service = {};
    
    service.searchPath = function(id){
        var allRoutesRef = new Firebase(fbURL).child('routes').child(id);
        var test = $firebase(allRoutesRef.orderByKey().limitToLast(2)).$asArray();
        test.$loaded().then(function(){
            console.log(test[0].geometry);
           
        });
        
        
        
    };
    
    return service;

});