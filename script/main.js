var debug = window.location.href.endsWith("debug");
var points = [];
var origin;
var iconsize;
var iconanchor;
var picture_folder_url = "pictures/";
COLUMN_IDX_EXCLUDE = 0;
COLUMN_IDX_SOURCE = 1;
COLUMN_IDX_ICON = 2;
COLUMN_IDX_IMAGE = 3;
COLUMN_IDX_COMMENTS = 4;
COLUMN_IDX_LAT = 5;
COLUMN_IDX_LNG = 6;
COLUMN_IDX_DATE = 7;
COLUMN_IDX_TIMEZONE = 8;

function GetUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split("&");
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split("=");
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
}

function keydown(event) {
	closeIntro();
	if (event.keyCode == 39) { // right arrow
		popupNextPoint();
	} else if (event.keyCode == 37) { // left arrow
		popupPrevPoint();
	} else if (event.keyCode == 38) { // up arrow
		changeZoom(1);
	} else if (event.keyCode == 40) { // down arrow
		changeZoom(-1);
	} else if (event.keyCode == 27) { // esc
		closePopup();
	}
}

mapReady = false;
vizReady = false;
google.load("visualization", "1", {packages: ["corechart"]});
google.setOnLoadCallback(vizLoaded);
function mapLoaded() {
	mapReady = true;
	drawMapIfReady();
}
function vizLoaded() {
	vizReady = true;
	drawMapIfReady();
}
function drawMapIfReady() {
	if (vizReady && mapReady) {
		drawMap();
	}
}
function drawMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		zoom: 4,
		center: {lat: 47, lng: -91},
		mapTypeId: google.maps.MapTypeId.SATELLITE,
		keyboardShortcuts: false
	});

	var query = new google.visualization.Query("https://docs.google.com/spreadsheets/d/" + GetUrlParameter("data") + "/gviz/tq?sheet=Metadata&tq=select%20A,B");
	query.send(receiveMetaData);
}
function changeZoom(delta) {
	map.setZoom(map.getZoom() + delta);
}

function receiveMetaData(response) {
	datatable = response.getDataTable();
	datatableNumberOfRows = datatable.getNumberOfRows();
	for (var i = 0; i < datatableNumberOfRows; i += 1) {
		key = datatable.getValue(i, 0);
		if (key == "Title") {
			$(document).attr("title", datatable.getValue(i, 1));
		} else if (key == "Intro") {
			$("#userintro").html(datatable.getValue(i, 1));
		}
	}
	var query = new google.visualization.Query("https://docs.google.com/spreadsheets/d/" + GetUrlParameter("data") + "/gviz/tq?sheet=Actual&tq=select%20A,B,C,D,E,F,G,H,I");
	query.send(receiveData);
}
function receiveData(response) {
	datatable = response.getDataTable();
	datatableNumberOfRows = datatable.getNumberOfRows();
	
	origin = new google.maps.Point(0, 0);
	iconsize = new google.maps.Size(20, 20);
	iconanchor = new google.maps.Point(10, 10);

	var exclude;

	for (var i = 0; i < datatableNumberOfRows; i += 1) {

		exclude = datatable.getValue(i, COLUMN_IDX_EXCLUDE);

	if (exclude && !exclude.startsWith("Path")) continue;

		timezone = datatable.getValue(i, COLUMN_IDX_TIMEZONE);
		// TODO: More sophisticated date arithmetic
		timeoffset = timezone == "ADT" ? -3 :
			timezone == "EDT" ? -4 :
			timezone == "CDT" ? -5 :
			timezone == "CST" || timezone == "MDT" ? -6 :
			timezone == "PDT" ? -7 : 0;

		icon = datatable.getValue(i, COLUMN_IDX_ICON);
		if (debug && !icon) {
			icon = "3x3black.png";
		}

		point = {
			data_index : i + 2,
			exclude : exclude,
			source : datatable.getValue(i, COLUMN_IDX_SOURCE),
			icon : icon,
			image : datatable.getValue(i, COLUMN_IDX_IMAGE),
			datetime : moment(datatable.getValue(i, COLUMN_IDX_DATE)).add(timeoffset, "hours"),
			timezone : timezone,
			lat : datatable.getValue(i, COLUMN_IDX_LAT),
			lng : datatable.getValue(i, COLUMN_IDX_LNG),
			comments : datatable.getValue(i, COLUMN_IDX_COMMENTS)
		};
		points.push(point);
	}
	buildRoute();
}

