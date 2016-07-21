/*
 * ------------------------------------------------------------------
	AJAX for using the Open Context API,
	getting only simple search results
 * ------------------------------------------------------------------
*/


function OpenContextSimpleAPI() {
	/* Object for runing searches + displaying results from Open Context */
	this.name = 'oc-simple'; //object name, used for DOM-ID prefixes and object labeling
	this.default_api_url = 'http://opencontext.org/subjects-search/';
	this.url = null;
	this.data = null;
	this.results_dom_id = 'oc-results';
	this.response = 'metadata,uri-meta';
	this.project_slugs = [];
	this.category_slugs = [];
	this.attribute_slugs = [];
	this.sort = null;
	this.record_start = 0;  // the start number for the results
	this.record_rows = 20;  // the number of rows returned in a search result
	this.get_data = function() {
		// calls the Open Context API to get data
		if (this.url != null) {
			// we've got a search API URL specified
			// which already has additional parameters in it
			var url = this.url;
		}
		else{
			// we don't have a specified API search url, so use the default
			var url = this.default_api_url;
		}
		var params = this.set_parameters();
		return $.ajax({
			type: "GET",
			url: url,
			data: params,
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
	this.get_search_data = function(query) {
		// calls the Open Context API to get data with a keyword search
		// Note: how this is a new search, so the search uses the default_api_url
		// and the params will have search additional filters / attributes
		var url = this.default_api_url;
		var params = this.set_parameters();
		params['q'] = query;
		return $.ajax({
			type: "GET",
			url: url,
			dataType: "json",
			data: params,
			headers: {
				//added to get JSON data (content negotiation)
				Accept : "application/json; charset=utf-8"
			},
			context: this,
			success: this.get_dataDone, //do this when we get data w/o problems
			error: this.get_dataError //error message display
		});
	}
	this.get_dataDone = function(data){
		// function to display results of a request for data
		this.data = data;
		console.log(data);
		// show facets + facet values
		this.show_facets();
		// show filters on the data
		//this.show_filters();
		// now show the geojson data using the Leaflet Map
		this.map.render_region_layer(data);
	}
	this.set_parameters = function(){
		// this function sets the parameters used to filter a search,
		// page through results, request additional attributes for search results
		// and sort the search results
		paras = {}; // default, empty search parameters
		if (this.url == null) {
			// builds the parameters only if we don't have them
			// already specified in a query URL
			if (this.sort != null) {
				params['sort'] = this.sort;  // sorting 
			}
			params['start'] = this.record_start;  // the start number for records in this batch
			params['rows'] = this.record_rows; // number of rows we want
			params['response'] = this.response;  // the type of JSON response to get from OC
		}
		return params;
	}
	this.change = function(change_url){
		// this function is executed when a user clicks on a link
		// to add a filter or remove a filter
		this.api_url = change_url;
		this.get_data();
	}
}
