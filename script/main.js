var debug = window.location.href.endsWith('debug');
function keydown(event) {
	if (event.keyCode == 39) {
		popupNextPoint();
	} else if (event.keyCode == 37) {
		popupPrevPoint();
	} else if (event.keyCode == 38) {
		changeZoom(1);
	} else if (event.keyCode == 40) {
		changeZoom(-1);
	} else if (event.keyCode == 27) {
		closePopup();
	}
}
var future_lat;
var future_lng;
var points = [];
function recentre(lat, lng) {
	map.panTo(new google.maps.LatLng(lat, lng));
}
function relocateslow(relocationpoints, i, after) {
	if (i < relocationpoints.length) {
		window.setTimeout(function() { recentre(relocationpoints[i].lat, relocationpoints[i].lng) }, 100*i);
	} else {
		window.setTimeout(after, 100*relocationpoints.length);
	}
}
function closePopup() {
	centre = map.getCenter();
	$('#popup').hide('fade');
	$('#map').removeClass('open');
	google.maps.event.trigger(map, 'resize');
	map.panTo(centre);
}
function changeZoom(delta) {
	map.setZoom(map.getZoom() + delta);
}
function popupNextPoint() {
	popupAnotherPoint(function(i) { return i === null ? 0 : i + 1; });
}
function popupPrevPoint() {
	popupAnotherPoint(function(i) { return i === null ? points.length - 1 : i - 1; } );
}
function popupAnotherPoint(other) {
	point_index = $('#popup').attr('point_index')
	if (point_index) {
		point_index = parseInt(point_index);
	} else {
		point_index = null;
	}
	another_point = null;
	relocationpoints = [];

	for (point_index = other(point_index); !another_point && point_index >= 0 && point_index < points.length; point_index = other(point_index)) {
		checkpoint = points[point_index];
		//relocationpoints.push(checkpoint);
		//recentre(checkpoint.lat, checkpoint.lng);
		if (checkpoint.icon) {
			another_point = checkpoint;
			popupPoint(point_index);
		}
	}
	if (!another_point) {
		closePopup();
		$('#popup').attr('point_index', '');
	}
	//relocateslow(relocationpoints, i, function() { popupPoint(i); });
}
function popupPoint(point_index) {
	point = points[point_index];
	//next_point = null;
	//while (!next_point && ++i < points.length) {
	//	checkpoint = points[i];
	//	recentre(checkpoint.lat, checkpoint.lng);
	//}
	//next_point = ((i + 1) < points.length) ? points[i + 1] : null;

	//next = $('#next');
	//if (!next_point) {
	//	$('#next').hide();
	//} else {
	//	$('#next').show();
	//}
	
	var location;
	var datetime;
	location = (point.lat).toFixed(5) + '&deg; N, ' + (-point.lng).toFixed(5) + '&deg; W';
	if (point.datetime.hours() == 0 && point.datetime.minutes() == 0 && point.datetime.seconds() == 0) {
		previous = moment(point.datetime).add(-1, 'days');
		datetime = previous.format('MMMM D, YYYY') + ' at day&apos;s end';
	} else {
		datetime = point.datetime.format('MMMM D, YYYY \\a\\t h:mm a') + ' ' + point.timezone
	}

	if (debug) {
		location += ' (#' + point.data_index.toString() + ')';
	}
	$('#location').html(location);// + ' - ' + (point.data_index).toString());
	$('#datetime').html(datetime);
	var content = '';
	if (point.comments) {
		var comments = point.comments.split('\n');
		for (var i = 0; i < comments.length; i += 1) {
			if (comments[i].trim()) {
				content += '<p>' + comments[i].trim() + '</p>';
			}
		}
	}
	$('#comments').html(content);
	if(point.image) {
		$('#picture').show();
		$('#picture').attr('src', 'assets/pictures/' + point.image);
	} else {
		$('#picture').hide();
		$('#picture').attr('src', '');
	}

	$('#popup').attr('point_index', point_index);
	$('#popup').show('fade');
	$('#map').addClass('open');
	google.maps.event.trigger(map, 'resize');
	recentre(point.lat, point.lng);
	//setTimeout(function() { recentre(point.lat, point.lng); }, 100);
}
function getPopupPoint(point_index) {
	return function()
	{
		popupPoint(point_index);
	};
}

