////////////////////////////////////////////////////////////
function Utils() {
    this.useColor = function(text, color) {
        return color ? "<font color=\""+color+"\">"+text+"</font>" : text;
    } 
    
    this.add = function(l, x) { l[l.length] = x; }

    this.keepCtrlInView = function(ctrl, margin) {
        y = ctrl.offsetTop;
        document.getElementById("listings").scrollTop = y - document.getElementById("listings").clientHeight/2;
    }
}

////////////////////////////////////////////////////////////

function Location(node) {
    this.toString = function() { return this.description + ", " + this.latlng; }
    this.exists = function() { return this.latlng != null; }
    
    // Constructor
    if(!node) {
        return;
    }
    this.description = node.getAttribute("description");
    this.latlng = new GLatLng(parseFloat(node.getAttribute("lat")),
                              parseFloat(node.getAttribute("lng")));
}

////////////////////////////////////////////////////////////

function Listing(node, maxPrice) {
    
    this.createMarker = function(point, number, totalPrice, maxPrice, myHtml) {
        if(!this.location.exists()) 
            return null;
        
        // Hack to put it in the range I'm interested in.
        var offset = 500;
        maxPrice = 2200;
        var priceRatio = (totalPrice * 1.0 - offset) / (maxPrice - offset);

        rgb = "AACCFF";
        if (priceRatio > 0.5)
            rgb = "90B0E0";
        if (priceRatio > 0.6)
            rgb = "7799CC";
        if (priceRatio > 0.7)
            rgb = "6080B0";
        if (priceRatio > 0.8)
            rgb = "446699";
        if (priceRatio > 0.9)
            rgb = "335588";

        var coloredIcon = new GIcon(G_DEFAULT_ICON);
        coloredIcon.image = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=|" + rgb + "|000";
        coloredIcon.shadow = "http://chart.apis.google.com/chart?chst=d_map_pin_shadow";

        coloredIcon.iconSize = new GSize(18,30);
        //coloredIcon.shadowSize = new GSize(22, 20);
        //coloredIcon.iconAnchor = new GPoint(6, 20);
        //coloredIcon.infoWindowAnchor = new GPoint(5, 1);
        // Set up our GMarkerOptions object literal
        markerOptions = { icon:coloredIcon };

        var marker = new GMarker(point, markerOptions);
        marker.value = number;
        this.myHtml = myHtml;

        return marker;
    }
    
    this.showMarker = function(map) {
        if (this.marker && !this.marker.visible) {
            map.addOverlay(this.marker);
            this.marker.visible = true;
        }
    }

    this.hideMarker = function(map) {
        if(this.marker) {
            map.removeOverlay(this.marker);
            this.marker.visible = false;
        }
    }

    this.connect = function() {
        var html = this.myHtml;
        var latlng = this.location.latlng;
        var currow = this.row;
        var curmarker = this.marker;
        
        // This should remove the event listeners, but for whatever reason, it does not.
        //if (this.clickListner != null)
        //    GEvent.removeListner(this.clickListner);

        this.clickListner = GEvent.addListener(this.marker, "click", function() {
            map.openInfoWindowHtml(latlng, html);
            if (selectedRow != null)
                selectedRow.style.backgroundColor = "FFFFFF";
            selectedRow = currow;
            if (selectedRow != null) {
               selectedRow.style.backgroundColor = "FFFFBB";
               utils.keepCtrlInView(selectedRow, 0);
            }
        });

        currow.onclick = function() {
            if (selectedRow != null)
                selectedRow.style.backgroundColor = "FFFFFF";
            selectedRow = currow;
            if (selectedRow != null) {
               selectedRow.style.backgroundColor = "FFFFBB";
               //utils.keepCtrlInView(selectedRow, 0);
            }
            curmarker.openInfoWindowHtml(html);
        };
    }
        
    this.toString = function() {
        return this.description + ", [" + this.location + "]";
    }
    
    this.totalPriceAndNumBedRooms = function() {
        return this.neighborhood + ", $" + this.totalPrice + "" +
            (this.numBedrooms ? ",  " + this.numBedrooms + "br ($" + this.pricePerBedroom() + "/br)" : "");
    }
    
    this.shortDescription = function() {
        var s = this.postingDate + ", " + this.totalPriceAndNumBedRooms() + ": " + this.description;
        return s;
    }
    
    this.price = function() {
        return parseInt(this.totalPrice);
    }
    
    this.pricePerBedroom = function() {
        return parseInt(this.totalPrice / (this.numBedrooms || 1));
    }
    
    this.matchesCriteria = function(criteria) { 
        if (!criteria) 
            return true;
        if (criteria.priceRangeLower && this.price() < criteria.priceRangeLower) 
            return false; 
        if (criteria.priceRangeUpper && this.price() > criteria.priceRangeUpper) 
            return false; 
        if (criteria.numBedrooms && !criteria.numBedrooms[this.numBedrooms || 0]) 
            return false; 
        if (!criteria.closeToLandmark(this.location.latlng)) 
            return false;
	if (this.pets != criteria.petsOK) 
	    return false;
        return true;
    }

    // Constructor
    if(!node) {
        this.description = "*empty*";
        return;
    }
    this.location = new Location(node.getElementsByTagName("location")[0]);
    this.postingDate = node.getAttribute("postingDate");
    this.url = node.getAttribute("url");
    this.totalPrice = node.getAttribute("totalPrice");
    this.numBedrooms = node.getAttribute("numBedrooms");
    this.description = node.getAttribute("description");
    this.id = node.getAttribute("id");
    this.pets = node.getAttribute("pets");
    if (!this.pets)
        this.pets = "no";
    this.show = true;
    this.neighborhood = node.getAttribute("neighborhood");
    this.marker = this.createMarker(this.location.latlng, this.id, this.totalPrice, maxPrice,
                                    "<a href = '" + this.url + "'>Craigslist ad</a><br/ >" 
                                    + this.totalPriceAndNumBedRooms() + "<br /><br />"
                                    + this.description + "<br/ ><br />Pets: " + this.pets + "<br />Posted on: " + this.postingDate + "<br /><br />");
    this.clickListner = null;
    this.row = null;
}
    
