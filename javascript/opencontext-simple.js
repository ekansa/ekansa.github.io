/*
 * ------------------------------------------------------------------
	AJAX for using the Open Context API,
	getting only simple search results
 * ------------------------------------------------------------------
*/


function OpenContextSimpleAPI() {
	/* Object for runing searches + displaying results from Open Context */
	this.default_api_url = 'https://opencontext.org/subjects-search/';
	this.url = null;
	this.data = null;
	this.keyword_dom_id = 'oc-keyword-search'; // DOM ID for the keyword search text input from user
	this.results_dom_id = 'oc-results'; // DOM ID for where to put HTML displaying search results
	this.response = 'metadata,uri-meta';
	this.project_slugs = [];
	this.category_slugs = [];
	this.attribute_slugs = [];
	this.sort = null;
	this.record_start = 0;  // the start number for the results
	this.record_rows = 20;  // the number of rows returned in a search result
	this.search = function(){
		if (document.getElementById(this.keyword_dom_id)) {
			// found the DOM element for the search box
			// the value of the search box is the search keyword input by the user
			var query = document.getElementById(this.keyword_dom_id).value;
			
			// now run the AJAX request to Open Context's API
			this.get_search_data(query);
			return false;
		}
		else{
			// cannot find the DOM element for the search box
			// alert with an error message.
			var error = [
			'Cannot find text input for search, ',
			'set the "keyword_dom_id" attribute for this object ',
			'to indicate the ID of the text search box used for ',
			'keyword searches'
			].join('\n');
			alert(error);
			return false;
		}
	}
	this.get_data = function() {
		// calls the Open Context API to get data, not yet filtered with a keyword search
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
		//alert('Found: ' + this.data['totalResults']);
		// console.log is for debugging, it stores data for inspection
		// with a brower's javascript debugging tools
		console.log(data);
		
		//render the results as HTML on the Web page.
		this.make_results_html();
		return false;
	}
	this.set_parameters = function(){
		// this function sets the parameters used to filter a search,
		// page through results, request additional attributes for search results
		// and sort the search results
		params = {}; // default, empty search parameters
		if (this.url == null) {
			// builds the parameters only if we don't have them
			// already specified in a query URL
			if (this.project_slugs.length > 0) {
				params['proj'] = this.project_slugs.join('||');
			}
			if (this.category_slugs.length > 0) {
				params['prop'] = this.category_slugs.join('||');
			}
			if (this.attribute_slugs.length > 0) {
				params['attributes'] = this.attribute_slugs.join(',');
			}
			if (this.sort != null) {
				params['sort'] = this.sort;  // sorting 
			}
			params['start'] = this.record_start;  // the start number for records in this batch
			params['rows'] = this.record_rows; // number of rows we want
			params['response'] = this.response;  // the type of JSON response to get from OC
		}
		return params;
	}
	/*
	 * Functions below here are for displaying results in HTML
	 * You can edit these functions for generating HTML so results look good on
	 * your own website.
	 */
	this.make_results_html = function(){
		// this renders all the results as HTML on the webpage
		if (this.data != null) {
			// we have search results, so proceed to display them.
			if (document.getElementById(this.results_dom_id)) {
				// found the DOM element for where search results will be added
				// result_dom will be the HTML container for the search results
				var result_dom = document.getElementById(this.results_dom_id);
				var result_html = '<h3>Search Results (Total: ' + this.data['totalResults'] + ')</h3>';
				
				// check to make sure we actually have result records in the data from the API
				if ('oc-api:has-results' in this.data) {
					result_html += '<div class="row">';
				
					// now loop through the records from the data obtained via the API
					for (var i = 0, length = this.data['oc-api:has-results'].length; i < length; i++) { 
						// a record object has data about an individual Open Context record
						// returned from the search.
						var record = this.data['oc-api:has-results'][i];
						var record_html = this.make_record_html(record);
						result_html += record_html;
					}
					
					result_html += '</div>';
				}
				else{
					result_html += '<p>No result records found.</p>';
				}
				result_dom.innerHTML = result_html;
			}
			else{
				// cannot find the DOM element for the search results
				// alert with an error message.
				var error = [
				'Cannot find the DOM element for putting search results, ',
				'set the "results_dom_id" attribute for this object ',
				'to indicate the ID of the HTML DOM element where ',
				'search results will be displayed.'
				].join('\n');
				alert(error);
			}
		}
		return false;
	}
	this.make_record_html = function(record){
		// make HTML for a search result
		var record_html = '<div class="col-xs-3">';
		var thumb = false;
		if ('thumbnail' in record) {
			if (record['thumbnail'] != false) {
				thumb = record['thumbnail'];
			}
		}
		if (thumb != false) {
			// we have a thumbnail in the result
			record_html += '<div class="thumbnail">';
			record_html += '<a href="' + record.uri + '" target="_blank">';
			record_html += '<img alt="thumbail for ' + record.label + '" '
			record_html += 'src="' + thumb + '" class="img-responsive" />';
			record_html += '</a>';
			record_html += '<div class="caption">';
			record_html += '<h5 class="text-center">Item:</hg>';
			record_html += '<h4 class="text-center">' + record.label + '</h4>';
			record_html += '</div>';
			record_html += '</div>';
		}
		else{
			record_html += '<h5 class="text-center">Item:</hg>';
			record_html += '<a href="' + record.uri + '" target="_blank">';
			record_html += '<h4 class="text-center">' + record.label + '</h4>';
			record_html += '</a>';
		}
		record_html += '</div>';
		return record_html;
	}
}
