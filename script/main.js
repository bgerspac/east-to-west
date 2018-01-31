var debug = window.location.href.endsWith('debug');
var points = [];
var origin;
var iconsize;
var iconanchor;

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
function changeZoom(delta) {
	map.setZoom(map.getZoom() + delta);
}

function popupPoint(point_index) {
	point = points[point_index];
	
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
	$('#location').html(location);
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
		$('#picture').attr('src', 'pictures/' + point.image);
	} else {
		$('#picture').hide();
		$('#picture').attr('src', '');
	}

	$('#popup').attr('point_index', point_index);
	$('#popup').show('fade');
	$('#map').addClass('open');
	google.maps.event.trigger(map, 'resize');
	map.panTo(new google.maps.LatLng(point.lat, point.lng));
}
function closePopup() {
	centre = map.getCenter();
	$('#popup').hide('fade');
	$('#map').removeClass('open');
	google.maps.event.trigger(map, 'resize');
	map.panTo(centre);
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
		if (checkpoint.icon) {
			another_point = checkpoint;
			popupPoint(point_index);
		}
	}
	if (!another_point) {
		closePopup();
		$('#popup').attr('point_index', '');
	}
}
function getPopupPoint(point_index) {
	return function()
	{
		popupPoint(point_index);
	};
}


function displayPoint(point_index, polyline, map) {

	point = points[point_index]
	
	if (point.exclude == 'Path Start') {
		polyline = [];
	}
	
	if (polyline && point.exclude != 'Path') {
		polyline.push({lat : point.lat, lng: point.lng});
	}

	if (point.icon) {
		iconobject = {
				url : 'icon/' + point.icon,
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
	iconsize = new google.maps.Size(20, 20);
	iconanchor = new google.maps.Point(10, 10);

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