////////////////////////////////////////////////////////////

function DB(node) {
    this.refresh = function(criteria) {
        var updated = false;
        for(var i = 0; i < this.listings.length; i++) {
            var listing = this.listings[i];
            var oldShow = listing.show;
            if(listing.matchesCriteria(criteria))
                listing.show = true;
            else
                listing.show = false;
            if (oldShow != listing.show)
                updated = true;
        }
        return updated;
    }
    
    // Constructor
    if(!node) {
        toInfo("DB: null node");
        return;
    }
    
    var lastUpdated = node.getAttribute("lastUpdated");
    var listedMaxPrice = parseFloat(node.getAttribute("maxPrice"));
    this.maxPrice = 0;
    this.minPrice = parseFloat(node.getAttribute("maxPrice"));
    toInfo("Listings last updated: " + lastUpdated + " Pacific");
    
    this.listings = new Array();
    var listingsNodes = node.getElementsByTagName("listings");
    for(var j = 0; j < listingsNodes.length; j++) {
        var listingNodes = listingsNodes[j].getElementsByTagName("listing");
        for(var i = 0; i < listingNodes.length; i++) {
            var listing = new Listing(listingNodes[i], listedMaxPrice);
            utils.add(this.listings, listing);
            if (parseFloat(listing.totalPrice) < this.minPrice)
                this.minPrice = parseFloat(listing.totalPrice);
            if (parseFloat(listing.totalPrice) > this.maxPrice)
                this.maxPrice = parseFloat(listing.totalPrice);
        }
    }

    // Finally sort all entries by date
    this.listings.sort(function(a, b) {
        if (a==b)
            return 0;
        if ((a.postingDate == null) && (b.postingDate == null))
            return 0;
        if (a.postingDate == null)
            return 1;
        if (b.postingDate == null)
            return -1;
        return a.postingDate < b.postingDate ? 1 : -1;
    });
}