var origin;
var size3x3;
var size5x5;
var size12x12;
var anchor3x3;
var anchor5x5;
var anchor12x12;

function displayPoint(point_index, polyline, map) {

	point = points[point_index]
	
	if (point.exclude == 'Path Start') {
		polyline = [];
	}
	
	if (polyline && point.exclude != 'Path') {
		polyline.push({lat : point.lat, lng: point.lng});
	}

	if (point.icon) {
		icon = point.icon.endsWith(".svg") || point.icon.endsWith(".png") ? point.icon :
			"3x3black.png";
	} else {
		icon = "3x3black.png";
	}

	if (point.icon) {
		iconsize = icon.endsWith(".svg") || icon.endsWith(".png") ? size12x12 : size5x5;
		iconanchor = icon.endsWith(".svg") || icon.endsWith(".png") ? anchor12x12 : anchor5x5;
		iconobject = {
				url : 'assets/icons/' + icon,
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
		marker.addListener('click', getPopupPoint(point_index));
	}

	if (point.exclude == 'Path Finish') {
		var cyclepath = new google.maps.Polyline({
			path: polyline,
			geodesic: true,
			strokeColor: '#ff7700',
			strokeOpacity: 0.7,
			strokeWeight: 2
		});
		cyclepath.setMap(map);
	}

	return polyline;
}

function displayPoints() {
	var polyline = null;
	for (var i = 0; i < points.length; i += 1) {
		//setTimeout(function() { $('div#loading').html('Loading ' + (i + 1) + ' of ' + points.length) }, 0);
		polyline = displayPoint(i, polyline, map);
	}
	$('input#start').attr('disabled', false);
	$('input#start').attr('value', 'Start');
	$('input#start').effect('bounce', 'slow');
}

function receiveData(response) {
	datatable = response.getDataTable();
	datatableNumberOfRows = datatable.getNumberOfRows();
	
	origin = new google.maps.Point(0, 0);
	size3x3 = new google.maps.Size(3, 3);
	size5x5 = new google.maps.Size(5, 5);
	size12x12 = new google.maps.Size(20, 20);
	anchor3x3 = new google.maps.Point(1, 1);
	anchor5x5 = new google.maps.Point(2, 2);
	anchor12x12 = new google.maps.Point(10, 10);
	

	var exclude;

	for (var i = 0; i < datatableNumberOfRows; i += 1) {

		exclude = datatable.getValue(i,0);

	if (exclude && !exclude.startsWith('Path')) continue;

		timezone = datatable.getValue(i,8);
		timeoffset = timezone == 'ADT' ? -3 :
			timezone == 'EDT' ? -4 :
			timezone == 'CDT' ? -5 :
			timezone == 'CSD' || timezone == 'MDT' ? -6 :
			timezone == 'PDT' ? -7 : 0;

		point = {
			data_index : i + 2,
			exclude : exclude,
			source : datatable.getValue(i,1),
			icon : datatable.getValue(i,2),
			image : datatable.getValue(i,3),
			datetime : moment(datatable.getValue(i,7)).add(timeoffset, 'hours'),
			timezone : timezone,
			lat : datatable.getValue(i,5),
			lng : datatable.getValue(i,6),
			comments : datatable.getValue(i,4)
		};
		points.push(point);
	}
	displayPoints();
}


function initMap() {
	google.charts.load('current', {packages: ['corechart']});

	google.setOnLoadCallback(drawMap);
}

function drawMap() {

	map = new google.maps.Map(document.getElementById('map'), {
		zoom: 4,
		center: {lat: 47, lng: -91},
		mapTypeId: google.maps.MapTypeId.SATELLITE,
		keyboardShortcuts: false
	});

	var query = new google.visualization.Query('https://docs.google.com/spreadsheets/d/1qSjDuGdj6l9aj-ghjLUjHrESR5E4NfUIVvnlb0PPmzE/gviz/tq?sheet=Actual&tq=select%20A,B,C,D,E,F,G,H,I');
	query.send(receiveData);
}