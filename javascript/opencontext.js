/*
 * ------------------------------------------------------------------
	AJAX for using the Open Context API
 * ------------------------------------------------------------------
*/


function OpenContextAPI(settings) {
	/* Object for runing searches + displaying results from Open Context */
	this.name = "opencontext"; //object name, used for DOM-ID prefixes and object labeling
	this.settings = settings;
	this.root_dom_id = 'opencontext_data';
	this.title = 'Open Context Search Results';
	this.api_root = 'http://opencontext.org/';
	this.api_start_url = 'http://opencontext.org/subjects-search/';
	this.api_url = false;
	this.data = false;
	this.facets_dom_id = 'facets';
	this.filters_dom_id = 'filters';
	
	/* This is for a Lealet Map, which displays geospatial data from the search */
	this.map_dom_id = false;
	this.map_height_px = 500;
	this.map = false;
	
	/* This builds HTML dom elements to fill with data, and creates an element for the map */
	this.start = function(){
		this.intialize_settings();
		this.start_html();
		this.start_map();
		this.get_data();
	}
	this.intialize_settings = function(){
		// sets different object attributes to settings passed to the object
		if ('root_dom_id' in this.settings) {
			this.root_dom_id = this.settings['root_dom_id'];
		}
		if ('api_start_url' in this.settings) {
			this.api_start_url = this.settings['api_start_url'];
		}
		if ('title' in this.settings) {
			this.title = settings['title'];
		}
		if ('map_height_px' in this.settings) {
			this.map_height_px = settings['map_height_px'];
		}
	}
	
	this.start_map = function(){
		map = L.map(this.map_dom_id);
		this.bounds = new L.LatLngBounds();
		var osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
		});
		var ESRISatelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
			attribution: '&copy; <a href="https://services.arcgisonline.com/">ESRI.com</a> '
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
	}
	this.get_data = function() {
		// calls the Open Context API to get data
		var url = this.get_api_url();
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
	this.get_api_url = function(){
		// default to the api_start_url
		var url = this.api_start_url;
		if (this.api_url != false) {
			// we've got a requested url
			url = this.api_url;
		}
		else{
			// checking for a hashed url
			var hash_exists = window.location.hash;
			if (hash_exists){
				var hash = window.location.hash.substring(1);
				if (hash.indexOf(this.api_root) > -1) {
					url = hash;
				}
				else{
					url = this.api_root + hash;
				}
			}	
		}
		return url;
	}
	this.get_dataDone = function(data){
		// function to display results of a request for data
		this.api_url = false; //set to false now that data is done.
		this.data = data;
		console.log(data);
		// show facets + facet values
		this.show_facets();
		// show filters on the data
		//this.show_filters();
		// now show the geojson data using the Leaflet Map
		this.map.render_region_layer(data);
	}
	this.show_facets = function(){
		var act_dom = this.get_facets_dom();
		if (act_dom != false) {
			var html = '';
			var data = this.data;
			html += '<h3>Filter Records</h3>';
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
	this.show_filters = function(){
		// function to display filers as needed
		var act_dom = this.get_filters_dom();
		if (act_dom != false) {
			// we've got a dom place to add filters too
			var data = this.data;
			if ('oc-api:active-filters' in data) {
				// the data has filters
				html += '<div class="well small">';
				html += '<h4>Filters on the data</h4>';
				html += '<ul>';
				for (var i = 0, length = data['oc-api:active-filters'].length; i < length; i++) {
					var filter = data['oc-api:active-filters'][i];
					html += this.make_filter_html(filter);
				}
				html += '</ul>';
				html += '</div>';
				act_dom.innerHTML = html;
			}
		}
	}
	this.make_filter_html = function(filter){
		var html = '<li>';
		html += '<a title="Click to remove this filter" ';
		html += 'href="javascript:oc_obj.change(\'' + filter['oc-api:remove'] + '\')">';
		html += filter.label;
		html += '</li>';
		return html;
	}
	this.change = function(change_url){
		// this function is executed when a user clicks on a link
		// to add a filter or remove a filter
		this.change_frag_id(change_url);
		this.api_url = change_url;
		this.get_data();
	}
	this.change_frag_id = function(new_frag){
		new_frag = new_frag.replace(this.api_root, '');
		window.location.hash = new_frag;
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
	this.get_filters_dom = function(){
		var act_dom = false;
		if (this.filters_dom_id != false) {
			if (document.getElementById(this.filters_dom_id)) {
				act_dom = document.getElementById(this.filters_dom_id);
			}
		}
		return act_dom;
	}
	this.start_html = function(){
		// builds the initial HTML for
		// map, facets, filters, and results
		var ok = false;
		var act_dom = false;
		if (document.getElementById(this.root_dom_id)) {
			act_dom = document.getElementById(this.root_dom_id);
		}
		if (act_dom != false) {
			this.map_dom_id = this.root_dom_id + '_map';
			this.facets_dom_id = this.root_dom_id + '_facets';
			this.filters_dom_id = this.root_dom_id + '_filters';
			var html = [
			'<style type="text/css">',
				'#' + this.root_dom_id + ' {',
					'padding:2%;',
				'}',
				'#' + this.map_dom_id  + ' {',
					'width:100%;',
					'height:' + this.map_height_px + 'px;',
					'margin-bottom: 5px;',
				'}',
			'</style>',
			'<div class="container-fluid">',
				'<h1>' + this.title + '</h1>',
				'<div id="' + this.map_dom_id + '">',
				'Preparing map...',
				'</div>',
			'</div>',
			'<div class="container-fluid">',
				'<div class="row">',
					'<div class="col-xs-8">',
						'<div id="' + this.facets_dom_id + '" class="well">',
							'Loading filters here...',
						'</div>',
					'</div>',
					'<div id="' + this.filters_dom_id  + '" class="col-xs-4">',
					'</div>',
				'</div>',
			'</div>'		
			].join('\n');
			act_dom.innerHTML = html;
			ok = true;
		}
		else{
			alert('Check your settings. Could not construct HTML in: ' + this.root_dom_id);
		}
		return ok;
	}
}
