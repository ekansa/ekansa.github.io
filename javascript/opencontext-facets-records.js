/*
 * ------------------------------------------------------------------
	AJAX for using the Open Context API,
	getting only simple search results
	
	This code is derived from code from Sarah Rowe's
	2015-2016 project for the Institute for Digital Archaeology
	at Michigan State University
	
	See: http://sarahmrowe.github.io/Virtual_Valdivia/index.html
 * ------------------------------------------------------------------
*/


function OpenContextFacetsRecsAPI() {
	/* Object for runing searches + displaying results from Open Context */
	this.api_roots = [
		'https://opencontext.org/',
		'http://opencontext.org/',
	];
	this.default_api_url = 'https://opencontext.org/subjects-search/';
	this.url = null;
	this.data = null; // search result data
	this.facets = null; // facet information returned from Open Context
	this.page_dom_id = 'oc-data'; // DOM ID for the page that will be created by the script
	this.obj_name = 'oc_obj'; // name of this object (for reference for search functions)
	this.title = 'Open Context Search Results';  //title to be displayed
	this.keyword_dom_id = 'oc-keyword-search'; // DOM ID for the keyword search text input from user
	this.results_dom_id = 'oc-results'; // DOM ID for where to put HTML displaying search results
	this.facets_dom_id = 'oc-facets'; // DOM ID for where to put HTML displaying search facets
	this.response = 'metadata,uri-meta,facet';
	this.project_slugs = [];
	this.category_slugs = [];
	this.attribute_slugs = [];
	this.sort = null;
    this.examples_per_row = 3;
	this.record_start = 0;  // the start number for the results
	this.record_rows = 24;  // the number of rows returned in a search result
    this.start_faceturl = 'https://opencontext.org/subjects-search/?proj=14-bade-museum';
    this.show_only_facets = []; //list of the facets we want to display on the page
    this.previous_link = null;
    this.next_link = null;
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
			// we don't have a specified API search url, so checked for hashed urls
			var url = this.get_api_url();
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
		var url = this.get_api_url();
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
			beforeSend: function(){
				alert(this.url);
			},
			success: this.get_dataDone, //do this when we get data w/o problems
			error: this.get_dataError //error message display
		});
	}
	this.get_dataError = function(){
		// error handling to be added latter
	}
	this.get_dataDone = function(data){
		// function to display results of a request for data
		
		//reset the url to be null
		this.url = null;
		//set the current data for the API object
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
					// result_html += '<div class="row">';
				
					// now loop through the records from the data obtained via the API
                    var all_rows = [];
                    var act_row = [];
                    // organize them into rows for consistent display
					for (var i = 0, length = this.data['oc-api:has-results'].length; i < length; i++) { 
						// a record object has data about an individual Open Context record
						// returned from the search.
						var record = this.data['oc-api:has-results'][i];
						var record_html = this.make_record_html(record);
						// result_html += record_html;
                        
                        if (act_row.length >= this.examples_per_row) {
                            all_rows.push(act_row);
                            var act_row =[];
                        }
                        act_row.push(record_html);
					}
					
                    all_rows.push(act_row);
                    
					// result_html += '</div>';
                    
                    console.log(all_rows);
                    
                    // now html the rows
                    for (var i = 0, length = all_rows.length; i < length; i++) {
                        var act_row = all_rows[i];
                        result_html += '<div class="row">';
                        for (var j = 0, ar_length = act_row.length; j < ar_length; j++){
                            var act_cell = act_row[j];
                            result_html += act_cell;
                        }
                        result_html += '</div>';
                    }
                    result_html += '<div class="row">';
                    result_html += '<div class="col-xs-6">';
                    result_html += this.make_previous_link_html();
                    result_html += '</div>';
                    result_html += '<div class="col-xs-6">';
                    result_html += this.make_next_link_html();
                    result_html += '</div>';
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

    //pagination when search returns more than 20 results
    this.make_next_link_html = function() {
        var html = '';
        if (this.data != null) {
            //we have search results, so proceed to display them.
            if ("next" in this.data) {
                this.next_link = this.data ["next"];
                html = '<div align="right"> ';
                html += '<button type="button" class="btn btn-default" ';
                html += 'onclick="' + this.obj_name + '.get_paging(\'next\');">';
                html += '<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>';
                html += '</button>';
                html += '</div>';
            }
        }
        return html;
      }
    
    this.make_previous_link_html = function() {
        var html = '';
        if (this.data != null) {
            //we have search results, so proceed to display them.
            if ("previous" in this.data) {
                this.previous_link = this.data ["previous"];
                html = '<div align="left"> ';
                html += '<button type="button" class="btn btn-default" ';
                html += 'onclick="' + this.obj_name + '.get_paging(\'previous\');">';
                html += '<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>';
                html += '</button>';
                html += '</div>';
            }
        }
        return html;
      }
    
    this.get_paging = function(l_type) {
        //this function runs a AJAX request for pagination.
        if (l_type == "next"){
            var url = this.next_link;
        }
        
         if (l_type == "previous"){
            var url = this.previous_link;
        }
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
     
    this.get_start_facets = function() {
		// calls the Open Context API to get data from facets
		var url = this.start_faceturl;
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
				success: this.get_start_facetsDone, //do this when we get data w/o problems
				error: this.get_dataError //error message display
			});
		}
	}
	
    this.get_start_facetsDone = function(data){
		if ('oc-api:has-facets' in data) {
			// if we find 'oc-api:has-facets' in the data, then
			// save the facet information to the this.facet attribute
			this.facets = data['oc-api:has-facets'];
			console.log(this.facets);
			// now make HTML for the facets and put them in the right place
			this.show_facets();
		}
        else{
           console.log(data); 
        }
	}
    
    this.show_facets = function(){
		if (document.getElementById(this.facets_dom_id)) {
			var act_dom = document.getElementById(this.facets_dom_id);
			var html = '';
			if(this.facets != null){
				// show some search facets
				for (var i = 0, length = this.facets.length; i < length; i++) {
					var facet = this.facets[i];
                    for (var j = 0, sf_length = this.show_only_facets.length; j < sf_length; j++) {
                        var show_facet = this.show_only_facets[j];
                        if(facet.label == show_facet){
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
			var val_html = this.make_facet_val_link(facet, val_item); //+ ' (' + val_item.count + ')';
			html_list.push(val_html);
		}
		var html = html_list.join(' ');
		return html;
	}
    
	this.make_facet_val_link = function(facet, val_item){
		var html = '<div class = "checkbox">';
        var cb_class = facet.id.replace('#','');
        html += '<label>';
        html += '<input type="checkbox" class="' + cb_class + '"';
        html += 'value="' + val_item.slug + '" >';
		html += val_item.label;
        html += '  <a target="_blank" href="' +val_item['rdfs:isDefinedBy'] + '" >';
        html += '<span class="glyphicon glyphicon-new-window" aria-hidden="true"></span>'
        html += '</a>';
        html += '</label>';
        html += '</div>';
		return html;
	}
    
    this.facets_search = function(){
		// this function executes a search based on facet-values in check box input elements
		var query_terms = [];
        if(this.facets != null){
            // if we have facet data (originally obtained by the API)
			// then loop through these facets
            for (var i = 0, length = this.facets.length; i < length; i++) {
				var facet = this.facets[i];
				// now loop through the this.show_only_facets list to check to see
				// if the current facet is one that we want to use for displaying & searches
                for (var j = 0, sf_length = this.show_only_facets.length; j < sf_length; j++) {
                    var show_facet = this.show_only_facets[j];
                    if(facet.label == show_facet){
						// OK, the current facet is a facet we want the user to be able to use
                        var sel_vals = [];
						// the cb_class identifies checkbox input elements for values a user can
						// select (check) for this particular facet
                        var cb_class = facet.id.replace ('#','');
						// get a list of input elements that have the cb_class
                        var cbList = document.getElementsByClassName(cb_class);
                        for (var k = 0, cb_length = cbList.length; k <cb_length; k++){
                            var cb_item = cbList[k];
                            if (cb_item.checked){
								// a check box DOM element was checked by user, so add
								// the value of the DOM element to the list of selected values
                                sel_vals.push(cb_item.value);
                            }
                        }
                        console.log(sel_vals);
                        if(sel_vals.length > 0){
							// we more than 0 selected values, create a query
							// with the property (attribute) slug, which we get from the
							// facet.id and then add the selected values to the make
							// a query
                            var prop_slug = facet.id.replace ('#facet-prop-','');
							var query_term = prop_slug + '---' + sel_vals.join('||');
							query_terms.push(query_term);
                        }
                    }
                }
            }
        }
		
		if(query_terms.length > 0){
	        // There are more than 0 query_terms, so we can do a search.
			// Now we need to make the URL to do the search
			var url = this.default_api_url;
			if(url.indexOf('?') > -1){
				// this checkes to see if the url already has a '?' character
				// if the url.indexOf is > -1, then the url has the '?' character
				var query_term_sep = '&';
			}
			else{
				var query_term_sep = '?';	
			}
			for (var i = 0, length = query_terms.length; i < length; i++) {
				// add the query terms to the url!
				var query_term = query_terms[i];
				url += query_term_sep + 'prop=' + query_term;
				query_term_sep = '&';
			}
			console.log(url); // log the url for debugging
			// now add additional query parameters (the defaults, so we also filter by project, etc.)
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
		else {
			// don't do anything if the user pressed the search button without check boxes
			// checked.
			return false;
		}
    }
    this.setup_page = function(){
		if (document.getElementById(this.page_dom_id)) {
			// found the DOM element for the search box
			// the value of the search box is the search keyword input by the user
			var act_dom = document.getElementById(this.page_dom_id);
			var html = [
			'<div class="container-fluid">',
				'<div class="row">',    
						'<div class="col-sm-8">',
						'<h3>' + this.title + '</h3>',
						'</div>',
						'<div class="col-sm-4">',
							'<div class="form-group">',
								'<label for="oc-keyword-search">Search Open Context</label>',
								'<input type="search" ',
								'class="form-control" ',
								'onchange="' + this.obj_name + '.search();return false;" ',
								'id="'+ this.keyword_dom_id +'" ',
								'placeholder="Keyword Search" >',
								'<p class="help-block">Type a simple keyword search.</p>',
							'</div>',
							'<button type="button" class="btn btn-default" ',
							  'onclick="' + this.obj_name + '.search();return false;">Search</button>',
						'</div>',	
					'</div>',
				'<div class="row">',    
					'<div class="col-sm-6">',
						'<div id="'+ this.facets_dom_id +'">',
						'</div>',
					'</div>',
					'<div class="col-sm-6">',
						'<div id="'+ this.results_dom_id +'">',
						'</div>',
					'</div>',	
				'</div>',
			'</div>',
			].join('\n');
			act_dom.innerHTML = html;
		}
		else{
			// cannot find the DOM element for the search box
			// skip an error message for now
			return false;
		}
	}
	this.get_api_url = function(){
		// default_api_url
		var url = this.default_api_url;
		if (this.url != null) {
			// we've got a requested url
			url = this.url;
		}
		else{
			// checking for a hashed url
			var hash_exists = window.location.hash;
			if (hash_exists){
				var hash = window.location.hash.substring(1);
				var api_root_missing = true;
				for (var i = 0, length = this.api_roots.length; i < length; i++) {
					var api_root = this.api_roots[i];
					if (hash.indexOf(api_root) > -1) {
						//found the API root
						api_root_missing = false;
						url = hash;
					}
				}
				if (api_root_missing){
					url = this.api_roots[0] + hash;
				}
			}	
		}
		return url;
	}
}