////////////////////////////////////////////////////////////
function Criteria() {
    this.update = function() {
        var priceText = document.getElementsByName("price")[0].value;
        var m = priceText.match(/\s*(\d+)\s*-\s*(\d+)\s*/);
        if(!isEmpty(m)) {
            this.priceRangeLower = parseInt(m[1]);
            this.priceRangeUpper = parseInt(m[2]);
        } else {
            this.priceRangeLower = null;
            this.priceRangeUpper = null;
        }

        //var bedroomPriceText = document.getElementsByName("bedroom-price")[0].value;
       
        this.petsOK = (document.getElementsByName("pets")[0].checked) ? "no" : "yes";

        var numBedroomsText = document.getElementsByName("num-bedrooms")[0].value;
        var a = numBedroomsText;
        if(!isEmpty(a)) {
            a = a.split(/\s+/);
            this.numBedrooms = new Object();
            for(var i = 0; i < a.length; i++) {
                var x = a[i];
                if(m = x.match(/^(\d+)\+/)) {
                    x = parseInt(m[1]);
                    for(var y = x; y < 10; y++) 
                        this.numBedrooms[parseInt(y)] = true;
                }
                else
                    this.numBedrooms[parseInt(x)] = true;
            }
        } else {
            this.numBedrooms = null;
        }
        
        var distanceText = document.getElementsByName("distance")[0].value;
        this.distToMark = isEmpty(distanceText) ? null : parseFloat(distanceText);
    }
    
    this.closeToLandmark = function(point) {
        if (!point || !this.distToMark)
            return true;
        var x = landmark.getLatLng().distanceFrom(point) / 1609.344; // meters -> miles
        return x <= this.distToMark;
    }
}

////////////////////////////////////////////////////////////
function downloadXml(file, handler) {
    try {
        GDownloadUrl(file, function(data, responseCode) {
            var xml = GXml.parse(data);
            var node = xml.documentElement;
            handler(node);
        });
    } catch(e) {
        toInfo("Error downloading \""+file+"\": " + e);
    }
}

function downloadDB() {
    downloadXml(file, function(node) {
        db = new DB(node);
        initializeDisplay();
    });
}
    
////////////////////////////////////////////////////////////
function toDiv(text, divId) {
    var div = document.getElementById(divId);
    div.innerHTML += text + "<br>";
}
function toInfo(text) {
    toDiv(text, "info-box");
}
function toListingsInfo(text) {
    toDiv(text, "listings-info");
}
function toDebug(text) {
    toDiv(text, "debug");
}
function addRow(text, table) {
    table.innerHTML += "<tr><td>" + text + "</td></tr>";
}

////////////////////////////////////////////////////////////
function clearDiv(divId) {
    var div = document.getElementById(divId);
    div.innerHTML = "";
}
function clearListings() {
    clearDiv("listings");
}
function clearListingsInfo() {
    clearDiv("listings-info");
}
function clearDebug() {
    clearDiv("debug");    
}
    
////////////////////////////////////////////////////////////
function isEmpty(s) { 
    return s == null || s == ""; 
}

function initialize() {
    if (!GBrowserIsCompatible())
        return;

    // Set up the map
    map = new GMap2(document.getElementById("map_canvas"));

    map.setCenter(center, 13);
    map.setUIToDefault();
    map.setMapType(G_NORMAL_MAP);
    //map.setMapType(G_PHYSICAL_MAP);

    // Set up the landmark
    var coloredIcon = new GIcon(G_DEFAULT_ICON);
    coloredIcon.image = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=|FF0000|000";
    coloredIcon.shadow = "http://chart.apis.google.com/chart?chst=d_map_pin_shadow";
    coloredIcon.iconSize = new GSize(18,30);
    landmark = new GMarker(center, {draggable: true, icon: coloredIcon});
    map.addOverlay(landmark);
    GEvent.addListener(landmark, "dragstart", function() { map.closeInfoWindow(); showListings(); });
    GEvent.addListener(landmark, "drag", function() {search();});
    GEvent.addListener(landmark, "dragend", function() {search();});
    GEvent.addListener(map, "click", function() { 
        if (selectedRow != null)
            selectedRow.style.backgroundColor = "FFFFFF";
        selectedRow = null;
    });

    // Download the database and set up the markers
    criteria = new Criteria();
    criteria.update();
    downloadDB();
}
    
