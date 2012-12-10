if (!CMS.Models['Settings']) CMS.Models.Settings = new Object();

CMS.Models.Settings.CourseGradingPolicy = Backbone.Model.extend({
	defaults : {	
		course_location : null,
		graders : null,  // CourseGraderCollection 
		grade_cutoffs : null,  // CourseGradeCutoff model
        grace_period : null // either null or seconds of grace period
	},
	parse: function(attributes) {
		if (attributes['course_location']) {
			attributes.course_location = new CMS.Models.Location(attributes.course_location, {parse:true});
		}
		if (attributes['grace_period']) {
			attributes.grace_period = new Date(attributes.grace_period);
		}
		if (attributes['graders']) {
			var graderCollection;
			if (this.has('graders')) {
				graderCollection = this.get('graders');
				graderCollection.reset(attributes.graders);
			}
			else {
				graderCollection = new CMS.Models.Settings.CourseGraderCollection(attributes.graders);
				graderCollection.course_location = attributes['course_location'] || this.get('course_location');
			}
			attributes.graders = graderCollection;
		}
		return attributes;
	},
	url : function() {
		var location = this.get('course_location');
		return '/' + location.get('org') + "/" + location.get('course') + '/settings/' + location.get('name') + '/section/grading';
	}
});

CMS.Models.Settings.CourseGrader = Backbone.Model.extend({
	defaults: {
        "type" : "",	// must be unique w/in collection (ie. w/in course)
        "min_count" : 0,
        "drop_count" : 0,
        "short_label" : "",	// what to use in place of type if space is an issue 
        "weight" : 0 // int 0..100
    },
    initialize: function() {
    	if (!this.collection)
    		console.log("damn");
    },
    parse : function(attrs) {
    	if (attrs['weight']) {
    		if (!_.isNumber(attrs.weight)) attrs.weight = parseInt(attrs.weight);
    	}
    	if (attrs['min_count']) {
    		if (!_.isNumber(attrs.min_count)) attrs.min_count = parseInt(attrs.min_count);
    	}
    	if (attrs['drop_count']) {
    		if (!_.isNumber(attrs.drop_count)) attrs.drop_count = parseInt(attrs.drop_count);
    	}
    	return attrs;
    },
    validate : function(attrs) {
    	var errors = {};
    	if (attrs['type']) {
    		if (_.isEmpty(attrs['type'])) {
    			errors.type = "The assignment type must have a name.";
    		}
    		else {
    			// FIXME somehow this.collection is unbound sometimes. I can't track down when
    			var existing = this.collection && this.collection.some(function(other) { return (other != this) && (other.get('type') == attrs['type']);}, this);
    			if (existing) {
    				errors.type = "There's already another assignment type with this name.";
    			}
    		}
    	}
    	if (attrs['weight']) {
    		if (!parseInt(attrs.weight)) {
    			errors.weight = "Please enter an integer between 0 and 100.";
    		}
    		else {
    			attrs.weight = parseInt(attrs.weight); // see if this ensures value saved is int
    			if (this.collection && attrs.weight > 0) {
    				// if get() doesn't get the value before the call, use previous()
    				if ((this.collection.sumWeights() + attrs.weight - this.get('weight')) > 100)
    					errors.weight = "The weights cannot add to more than 100.";
    			}
    	}}
    	if (attrs['min_count']) {
    		if (!parseInt(attrs.min_count)) {
    			errors.min_count = "Please enter an integer.";
    		}
    		else attrs.min_count = parseInt(attrs.min_count);
    	}
    	if (attrs['drop_count']) {
    		if (!parseInt(attrs.drop_count)) {
    			errors.drop_count = "Please enter an integer.";
    		}
    		else attrs.drop_count = parseInt(attrs.drop_count);
    	}
    	if (attrs['min_count'] && attrs['drop_count'] && attrs.drop_count > attrs.min_count) {
    		errors.drop_count = "Cannot drop more " + attrs.type + " than will assigned.";
    	}
		if (!_.isEmpty(errors)) return errors;
    }
});

CMS.Models.Settings.CourseGraderCollection = Backbone.Collection.extend({
	model : CMS.Models.Settings.CourseGrader,
	course_location : null, // must be set to a Location object
	url : function() {
		return '/' + this.course_location.get('org') + "/" + this.course_location.get('course') + '/grades/' + this.course_location.get('name');
	},
	sumWeights : function() {
		return this.reduce(function(subtotal, grader) { return subtotal + grader.get('weight'); }, 0);
	}
});