MapApp.factory('displayPathService', function ($firebase, $rootScope, fbURL, helperService, leafletData) {

    var s = {};
    var fb = new Firebase(fbURL);
	var map = {};
	leafletData.getMap().then(function(m) {
      		map = m;
		//	var polyline = L.polyline([{lat:1, lng:1},{lat:90, lng:90}], {color: 'red'}).addTo(map);
			
        });
	
	s.paths = {
            userPath: {
                color: '#008000',
                weight: 4,
                latlngs: []
            }
			
        };
	
    s.searchPath = function(id){
		console.log("starting searchPath function:");
        fb.child('cleanRoutes').child(id).child('geometry').once("value", function(data){
			console.log('searchpath data from fb: ',data.val());
			var data = data.val();
			s.paths[id] = {weight: 3,
						   latlngs : []};
			
			//for postgis
			var asText = '';
			
			for (var key in data) {
			//	console.log("attaching: ", data[key]);
				
					s.paths[id].latlngs.push(data[key]);
				asText = asText + 'INSERT INTO test ' + data[key].lng + ' ' + data[key].lat
			}
			leafletData.getMap().then(function(m) {
			var bounds = L.polyline(s.paths[id].latlngs, {color: 'red'}).getBounds();
				m.fitBounds(bounds);
			});
			
			console.log(polyline);
		});
        
           
    };
	
	s.searchAllUserRoutes = function(){
		var data = {};
		loadJSON(function(response){
			data = JSON.parse(response);
			console.log(data);
			for(var route in data) {
				var i = 0
				for(ins in data[route]){
					s.paths[route+i] = {weight: 3,
										message: route+' '+ins,
										latlngs :[]};
					var j = 0;
					for(key in data[route][ins]['geometry']){
						if(j%10 == 0) s.paths[route+i].latlngs.push(data[route][ins].geometry[key]);
						j++;
					}
					i++;
				}
			}
		});
		console.log(s.paths);
	};
  //  s.searchAllUserRoutes();
	//s.searchPath("CB08");
//	s.searchPath("CB08");
	
	function loadJSON(callback) {   

		var xobj = new XMLHttpRequest();
			xobj.overrideMimeType("application/json");
		xobj.open('GET', 'userData.json', true); // Replace 'my_data' with the path to your file
		xobj.onreadystatechange = function () {
			  if (xobj.readyState == 4 && xobj.status == "200") {
				// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
				callback(xobj.responseText);
			  }
		};
		xobj.send(null);  
	 }
	
    return s;

});