function addPointToRoute(point_index, polyline, map) {
	point = points[point_index]
	
	if (point.exclude == "Path Start") {
		polyline = [];
	}
	
	if (polyline && point.exclude != "Path") {
		polyline.push({lat : point.lat, lng: point.lng});
	}

	if (point.icon) {
		iconobject = {
				url : "icon/" + point.icon,
				size : iconsize,
				anchor : iconanchor,
				origin : origin,
				zIndex: google.maps.Marker.MAX_ZINDEX + 1
			};

		var marker = new google.maps.Marker({
			position : { lat : point.lat, lng : point.lng },
			icon : iconobject,
			map: map
		});
		marker.setOpacity(0.9);
		marker.addListener("click", getPopupPoint(point_index));
	}

	if (point.exclude == "Path Finish") {
		var cyclepath = new google.maps.Polyline({
			path: polyline,
			geodesic: true,
			strokeColor: "#ff7700",
			strokeOpacity: 0.7,
			strokeWeight: 2
		});
		cyclepath.setMap(map);
	}

	return polyline;
}
function buildRoute() {
	var polyline = null;
	var max_lat = -90;
	var min_lat = 90;
	var max_lng = -180;
	var min_lng = 180;
	var again = true;
	for (var i = 0; i < points.length; i += 1) {
		point = points[i];
		if (point.lng && point.lng > max_lng) {
			max_lng = point.lng;
		}
		if (point.lng && point.lng < min_lng) {
			min_lng = point.lng;
		}
		if (point.lat && point.lat > max_lat) {
			max_lat = point.lat;
		}
		if (point.lat && point.lat < min_lat) {
			min_lat = point.lat;
		}
		polyline = addPointToRoute(i, polyline, map);
		
		if (again && !max_lng) { alert(i); alert(point.lng); again = false; }
	}
	lat_diff = max_lat - min_lat;
	lng_diff = max_lng - min_lng;
	max_diff = lat_diff > lng_diff ? lat_diff : lng_diff;
	map.panTo(new google.maps.LatLng((min_lat + max_lat)/2, (min_lng + max_lng)/2));
	if (max_diff > 50) {
		map.setZoom(4);
	} else if (max_diff > 15) {
		map.setZoom(5);
	} else if (max_diff > 5) {
		map.setZoom(6);
	} else if (max_diff > 2) {
		map.setZoom(7);
	} else {
		map.setZoom(8);
	}
	$("#loading input#dotdotdot").toggle("fade", function() {
		$("#loading input#start").toggle("fade");
	});

	document.onkeydown=keydown;
}

function closeIntro() {
	loading = $("#loading");
	if (loading.is(":visible")) {
		$("#loading").hide("fade");
		popupNextPoint();
	}
}

var preloadimages = [];
function preload() {
	for (var i = 0; i < arguments.length; i++) {
		preloadimages[i] = new Image();
		preloadimages[i].src = preload.arguments[i];
	}
}
function popupPoint(point_index, other) {
	point = points[point_index];
	
	var location;
	var datetime;
	location = (point.lat).toFixed(5) + "&deg; N, " + (-point.lng).toFixed(5) + "&deg; W";
	if (point.datetime.hours() == 0 && point.datetime.minutes() == 0 && point.datetime.seconds() == 0) {
		previous = moment(point.datetime).add(-1, "days");
		datetime = previous.format("MMMM D, YYYY") + " at day&apos;s end";
	} else {
		datetime = point.datetime.format("MMMM D, YYYY \\a\\t h:mm a") + " " + point.timezone
	}

	if (debug) {
		location += " (#" + point.data_index.toString() + ")";
	}
	$("#location").html(location);
	$("#datetime").html(datetime);
	var content = "";
	if (point.comments) {
		var comments = point.comments.split("\n");
		for (var i = 0; i < comments.length; i += 1) {
			var comment = comments[i].trim();
			if (comment) {
				if (comment[0] != "<") {
					comment = "<p>" + comment + "</p>";
				}
				content += comment;
			}
		}
	}
	$("#comments").html(content);
	$("#picture").hide();
	if(point.image) {
		$("#picture").attr("src", picture_folder_url + point.image);
		$("#picture").show();
	} else {
		$("#picture").attr("src", "");
	}

	$("#popup").attr("point_index", point_index);
	$("#popup").show("fade");
	$("#map").addClass("open");
	google.maps.event.trigger(map, "resize");
	map.panTo(new google.maps.LatLng(point.lat, point.lng));

	for (image_index = other(point_index); image_index >= 0 && image_index < points.length; image_index = other(image_index)) {
		checkpoint = points[point_index];
		if (checkpoint.image) {
			preload(picture_folder_url + checkpoint.image);
			break;
		}
	}
}
function closePopup() {
	centre = map.getCenter();
	$("#popup").hide("fade");
	$("#map").removeClass("open");
	google.maps.event.trigger(map, "resize");
	map.panTo(centre);
}
function popupNextPoint() {
	popupAnotherPoint(function(i) { return i === null ? 0 : i + 1; });
}
function popupPrevPoint() {
	popupAnotherPoint(function(i) { return i === null ? points.length - 1 : i - 1; } );
}
function popupAnotherPoint(other) {
	point_index = $("#popup").attr("point_index")
	if (point_index) {
		point_index = parseInt(point_index);
	} else {
		point_index = null;
	}
	another_point = null;
	relocationpoints = [];

	for (point_index = other(point_index); !another_point && point_index >= 0 && point_index < points.length; point_index = other(point_index)) {
		checkpoint = points[point_index];
		if (checkpoint.icon) {
			another_point = checkpoint;
			popupPoint(point_index, other);
		}
	}
	if (!another_point) {
		closePopup();
		$("#popup").attr("point_index", "");
	}
}
function getPopupPoint(point_index) {
	return function()
	{
		popupPoint(point_index, function(i) { return i === null ? 0 : i + 1; });
	};
}
