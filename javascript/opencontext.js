/*
 * ------------------------------------------------------------------
	AJAX for using the Open Context API
 * ------------------------------------------------------------------
*/


function OpenContextAPI() {
	/* Object for runing searches + displaying results from Open Context */
	this.name = "opencontext"; //object name, used for DOM-ID prefixes and object labeling
	this.api_url = false;
	this.data = false;
	this.facets_dom_id = 'facets';
	
	/* This is for a Lealet Map, which displays geospatial data from the search */
	this.map_dom_id = 'map';
	map = L.map(this.map_dom_id);
	this.bounds = new L.LatLngBounds();
	var osmTiles = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	});
	var ESRISatelliteTiles = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		attribution: '&copy; <a href="http://services.arcgisonline.com/">ESRI.com</a> '
	});
	var baseMaps = {
		"ESRI-Satellite": ESRISatelliteTiles,
		"OpenStreetMap": osmTiles,
	};
	map._layersMaxZoom = 20;
	var layerControl = L.control.layers(baseMaps).addTo(map);
	map.addLayer(osmTiles);
	map.oc_layer = false;
	map.render_region_layer = function(data){
		// this can get much more elaborate to add style
		// and callouts for map layers, but it's a first stab
		if (map.oc_layer != false) {
			map.removeLayer(map.oc_layer);
		}
		var region_layer = L.geoJson(data);
		map.fitBounds(region_layer.getBounds());
		region_layer.addTo(map);
		map.oc_layer = region_layer;
	}
	this.map = map;
	this.get_data = function() {
		// calls the Open Context API to get data
		var url = this.api_url;
		if (url != false) {
			return $.ajax({
				type: "GET",
				url: url,
				dataType: "json",
				headers: {
					//added to get JSON data (content negotiation)
					Accept : "application/json; charset=utf-8"
				},
				context: this,
				success: this.get_dataDone, //do this when we get data w/o problems
				error: this.get_dataError //error message display
			});
		}
	}
	this.get_dataDone = function(data){
		// function to display results of a request for data
		this.data = data;
		console.log(data);
		// show facets + facet values
		this.show_facets();
		// now show the geojson data using the Leaflet Map
		this.map.render_region_layer(data);
	}
	this.show_facets = function(){
		var act_dom = this.get_facets_dom();
		if (act_dom != false) {
			var html = '';
			var data = this.data;
			if ('totalResults' in data) {
				// show the total number of records found
				html += '<h3>Open Context Records: <span class="badge">' + data['totalResults'] + '</span></h3>';
			}
			if ('oc-api:has-facets' in data) {
				// show some search facets
				for (var i = 0, length = data['oc-api:has-facets'].length; i < length; i++) {
					var facet = data['oc-api:has-facets'][i];
					var facet_html = '<div class="panel panel-default">'
					facet_html += '<div class="panel-body">';
					facet_html += '<h4>' + facet.label + '</h4>'
					//use another function to make facet search values
					facet_html += this.make_facet_values_html(facet);
					facet_html += '</div>';
					facet_html += '</div>';
					html += facet_html;
				}
			}
			act_dom.innerHTML = html;
		}
	}
	this.make_facet_values_html = function(facet){
		var value_list = [];
		var html_list = [];
		if ('oc-api:has-id-options' in facet) {
			var value_list = facet['oc-api:has-id-options'];
		}
		else{
			var value_list = [];
		}
		for (var i = 0, length = value_list.length; i < length; i++) {
			var val_item = value_list[i];
			var val_html = this.make_facet_val_link(val_item) + ' (' + val_item.count + ')';
			html_list.push(val_html);
		}
		var html = html_list.join(', ');
		return html;
	}
	this.make_facet_val_link = function(val_item){
		var html = '<a title="Filter by this value" ';
		html += 'href="javascript:oc_obj.change(\'' + val_item.id + '\')">';
		html += val_item.label;
		html += '</a>';
		return html;
	}
	this.change = function(change_url){
		this.api_url = change_url;
		this.get_data();
	}
	this.get_dataError = function(){
		var act_dom = this.get_facets_dom();
		if (act_dom != false) {
			var html = [
			'<div class="alert alert-warning" role="alert">',
			'<span class="glyphicon glyphicon-warning-sign" aria-hidden="true"></span>',
			'Failed to load valid data from Open Context.',
			'</div>'
			].join(' ');
			act_dom.innerHTML = html;
		}
	}
	this.get_facets_dom = function(){
		var act_dom = false;
		if (this.facets_dom_id != false) {
			if (document.getElementById(this.facets_dom_id)) {
				act_dom = document.getElementById(this.facets_dom_id);
			}
		}
		return act_dom;
	}
	
}