function initializeDisplay() {
    toInfo(db.listings.length + " rentals")
    toInfo("Min price: $" + db.minPrice + ",  Max price: $" + db.maxPrice + "<br /><br />")
    //document.getElementsByName("price")[0].value = db.minPrice + " - " + db.maxPrice;

    //toDebug("To do:<br /> add price per bedroom search<br />"); // TODO: delete me.    

    db.refresh(criteria);
    showMarkers();
    showLandmarkCircle();
}

function showListings() {
    clearListings();
    var listingsTable = document.createElement("table");
    for (var i = 0; i < db.listings.length; i++) {
        if (db.listings[i].show) {
            var newRow = listingsTable.insertRow(-1);
            newRow.insertCell(-1).innerHTML = db.listings[i].shortDescription();
            db.listings[i].row = newRow;
            db.listings[i].connect();
        } else
            db.listings[i].row = null;
   }
   document.getElementById("listings").appendChild(listingsTable);
}

function showMarkers() {
    var numDisplayed = 0;
    for (var i = 0; i < db.listings.length; i++) {
        if (db.listings[i].show) {
            db.listings[i].showMarker(map)
            numDisplayed++;
        } else
            db.listings[i].hideMarker(map)
   }
   showListings();

   clearListingsInfo();   
   toListingsInfo(numDisplayed + " rentals match your criteria");
}

function showLandmarkCircle() {
    // Remove old circle
    if (circle)
	map.removeOverlay(circle);

    if (criteria.distToMark && criteria.distToMark > 0 && criteria.distToMark < 3000) {
        drawCircle(criteria.distToMark);
    }
}

function drawCircle(circleRadius){
    // This function from: http://maps.forum.nu/gm_sensitive_circle2.html

    // Generate points for the new circle
    var center = landmark.getLatLng();
    var circlePoints = Array();
    var d = circleRadius/3963.189;	// radians        
    with (Math) {
	var lat1 = (PI/180)* center.lat(); // radians
	var lng1 = (PI/180)* center.lng(); // radians
        
	for (var a = 0 ; a <= 360 ; a = a + 0.5 ) {
	    var tc = (PI/180)*a;
	    var y = asin(sin(lat1)*cos(d)+cos(lat1)*sin(d)*cos(tc));
	    var dlng = atan2(sin(tc)*sin(d)*cos(lat1),cos(d)-sin(lat1)*sin(y));
	    var x = ((lng1-dlng+PI) % (2*PI)) - PI ; // MOD function
	    var point = new GLatLng(parseFloat(y*(180/PI)),parseFloat(x*(180/PI)));
	    circlePoints.push(point);
	}
    }

    // Create and display the circle
    if (d < 1.5678565720686044)
	circle = new GPolygon(circlePoints, '#335588', 1, 1, '#000000', 0.05);	
    else
	circle = new GPolygon(circlePoints, '#335588', 1, 1);	
    map.addOverlay(circle); 

    GEvent.addListener(circle, "click", function() {
        if (selectedRow != null)
            selectedRow.style.backgroundColor = "FFFFFF";
        selectedRow = null;
        map.closeInfoWindow(); 
    });
}

function search() {
    criteria.update();
    if (db.refresh(criteria)) {
        map.closeInfoWindow();
        showMarkers();
    }
    showLandmarkCircle();
    return false;
}

var db, map, criteria, landmark, circle = null, selectedRow = null;
var utils = new Utils();


