var	SEED,
	FAM_NROWS = 3,
	FAM_NCOLS = 3,
	FAM_INIT_DELAY = 1000,
	FAM_STUDY_BLOCK_TIME = 60000 * 10,
	N_FAM_BLOCKS = 2,
	FAM_EXPOSE_DURATION = 8000,
	STUDY_NROWS = 4,
	STUDY_NCOLS = 4,
	N_STUDY_BLOCKS = 4,
	ITEMS_PER_STUDY_ROUND = STUDY_NCOLS * STUDY_NCOLS,
	TOTAL_STUDY_ITEMS = N_STUDY_BLOCKS * ITEMS_PER_STUDY_ROUND,
	STUDY_FRAME_DELAY = 500,
	STUDY_DURATION = 'selfpaced', // 'none' | 'selfpaced' | fixed t
	STUDY_BLOCK_TIME = 90000,
	STUDY_INIT_DELAY = 1000,
	STUDY_EXPOSE = 'sequence', // 'none' | 'free' | 'snake' | 'sequence'
	STUDY_EXPOSE_DURATION = 8000, // how long images are shown at beginning of study
	STUDY_COND = ['active', 'yoked'],
	N_TEST_BLOCKS = 8,
	TEST_INIT_DELAY = 1000,
	TEST_NROWS = 4,
	TEST_NCOLS = 4,
	ITEMS_PER_TEST_BLOCK = TEST_NCOLS * TEST_NROWS,
	TEST_DURATION = 'none',
	TEST_FRAME_DELAY = 0,
	TEST_BLOCK_TIME = 60000 * 5; // maximum test block duration (not implemented)

var exp,
	active_item = undefined,
	yokeddata = [],
	stimuli,
	test_items_selected,
	test_accuracy = [],
	spatial_recall_accuracy = [],
	outpfx = [],
	timeouts = [],
	partnerdata = [],
	ids = uniqueId.split(':'),
	block_start_time;

// default preexposure pattern ordering
var PREEXPOSE_IND = [0, 1, 2, 3];

// Preexposure patterns. Indices refer to the
// objects in each group (cards with same face
// color). Start time within the overall pre-exposure
// period, and the duration of exposure for that group.
var PREEXPOSE_SEQ = [[{'ind': [0, 1, 4, 5],
					   'start': 1000,
				       'duration': 2000},
				      {'ind': [2, 6, 8, 9, 10],
				       'start': 1000,
				       'duration': 4000},
				      {'ind': [3, 7, 11, 12, 13, 14, 15],
				       'start': 1000,
				       'duration': 6000}],
					 [{'ind': [8, 9, 12, 13],
					   'start': 1000,
				       'duration': 2000},
				      {'ind': [4, 5, 6, 10, 14],
				       'start': 1000,
				       'duration': 4000},
				      {'ind': [0, 1, 2, 3, 7, 11, 15],
				       'start': 1000,
				       'duration': 6000}],
					 [{'ind': [10, 11, 14, 15],
					   'start': 1000,
				       'duration': 2000},
				      {'ind': [5, 6, 7, 9, 13],
				       'start': 1000,
				       'duration': 4000},
				      {'ind': [0, 1, 2, 3, 4, 8, 12],
				       'start': 1000,
				       'duration': 6000}],
					 [{'ind': [2, 3, 6, 7],
					   'start': 1000,
				       'duration': 2000},
				      {'ind': [1, 5, 9, 10, 11],
				       'start': 1000,
				       'duration': 4000},
				      {'ind': [0, 4, 8, 12, 13, 14, 15],
				       'start': 1000,
				       'duration': 6000}]];

// Colors for each pre-exposure group
//var PREEXPOSE_GRP_COL = ['#DAEAFF', '#ECFFDA', '#FFDEDA'];
//var PREEXPOSE_GRP_COL = ['#BDBDBD', '#848484', '#585858'];
var PREEXPOSE_GRP_COL = ['#BDBDBD', '#BDBDBD', '#BDBDBD'];


// Preexposure patterns. Indices refer to the
// objects in each group (cards with same face
// color). Start time within the overall pre-exposure
// period, and the duration of exposure for that group.
var PREEXPOSE_SEQ_FAM = [[{'ind': [0],
					       'start': 1000,
				           'duration': 2000},
				          {'ind': [1, 3, 4],
				           'start': 1000,
				           'duration': 4000},
						  {'ind': [2, 5, 6, 7, 8],
						   'start': 1000,
						   'duration': 6000}],
						 [{'ind': [2],
					       'start': 1000,
				           'duration': 2000},
				          {'ind': [1, 4, 5],
				           'start': 1000,
				           'duration': 4000},
						  {'ind': [0, 3, 6, 7, 8],
						   'start': 1000,
						   'duration': 6000}],
						 [{'ind': [6],
					       'start': 1000,
				           'duration': 2000},
				          {'ind': [3, 4, 7],
				           'start': 1000,
				           'duration': 4000},
						  {'ind': [0, 1, 2, 5, 8],
						   'start': 1000,
						   'duration': 6000}],
						 [{'ind': [8],
					       'start': 1000,
				           'duration': 2000},
				          {'ind': [4, 5, 7],
				           'start': 1000,
				           'duration': 4000},
						  {'ind': [0, 1, 2, 3, 6],
						   'start': 1000,
						   'duration': 6000}]
];



// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);
var LOGGING = true;
var SAVEDATA = (ids[0].indexOf('throwaway') > -1) ? false : true;


// For this yoked, lab-only experiment, the uniqueId
// has the format <new participant id>:<partner id>
var partnerid = ids[1];

// If retesting a participant, treat it as a
// seed since there is no yoked partner
if (ids[0].indexOf('-retest') > -1) {
	var SEED = true;
	var RETEST = true;
} else if (ids[1] == "None") {
	var SEED = true;
	var RETEST = false;
} else {
	var SEED = false;
	var RETEST = false;
};


// Loading data for yoked partner
var partner_result = [];
if (!SEED) {
	output(['requesting partner data']);
	$.ajax({url: 'partnerdata',
			data: 'partnerid='+partnerid,
			type: 'GET',
			async: false,
			timeout: 10000,
			dataType: 'json',
			success: function(data) {
				output(['retrieved partner data']);
				partner_result = data;
			},
			error: function(jqXHR, textStatus, errorThrown) {
				output(['failed to retrieve data for partner: '+partnerid]);
				output(['switching to active only!']);
				SEED = true;
			}
	});
}


// If this is a retest, load data from first session
var prev_test_data = [];
if (RETEST) {
	output(['requesting data from first session']);
	$.ajax({url: 'participantdata',
			data: 'participantid='+ids[0].slice(0, ids[0].indexOf('-retest')),
			type: 'GET',
			async: false,
			timeout: 10000,
			dataType: 'json',
			success: function(data) {
				output(['retrieved participant data']);
				prev_test_data = data['participant_data'];
			},
			error: function(jqXHR, textStatus, errorThrown) {
				output(['failed to retrieve data for participant: '+ids[0]]);
				RETEST = false;
			}
	});
};


psiTurk.preloadPages(['setup.html',
					  'chooser.html',
					  'stage.html',
					  'postquestionnaire.html',
					  'summary.html']);

psiTurk.preloadImages(IMAGES); // array in stimuli.js

if (RETEST) {
	psiTurk.preloadImages(IMAGES_RETEST_FOILS);
};
$('#loading').css('display', 'none');


// disable vertical bounce
$(document).bind(
      'touchmove',
          function(e) {
            e.preventDefault();
          }
);

// set study event based on user-agent
var SELECT_EVENT = (navigator.userAgent.indexOf('iPad') == -1) ? 'click' : 'touchstart';


// Generic function for saving data
function output(arr) {
	arr = outpfx.concat(arr);
    if (SAVEDATA) psiTurk.recordTrialData(arr);
    if (LOGGING) console.log(arr.join(" "));
};


function clear_timeouts() {
	$.each(timeouts, function(i, to) {
		clearTimeout(to);
	})
	timeouts = [];
};

function timestamp() {
	return Date.now();
	//return Math.floor(window.performance.now() || Date.now());
}


var Controls = function(stage) {
	var self = this;
	self.stage = stage;
	self.stage_h = Number(self.stage.attr("height"));
	self.stage_w = Number(self.stage.attr("width"));

	self.x = 50;
	self.y = 30;

	self.start = self.stage.append('g')
						   .attr('id', 'control-start')
						   .attr('opacity', 1.);

	self.start.btn = self.start.append('path')
						  .attr('d', "M4 0c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-1 2l3 2-3 2v-4z")
						  .attr('stroke', '#D8D8D8')
						  .attr('stroke-width', .2)
						  .attr('fill', 'white')
						  .attr("transform", "translate("+(self.stage_w/2 - 30)+","+(self.stage_h/2 - 50)+") scale(10)")
	self.start.btn.on('mouseover', function(e) {
		self.start.btn.attr('fill', '#D8D8D8');
	})
	self.start.btn.on('mouseout', function(e) {
		self.start.btn.attr('fill', 'white');
	})

	self.cancel = self.stage.append('g')
							  .attr('id', 'control-cancel')
							  .attr('opacity', 1.);

	self.cancel.btn = self.cancel.append('path')
						  .attr('d', "M1.41 0l-1.41 1.41.72.72 1.78 1.81-1.78 1.78-.72.69 1.41 1.44.72-.72 1.81-1.81 1.78 1.81.69.72 1.44-1.44-.72-.69-1.81-1.78 1.81-1.81.72-.72-1.44-1.41-.69.72-1.78 1.78-1.81-1.78-.72-.72z")
						  .attr('stroke', '#D8D8D8')
						  .attr('stroke-width', .2)
						  .attr('fill', 'white')
						  .attr("transform", "translate("+self.x+","+self.y+") scale(7)")

	self.cancel.btn.on('mouseover', function(e) {
		self.cancel.btn.attr('fill', '#D8D8D8');
	})
	self.cancel.btn.on('mouseout', function(e) {
		self.cancel.btn.attr('fill', 'white');
	})
	self.cancel.btn.on('click', function(e) {
		output(['aborted']);
		clear_timeouts();
		if (active_item) active_item.unstudy(exp.chooser);
		else exp.chooser();
	})

}


var Item = function(pars) {
	var self = this;

	self.stage = pars['stage'];
	self.ind = pars['ind'];
	self.stimid = pars['id'];
	self.id = 'item-' + self.ind;
	self.row = pars['row'];
	self.col = pars['col'];
	self.width = pars['width'];
	self.height = pars['height'];
	self.x_off = pars['x_off'] | 0;
	self.y_off = pars['y_off'] | 0;
	self.x = self.width * self.row + self.x_off;
	self.y = self.height * self.col + self.y_off;
	self.framedelay = pars['framedelay'];
	self.duration = pars['duration'];
	self.img = pars['image'];
	self.blocking = pars['blocking'] | true;
	self.cond = pars['cond'];
	self.distance = pars['distance'];
	self.facecolor = pars['facecolor'] || '#E6E6E6';

	if (self.distance===undefined) {
		self.distance = 'none';
	}

	// item rendering
	padding = 10;
	self.obj_x = self.x + padding;
	self.obj_y = self.y + padding;
	self.obj_w = self.width - 2 * padding;
	self.obj_h = self.height - 2 * padding;

	// state variables
	self.active = false;
	self.framed = false;

	// for storing study data
	self.episode = {};

	output(['item', 'id='+self.stimid, 'ind='+self.ind, 'row='+self.row,
		    'col='+self.col, 'image='+self.img, 'cond='+self.cond,
		    'distance='+self.distance]);


	self.disp = self.stage.append('g')
						  .attr('id', self.id);


	self.back = self.disp.append('rect')
						  .attr('x', self.x + padding/2)
						  .attr('y', self.y + padding/2)
						  .attr('width', self.width - padding)
						  .attr('height', self.height - padding)
						  .attr('rx', 15)
						  .attr('ry', 15)
						  .attr('fill', 'white')
						  .attr('opacity', 1.)

	self.obj = self.disp.append('image')
						.attr('x', self.obj_x)
						.attr('y', self.obj_y)
						.attr('width', self.obj_w)
						.attr('height', self.obj_h)
						.attr('opacity', 0.)
						.attr('xlink:href', self.img);

	self.face = self.disp.append('rect')
						  .attr('x', self.x + padding/2)
						  .attr('y', self.y + padding/2)
						  .attr('width', self.width - padding)
						  .attr('height', self.height - padding)
						  .attr('rx', 15)
						  .attr('ry', 15)
						  .attr('fill', self.facecolor)
						  .attr('opacity', 0.)

	self.frame = self.disp.append('rect')
						  .attr('x', self.x + padding/2)
						  .attr('y', self.y + padding/2)
						  .attr('width', self.width - padding)
						  .attr('height', self.height - padding)
						  .attr('rx', 15)
						  .attr('ry', 15)
						  .attr('stroke-width', 5)
						  .attr('stroke', '#D8D8D8')
						  .attr('fill', 'none')
						  .attr('opacity', 0.)

	self.set_facecolor = function(col) {
		self.face.attr('fill', col);
		self.facecolor = col;
	}

	self.frame_on = function() {
		output([self.id, 'frame_highlight_on'])
		self.framed = true;
		self.frame.attr('stroke', 'red')
				  .attr('opacity', 1.);
	};

	self.frame_inactive = function() {
		output([self.id, 'frame_highlight_off'])
		self.framed = false;
		self.frame.attr('stroke', '#D8D8D8')
				  .attr('opacity', 1.);
	};

	self.frame_off = function() {
		output([self.id, 'frame_off'])
		self.framed = false;
		self.frame.attr('opacity', 0.);
	};

	self.object_on = function() {
		output([self.id, 'object_on'])
		self.framed = false;
		self.face.attr('opacity', 0.);
		self.obj.attr('opacity', 1.)
	};

	self.object_off = function() {
		output([self.id, 'object_off'])
		self.active = false;
		self.face.attr('opacity', 1.);
		self.obj.attr('opacity', 0.)
	};

	self.show = function(duration, callback) {
		//self.frame_inactive();
		self.object_on();
		to = setTimeout(function() {
			self.object_off();
			if (callback) callback();
		}, duration);
		timeouts.push(to);
	};

	self.study = function() {
		output([self.id, 'study'])
		self.object_on();

		switch (self.duration) {

			case 'none':
				break;
			case 'selfpaced':
				self.listen();
				break;
			default:
				to = setTimeout(function() {
					self.unstudy();
				}, self.duration);
				timeouts.push(to);
				break;
		};

	};

	self.unstudy = function(callback) {
		active_item = undefined;
		self.object_off();
		self.frame_inactive();
		self.episode['end_time'] = timestamp() - block_start_time;
		self.episode['duration'] = self.episode['end_time'] - self.episode['start_time'];
		output([self.id, 'episode', self.episode['start_time'], self.episode['end_time'], self.episode['duration']]);
		if (callback) callback();
	}

	self.listen = function() {

		self.disp.on(SELECT_EVENT, function() {

			// if not active, then proceed with study episode
			if (!self.active && active_item==undefined) {

				self.episode['start_time'] = timestamp() - block_start_time;

				self.active = true;
				if (self.blocking) active_item = self;

				self.frame_on();
				self.unlisten();
				to = setTimeout(function() {
					self.study();
				}, self.framedelay);
				timeouts.push(to);

			// otherwise only handle clicks if study
			// duration is self-paced
			} else if (self.id==active_item.id && self.duration=='selfpaced') {
				self.unstudy();
			};

		});

	};

	self.listen_yoked = function() {

		self.disp.on(SELECT_EVENT, function() {
			output([self.id, 'clicked']);
			self.unlisten();
		})

	}

	self.listen_test = function() {

		self.disp.on(SELECT_EVENT, function() {

			if (self.active) {
				self.active = false;
				self.frame_inactive();
			} else {
				self.active = true;
				self.frame_on();
			}

		});

	}


	self.unlisten = function() {
		self.disp.on(SELECT_EVENT, function() {});
	};


};


var StudyPhase = function(block) {
	var self = this,
		expose_ind;

	self.study_cond = (SEED) ? 'active' : STUDY_COND[block % 2];
	if (self.study_cond == 'yoked') {
		self.yevent_ind = -1;
		self.yevent_data = yokeddata[Math.floor(block/2)]['episodes'];
	}

	outpfx =['study', block, self.study_cond];
	output(['init']);
	output(['preexpose_ind', PREEXPOSE_IND[block]]);
	psiTurk.showPage('stage.html');
	self.stage = d3.select('#stagesvg');
	self.nrow = STUDY_NROWS;
	self.ncol = STUDY_NCOLS;
	self.images = [];
	self.items = [];
	self.stage_h = Number(self.stage.attr("height"));
	self.stage_w = self.stage_h; // square
	self.x_off = (Number(self.stage.attr("width")) - self.stage_w) / 2;
	self.item_w = self.stage_w / self.nrow;
	self.item_h = self.stage_h / self.ncol;

	for (var i=0; i<self.nrow; i++) {
		for (var j=0; j<self.ncol; j++) {
			var ind = i * self.nrow + j;

			self.items.push(new Item({'stage': self.stage,
									  'id': stimuli[block][ind],
									  'ind': ind,
									  'row': i,
									  'col': j,
									  'x_off': self.x_off,
									  'width': self.item_w,
									  'height': self.item_h,
									  'image': IMAGES[stimuli[block][ind]],
									  'framedelay': STUDY_FRAME_DELAY,
									  'duration': STUDY_DURATION,
									  'cond': self.study_cond
									 }))
		};
	};


	var expose_seq = PREEXPOSE_SEQ[PREEXPOSE_IND[block]];
	// change face color based on exposure group
	$.each(expose_seq, function(i, grp) {
		$.each(grp['ind'], function(j, ind) {
			self.items[ind].set_facecolor(PREEXPOSE_GRP_COL[i]);
		})
	})

	self.controls = new Controls(self.stage);

	self.expose_free = function() {
		output(['expose_begin']);

		$.each(self.items, function(i, item) {
			item.show(STUDY_EXPOSE_DURATION);
		})

		to = setTimeout(function() {
			self.study();
		}, STUDY_EXPOSE_DURATION);
		timeouts.push(to);

	};

	self.expose_snake = function() {
		output(['expose snaking']);

		if (expose_ind == (self.items.length - 1)) {
			self.study();
		} else {
			expose_ind += 1;
			self.items[expose_ind].show(STUDY_EXPOSE_DURATION,
									    self.expose_snake);
		}
	};

	self.expose_sequence = function() {

		$.each(self.items, function(i, item) {
			item.object_off();
			item.frame_off();
		})

		output(['expose sequence '+PREEXPOSE_IND[block]]);

		$.each(expose_seq, function(i, grp) {
			console.log(grp);
			$.each(grp['ind'], function(j, ind) {
				setTimeout(function() {
					self.items[ind].show(grp['duration'])
				}, grp['start']);
			})
		})

		setTimeout(self.study, STUDY_EXPOSE_DURATION);
	}

	self.study = function() {
		$.each(self.items, function(i, item) {
			item.object_off();
			item.frame_inactive();
		});
		if (self.study_cond == 'active') self.study_active();
		else self.study_yoked();
	};

	self.study_active = function() {
		output(['active_study_begin']);
		block_start_time = timestamp();

		$.each(self.items, function(i, item) {
			item.listen();
		})

		// start the timer
		to = setTimeout(function() {
			clear_timeouts();
			if (active_item) active_item.unstudy(exp.study);
			else exp.study();
		}, STUDY_BLOCK_TIME);
		timeouts.push(to);
	};

	self.study_yoked = function() {
		output(['yoked_study_begin']);
		block_start_time = timestamp();

		var event_ind = -1;
		for (i=0; i<self.yevent_data.length; i++) {

			episode = self.yevent_data[i];
			onset_t = episode['start_time'];

			if (onset_t < STUDY_BLOCK_TIME) {

				to = setTimeout(function() {

					event_ind += 1;
					item_ind = Number(self.yevent_data[event_ind]['ind']);

					output(['item-'+item_ind,
							'partner_episode',
						    self.yevent_data[event_ind]['start_time'],
						    self.yevent_data[event_ind]['end_time'],
							self.yevent_data[event_ind]['duration']
					]);

					item = self.items[item_ind];
					active_item = item;
					item.episode['start_time'] = timestamp() - block_start_time;
					item.duration = Number(self.yevent_data[event_ind]['duration']) - item.framedelay;
					item.frame_on();
					item.listen_yoked();
					setTimeout(function() {
						item.study();
					}, item.framedelay);

				}, self.yevent_data[i]['start_time']);
				timeouts.push(to);

			};
		};

		// start the timer
		to = setTimeout(function() {
			clear_timeouts();
			if (active_item) active_item.unstudy(exp.study);
			else exp.study();
		}, STUDY_BLOCK_TIME);
		timeouts.push(to);

	};




	self.begin = function() {

		to = setTimeout(function() {
			switch (STUDY_EXPOSE) {
				case 'none':
					self.study();
					break;
				case 'free':
					self.expose_free();
					break;
				case 'snake':
					expose_ind = -1;
					self.expose_snake();
					break;
				case 'sequence':
					self.expose_sequence();
			}
		}, STUDY_INIT_DELAY);
		timeouts.push(to);

	};

	self.controls.start.on('click', function(e) {
		output(['start']);
		self.controls.start.on('click', function() {});
		self.controls.start.remove();
		self.begin();
	});
};




var FamiliarizationStudyPhase = function(block) {
	var self = this,
		expose_ind;

	self.study_cond = ['active', 'yoked', 'active', 'yoked'][block];
	outpfx =['familiarization-study', block, self.study_cond];
	output(['init']);

	psiTurk.showPage('stage.html');
	self.stage = d3.select('#stagesvg');
	self.nrow = FAM_NROWS;
	self.ncol = FAM_NCOLS;

	self.items = [];
	//self.stage_w = Number(self.stage.attr("width"));
	//self.stage_h = Number(self.stage.attr("height"));
	self.stage_h = 450;
	self.stage_w = self.stage_h; // square
	self.item_w = self.stage_w / FAM_NROWS;
	self.item_h = self.stage_h / FAM_NCOLS;
	//self.x_off = (Number(self.stage.attr("width")) - self.stage_w) / 2 + self.item_w;
	self.x_off = (Number(self.stage.attr("width")) - self.stage_w) / 2;
	self.y_off = (Number(self.stage.attr("height")) - self.stage_h) / 2;

	var n_items = FAM_NROWS*FAM_NCOLS;
	self.stims = shuffle(famitems.slice(block*n_items, block*n_items+n_items));

	for (var i=0; i<self.nrow; i++) {
		for (var j=0; j<self.ncol; j++) {
			var ind = i * self.nrow + j;

			self.items.push(new Item({'stage': self.stage,
									  'id': self.stims[ind],
									  'ind': ind,
									  'row': i,
									  'col': j,
									  'x_off': self.x_off,
									  'y_off': self.y_off,
									  'width': self.item_w,
									  'height': self.item_h,
									  'image': IMAGES[self.stims[ind]],
									  'framedelay': STUDY_FRAME_DELAY,
									  'duration': STUDY_DURATION
									 }))
		};
	};

	var expose_seq = PREEXPOSE_SEQ_FAM[block];
	// change face color based on exposure group
	$.each(expose_seq, function(i, grp) {
		$.each(grp['ind'], function(j, ind) {
			self.items[ind].set_facecolor(PREEXPOSE_GRP_COL[i]);
		})
	})


	self.controls = new Controls(self.stage);

	self.expose_free = function() {
		output(['expose_begin']);

		$.each(self.items, function(i, item) {
			item.show(FAM_EXPOSE_DURATION);
		})

		to = setTimeout(function() {
			self.study();
		}, FAM_EXPOSE_DURATION);
		timeouts.push(to);

	};

	self.expose_sequence = function() {

		$.each(self.items, function(i, item) {
			item.object_off();
			item.frame_off();
		})

		output(['expose sequence '+PREEXPOSE_IND[block]]);

		$.each(expose_seq, function(i, grp) {
			$.each(grp['ind'], function(j, ind) {
				setTimeout(function() {
					self.items[ind].show(grp['duration'])
				}, grp['start']);
			})
		})

		setTimeout(self.study, FAM_EXPOSE_DURATION);
	}

	self.study_active = function() {
		output(['active_study_begin']);
		block_start_time = timestamp();

		$.each(self.items, function(i, item) {
			item.listen();
		})

		// start the timer
		to = setTimeout(function() {
			clear_timeouts();
			exp.view = new FamiliarizationTestPhase(block);
		}, FAM_STUDY_BLOCK_TIME);
		timeouts.push(to);
	};

	self.study_yoked = function() {
		output(['yoked_study_begin']);
		block_start_time = timestamp();

		self.yevent_data = [{'ind': 0,
							 'start_time': 2000,
						     'end_time': 4000,
						     'duration': 2000}];
		for (i=1; i<50; i++) {
			var start = Math.floor(self.yevent_data[i-1]['end_time'] + 500 + Math.random()*1500);
			var end = Math.floor(start + STUDY_FRAME_DELAY + 1000 + Math.random()*3000);

			self.yevent_data.push({'ind': sample_range(self.items.length)[0],
								   'start_time': start,
						           'end_time': end,
						           'duration': end - start})
		};


		var event_ind = -1;
		for (i=0; i<self.yevent_data.length; i++) {

			episode = self.yevent_data[i];
			onset_t = episode['start_time'];

			if (onset_t < FAM_STUDY_BLOCK_TIME) {

				to = setTimeout(function() {

					event_ind += 1;
					output(['simulated_partner_episode',
						    self.yevent_data[event_ind]['start_time'],
						    self.yevent_data[event_ind]['end_time'],
							self.yevent_data[event_ind]['duration']
					]);

					item_ind = Number(self.yevent_data[event_ind]['ind']);
					item = self.items[item_ind];
					item.episode['start_time'] = timestamp() - block_start_time;
					item.duration = Number(self.yevent_data[event_ind]['duration']) - item.framedelay;
					item.frame_on();
					setTimeout(function() {
						item.study();
					}, item.framedelay);

				}, self.yevent_data[i]['start_time']);
				timeouts.push(to);
			};
		};

		// start the timer
		to = setTimeout(function() {
			clear_timeouts();
			exp.view = new FamiliarizationTestPhase(block);
		}, FAM_STUDY_BLOCK_TIME);
		timeouts.push(to);

	};

	self.study = function() {
		$.each(self.items, function(i, item) {
			item.frame_inactive();
		});
		if (self.study_cond == 'active') self.study_active();
		else self.study_yoked();
	};


	self.begin = function() {

		to = setTimeout(function() {
			switch (STUDY_EXPOSE) {
				case 'none':
					self.study();
					break;
				case 'free':
					self.expose_free();
					break;
				case 'snake':
					expose_ind = -1;
					self.expose_snake();
					break;
				case 'sequence':
					self.expose_sequence();
					break;
			}
		}, STUDY_INIT_DELAY);
		timeouts.push(to);

	};

	self.controls.start.on('click', function(e) {
		output(['start']);
		self.controls.start.on('click', function(e) {});
		self.controls.start.remove();
		self.begin();
	});
};


var FamiliarizationTestPhase = function(block) {
	var self = this,
		expose_ind;

	outpfx =['familiarization-test', block];
	output(['init']);

	psiTurk.showPage('stage.html');
	self.stage = d3.select('#stagesvg');
	self.nrow = FAM_NROWS;
	self.ncol = FAM_NCOLS;
	self.items = [];
	//self.stage_w = Number(self.stage.attr("width"));
	self.stage_h = Number(self.stage.attr("height"));
	self.stage_w = self.stage_h; // square
	self.item_w = self.stage_w / STUDY_NROWS;
	self.item_h = self.stage_h / STUDY_NCOLS;
	self.x_off = (Number(self.stage.attr("width")) - self.stage_w) / 2 + self.item_w;
	self.y_off = self.item_h;

	self.stims = shuffle(famitems.slice(block*6, block*6+6));

	for (var i=0; i<self.nrow; i++) {
		for (var j=0; j<self.ncol; j++) {
			var ind = i * self.nrow + j;

			self.items.push(new Item({'stage': self.stage,
									  'id': self.stims[ind],
									  'ind': ind,
									  'row': i,
									  'col': j,
									  'x_off': self.x_off,
									  'y_off': self.y_off,
									  'width': self.item_w,
									  'height': self.item_h,
									  'image': IMAGES[self.stims[ind]],
									  'framedelay': STUDY_FRAME_DELAY,
									  'duration': STUDY_DURATION
									 }))

		};
	};

	self.controls = new Controls(self.stage);

	btn_size = self.item_w * .7;

	self.done_btn = self.stage.append('g')
							  .attr('id', 'done-btn')
							  .attr('opacity', 0.);

    var btn_x = 1.6 * (self.x_off-self.item_w) + self.stage_h - btn_size/2;
	var btn_y = self.stage_h / 2 - btn_size/2 + 20

	self.done_btn.btn_frame = self.done_btn.append('rect')
							  .attr('x', btn_x - 13)
							  .attr('y', btn_y - 20)
							  .attr('width', btn_size)
							  .attr('height', btn_size)
							  .attr('rx', 15)
							  .attr('ry', 15)
							  .attr('fill', 'white')
							  .attr('stroke-width', 4)
							  .attr('stroke', '#D8D8D8');

	self.done_btn.btn = self.done_btn.append('path')
						  .attr('d', "M6.41 0l-.69.72-2.78 2.78-.81-.78-.72-.72-1.41 1.41.72.72 1.5 1.5.69.72.72-.72 3.5-3.5.72-.72-1.44-1.41z")
						  .attr('width', btn_size/2)
						  .attr('height', btn_size/2)
						  .attr('stroke', '#D8D8D8')
						  .attr('stroke-width', .4)
						  .attr('fill', 'white')
						  .attr("transform", "translate("+btn_x+","+btn_y+") scale(10)")


	self.test = function() {
		self.done_btn.attr('opacity', 1.)
		$.each(self.items, function(i, item) {
			item.object_on();
			item.frame_inactive();
			item.listen_test();
		})

		self.done_btn.on(SELECT_EVENT, function() {
			output(['clicked_done'])
			self.done_btn.btn.attr('stroke', 'green');
			self.done_btn.btn.attr('fill', 'green');
			self.done_btn.btn_frame.attr('stroke', 'green')
			setTimeout(exp.chooser, 300);
		});
	}

	self.begin = function() {
		setTimeout(function() {
			self.test();
		}, TEST_INIT_DELAY);
	};

	self.controls.start.on('click', function(e) {
		output(['start']);
		self.controls.start.on('click', function() {});
		self.controls.start.remove();
		self.begin();
	});

};



var TestPhase = function(block) {
	var self = this,
		expose_ind;

	outpfx =['test', block];
	output(['init']);

	psiTurk.showPage('stage.html');
	self.stage = d3.select('#stagesvg');
	self.nrow = TEST_NROWS;
	self.ncol = TEST_NCOLS;
	self.items = [];
	//self.stage_w = Number(self.stage.attr("width"));
	self.stage_h = Number(self.stage.attr("height"));
	self.stage_w = self.stage_h; // square
	self.item_w = self.stage_w / self.nrow;
	self.item_h = self.stage_h / self.ncol;
	self.x_off = (Number(self.stage.attr("width")) - self.stage_w) / 2;

	self.recognized = [];
	self.recall_ind = -1;
	self.recall_item;

	for (var i=0; i<self.nrow; i++) {
		for (var j=0; j<self.ncol; j++) {
			var ind = i * self.nrow + j;

			var ti = _.filter(testitems, function(it) {
				return it['test_block']==block && it['test_loc']==ind;
			});
			if (ti.length==0) {
				console.log('didnt find test item!');
			} else {
				ti = ti[0];
			}

			// handle retest IDs -- if retest, use the
			// new set of foils
			if (String(ti['stimid']).indexOf('-retest') > -1) {
				var loc = Number(ti['stimid'].slice(0, ti['stimid'].indexOf('-retest')));
				var img = IMAGES_RETEST_FOILS[loc];
			} else {
				var img = IMAGES[ti['stimid']];
			}

			self.items.push(new Item({'stage': self.stage,
									  'id': ti['stimid'],
									  'ind': ind,
									  'row': i,
									  'col': j,
									  'x_off': self.x_off,
									  'width': self.item_w,
									  'height': self.item_h,
									  'image': img,
									  'framedelay': TEST_FRAME_DELAY,
									  'duration': TEST_DURATION,
									  'blocking': false,
									  'cond': ti['cond'],
									  'distance': ti['distance']
									 }))
		};
	};

	self.controls = new Controls(self.stage);

	btn_size = self.item_w * .7;
	self.done_btn = self.stage.append('g')
							  .attr('id', 'done-btn')
							  .attr('opacity', 0.);

    var btn_x = 1.6 * self.x_off + self.stage_h - btn_size/2;
	var btn_y = self.stage_h / 2 - btn_size/2 + 20

	self.done_btn.btn_frame = self.done_btn.append('rect')
							  .attr('x', btn_x - 13)
							  .attr('y', btn_y - 20)
							  .attr('width', btn_size)
							  .attr('height', btn_size)
							  .attr('rx', 15)
							  .attr('ry', 15)
							  .attr('fill', 'white')
							  .attr('stroke-width', 4)
							  .attr('stroke', '#D8D8D8');

	self.done_btn.btn = self.done_btn.append('path')
						  .attr('d', "M6.41 0l-.69.72-2.78 2.78-.81-.78-.72-.72-1.41 1.41.72.72 1.5 1.5.69.72.72-.72 3.5-3.5.72-.72-1.44-1.41z")
						  .attr('width', btn_size/2)
						  .attr('height', btn_size/2)
						  .attr('stroke', '#D8D8D8')
						  .attr('stroke-width', .4)
						  .attr('fill', 'white')
						  .attr("transform", "translate("+btn_x+","+btn_y+") scale(10)")


	self.same_btn = self.stage.append('g')
							  .attr('id', 'same-btn')
							  .attr('opacity', 0.);

    var btn_x = 1.6 * self.x_off + self.stage_h - btn_size/2;
	var btn_y = self.stage_h / 2 - btn_size/2 - 120

	self.same_btn.btn_frame = self.same_btn.append('rect')
							  .attr('x', btn_x - 13)
							  .attr('y', btn_y - 20)
							  .attr('width', btn_size)
							  .attr('height', btn_size)
							  .attr('rx', 15)
							  .attr('ry', 15)
							  .attr('fill', 'white')
							  .attr('stroke-width', 4)
							  .attr('stroke', '#D8D8D8');

	self.same_btn.btn = self.same_btn.append('path')
						  .attr('d', "M6.41 0l-.69.72-2.78 2.78-.81-.78-.72-.72-1.41 1.41.72.72 1.5 1.5.69.72.72-.72 3.5-3.5.72-.72-1.44-1.41z")
						  .attr('width', btn_size/2)
						  .attr('height', btn_size/2)
						  .attr('stroke', '#D8D8D8')
						  .attr('stroke-width', .4)
						  .attr('fill', 'white')
						  .attr("transform", "translate("+btn_x+","+btn_y+") scale(10)")

	self.diff_btn = self.stage.append('g')
							  .attr('id', 'diff-btn')
							  .attr('opacity', 0.);

    var btn_x = 1.6 * self.x_off + self.stage_h - btn_size/2;
	var btn_y = self.stage_h / 2 - btn_size/2 + 160

	self.diff_btn.btn_frame = self.diff_btn.append('rect')
							  .attr('x', btn_x - 13)
							  .attr('y', btn_y - 20)
							  .attr('width', btn_size)
							  .attr('height', btn_size)
							  .attr('rx', 15)
							  .attr('ry', 15)
							  .attr('fill', 'white')
							  .attr('stroke-width', 4)
							  .attr('stroke', '#D8D8D8');

	self.diff_btn.btn = self.diff_btn.append('path')
						  .attr('d', "M1.41 0l-1.41 1.41.72.72 1.78 1.81-1.78 1.78-.72.69 1.41 1.44.72-.72 1.81-1.81 1.78 1.81.69.72 1.44-1.44-.72-.69-1.81-1.78 1.81-1.81.72-.72-1.44-1.41-.69.72-1.78 1.78-1.81-1.78-.72-.72z")
						  .attr('width', btn_size/2)
						  .attr('height', btn_size/2)
						  .attr('stroke', '#D8D8D8')
						  .attr('stroke-width', .4)
						  .attr('fill', 'white')
						  .attr("transform", "translate("+btn_x+","+(btn_y-5)+") scale(10)")


	$('#continueModal').modal({'show': false});
	$('#modalCloseButton').on('click', function(e) {
		self.done_btn.btn.attr('stroke', '#D8D8D8')
						 .attr('fill', 'white');
		self.done_btn.btn_frame.attr('stroke', '#D8D8D8')
	})
	$('#continueModal').on('hidden.bs.modal', function (e) {
		self.done_btn.btn.attr('stroke', '#D8D8D8')
						 .attr('fill', 'white');
		self.done_btn.btn_frame.attr('stroke', '#D8D8D8')
	})


	self.test = function() {
		output(['test']);
		self.done_btn.attr('opacity', 1.)

		$('#modalContinueButton').on('click', function(e) {

			// record responses
			$.each(self.items, function(i, item) {

				item.unlisten();

				var ind = item['ind'];
				var cond = item['cond'];
				var resp = (item.active) ? 'old' : 'new';
				var correct = (cond=='active' && resp == 'old') ||
							  (cond=='yoked' && resp == 'old') ||
							  (cond=='new' && resp == 'new');

				test_accuracy.push([cond, resp, correct]);

				output([i,
						item['stimid'],
						(cond=='active' || cond=='yoked'),
						cond,
						resp,
						correct
						])


				// inactivate (but keep) selected items
				if (item.active) {
					item.active = false;
					item.frame_inactive();
					self.recognized.push(item);
					//item.listen_test();
				}
				item.object_off();

			});

			self.spatial_recall_test();
		})

		$.each(self.items, function(i, item) {
			item.object_on();
			item.frame_inactive();
			item.listen_test();
		})

		self.done_btn.on('click', function() {
			output(['clicked_done'])

			self.done_btn.btn.attr('stroke', 'green');
			self.done_btn.btn.attr('fill', 'green');
			self.done_btn.btn_frame.attr('stroke', 'green')

			setTimeout(function() {
				$('#continueModal').modal('show');
			}, 300);

		});
	}


	self.spatial_recall_test = function() {

		$('#modalContinueButton').unbind('click');

		self.recall_ind += 1;
		if (self.recall_ind==self.recognized.length) {
			self.finish();
		} else {
			self.done_btn.on('click', function() {});
			self.done_btn.attr('opacity', 0.)
			self.same_btn.attr('opacity', 1.)
			self.diff_btn.attr('opacity', 1.)

			self.same_btn.btn.attr('stroke', '#D8D8D8');
			self.same_btn.btn.attr('fill', 'white');
			self.same_btn.btn_frame.attr('stroke', '#D8D8D8');

			self.diff_btn.btn.attr('stroke', '#D8D8D8');
			self.diff_btn.btn.attr('fill', 'white');
			self.diff_btn.btn_frame.attr('stroke', '#D8D8D8');

			self.recall_item = self.recognized[self.recall_ind];

			output(['spatial_recall', self.recall_item.id]);
			$('#continueModal').modal('hide');


			self.same_btn.on('click', function(e) {
				self.same_btn.btn.attr('stroke', 'green');
				self.same_btn.btn.attr('fill', 'green');
				self.same_btn.btn_frame.attr('stroke', 'green');

				self.recall_item.object_off();

				// record response
				var ind = self.recall_item['ind'];
				var cond = self.recall_item['cond'];
				var resp = 'same';

				output([i,
						self.recall_item['stimid'],
						(cond=='active' || cond=='yoked'),
						cond,
						self.recall_item['distance'],
						resp,
						])

				setTimeout(function() {
					self.spatial_recall_test();
				}, 200);

			})

			self.diff_btn.on('click', function(e) {
				self.diff_btn.btn.attr('stroke', 'red');
				self.diff_btn.btn.attr('fill', 'red');
				self.diff_btn.btn_frame.attr('stroke', 'red');

				self.recall_item.object_off();

				// record response
				var ind = self.recall_item['ind'];
				var cond = self.recall_item['cond'];
				var resp = 'different';

				output([i,
						self.recall_item['stimid'],
						(cond=='active' || cond=='yoked'),
						cond,
						self.recall_item['distance'],
						resp,
						])

				setTimeout(function() {
					self.spatial_recall_test();
				}, 200);

			})

			self.recall_item.object_on();

		}

	};

	self.finish = function() {
		output(['finish']);
		setTimeout(exp.test, 300);
	};


	self.begin = function() {
		setTimeout(function() {
			self.test();
		}, TEST_INIT_DELAY);
	};

	output(['start']);
	self.controls.start.remove();
	self.begin();

};


var PostQuestionnaire = function() {
	$('#main').html('');
	var self = this;
	psiTurk.showPage('postquestionnaire.html');
	//self.div = $('#container-instructions');
	//var t = '';
	//self.div.append(instruction_text_element(t));

	record_responses = function() {

		psiTurk.recordTrialData(['postquestionnaire', 'submit']);

		$('textarea').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
		//$('select').each( function(i, val) {
		//	psiTurk.recordUnstructuredData(this.id, this.value);
		//});

		Summary();
	};

	$("#btn-submit").click(function() {
		record_responses();
	});

};


var Summary = function() {
	var self = this;

	outpfx =['summary'];
	active = _.filter(test_accuracy, function(r) { return r[0]=='active'; });
	active_correct = _.filter(active, function(r) { return r[2]; });

	yoked = _.filter(test_accuracy, function(r) { return r[0]=='yoked'; });
	yoked_correct = _.filter(yoked, function(r) { return r[2]; });

	novel = _.filter(test_accuracy, function(r) { return r[0]=='new'; });
	novel_correct = _.filter(novel, function(r) { return r[2]; });

	output(['hits_active', active_correct.length]);
	output(['misses_active', active.length - active_correct.length]);
	output(['hits_yoked', yoked_correct.length]);
	output(['misses_yoked', yoked.length - yoked_correct.length]);
	output(['cr', novel_correct.length]);
	output(['fa', novel.length - novel_correct.length]);
	output(['COMPLETE']);
	psiTurk.saveData();

	setTimeout(function() {
		psiTurk.showPage('summary.html');
		$('#partid').html(ids[0]);
		$('#acc_active').html(active_correct.length + '/' + active.length);
		$('#acc_yoked').html(yoked_correct.length + '/' + yoked.length);
		$('#acc_novel').html(novel_correct.length + '/' + novel.length);

		$('#check-button').hide();
		//$('#check-button').on('click', function(e) {
		//	Exit();
		//});
	}, 1000);

};


var Exit = function() {
	psiTurk.completeHIT();
};


var Experiment = function() {
	var self = this;
	self.famblock = -1;
	self.studyblock = -1;
	self.testblock = -1;

	output(['participantid', ids[0]]);
	output(['partnerid', ids[1]]);
	output(['seed', SEED]);
	output(['preexpose_ind', PREEXPOSE_IND]);

	self.familiarization = function() {
		self.famblock += 1;

		// if completed N_FAM_BLOCKS, cycle around to beginning
		if (self.famblock == N_FAM_BLOCKS) {
			self.famblock = 0;
		}
		self.view = new FamiliarizationStudyPhase(self.famblock);
	};

	self.study = function() {
		if (SAVEDATA) psiTurk.saveData();
		self.studyblock += 1;

		if (self.studyblock >= N_STUDY_BLOCKS) {
			self.chooser();
		} else {
			self.view = new StudyPhase(self.studyblock);
		}

	};

	self.test = function() {
		if (SAVEDATA) psiTurk.saveData();
		self.testblock += 1;
		if (self.testblock >= N_TEST_BLOCKS) {
			if (RETEST) {
				Summary();
			} else {
				self.chooser();
			};
		} else {
			self.view = new TestPhase(self.testblock);
		}

	};

	self.chooser = function() {
		outpfx = [];
		output(['chooser']);
		psiTurk.showPage('chooser.html');

		if (RETEST) {
			$('#choose-setup').css('display', 'none');
			$('#choose-fam').css('display', 'none');
			$('#choose-study').css('display', 'none');
			$('#choose-finish').css('display', 'none');
		} else {
			$('#choose-setup').on('click', function() {
				window.location = '/setup';
			});
			$('#choose-fam').on('click', function() {
				self.familiarization();
			});
			$('#choose-study').on('click', function() {
				self.study();
			});
			$('#choose-finish').on('click', function() {
				self.view= new PostQuestionnaire();
			});
		}

		$('#choose-test').on('click', function() {
			self.test();
		})


	};

	// STUDY SETUP

	// study data from yoked partner
	if (partner_result.length != []) {
		$.each(partner_result.partner_data, function(i, d) {
			var td = d.trialdata;
			if (td[0] == "study") {
				if (td[3] == "item" || td[4] == "episode" || td[3]== "preexpose_ind") {
					partnerdata.push(td);
				};
			}
		})
	}

	yokeddata = [];
	yokeditems = [];

	if (!SEED) {

		for (var b=0; b<4; b++) {
			blockdata = _.filter(partnerdata, function(d) { return d[1] == b; })
			itemdata = _.filter(blockdata, function(d) { return d[3] == 'item' })
			episodedata = _.filter(blockdata, function(d) { return d[4] == 'episode' })

			var ei = _.filter(blockdata, function(d) { return d[3] == 'preexpose_ind'})[0][4];

			yokeddata[b] = {'condition': blockdata[0][2],
							'expose_ind': ei,
							'items': [],
							'episodes': []};

			$.each(itemdata, function(i, d) {
				stimid = Number(d[4].split('=')[1]);
				ind = Number(d[5].split('=')[1]);
				yokeddata[b]['items'][ind] = stimid;
			})

			$.each(episodedata, function(i, d) {
				yokeddata[b]['episodes'].push(
					{'ind': d[3].split('-')[1],
					 'start_time': d[5],
					 'end_time': d[6],
					 'duration': d[7]}
				);
			})

		}

		// randomize the order in which yoked blocks are seen
		yokeddata = shuffle(_.filter(yokeddata, function(d) { return d['condition'] == 'active'; })).sample(2);
		$.each(yokeddata, function(i, d) {
			yokeditems = yokeditems.concat(d['items']);
		})

		// keep same pre-exposure sequence for yoked blocks
		var preexpose_ind_yoked = [yokeddata[0]['expose_ind'], yokeddata[1]['expose_ind']];
		var preexpose_ind_active = _.difference([0, 1, 2, 3], preexpose_ind_yoked);
		PREEXPOSE_IND = [preexpose_ind_active[0],
						 preexpose_ind_yoked[0],
						 preexpose_ind_active[1],
						 preexpose_ind_yoked[1]];

	};

	remaining = _.difference(range(IMAGES.length), yokeditems);

	// reserve some items for familiarization
	famitems = range(24);
	remaining = _.difference(remaining, famitems);


	// setup stimuli for each study round
	stimuli = [];
	activeitems = [];
	yi = 0;
	for (var b=0; b<4; b++) {
		var c = SEED ? 'active' : STUDY_COND[b % 2];
		if (c == 'active') {
			samp = shuffle(remaining.sample(ITEMS_PER_STUDY_ROUND));
			stimuli.push(samp);
			activeitems = activeitems.concat(samp);
			remaining = _.difference(remaining, samp);
		} else {
			stimuli.push(yokeddata[yi]['items'])
			yi = yi + 1;
		}
	}


	// TEST ITEM SETUP
	testitems = [];

	// randomize the number of old/new items in
	// each test block
	n_active = [];
	n_yoked = [];
	for (var i=0; i<N_TEST_BLOCKS/2; i++) {

		if (SEED && !RETEST) {
			var n = randrange(0, 16);
			n_active.push(n);
			n_active.push(16 - n);

			n_yoked.push(0);
			n_yoked.push(0);

		} else {

			var n = randrange(1, 8);
			n_active.push(n);
			n_active.push(8 - n);

			var n = randrange(1, 8);
			n_yoked.push(n);
			n_yoked.push(8 - n);

		}

	}
	n_active = shuffle(n_active);
	n_yoked = shuffle(n_yoked);
	n_novel = [];


	// find the corresponding indices
	ind_active = [0];
	ind_yoked = [0];
	ind_novel = [0];
	for (var i=0; i<N_TEST_BLOCKS; i++) {
		n_novel.push(16 - n_active[i] - n_yoked[i]);

		if (i > 0) {
			ind_active.push(ind_active[i-1] + n_active[i-1]);
			ind_yoked.push(ind_yoked[i-1] + n_yoked[i-1]);
			ind_novel.push(ind_novel[i-1] + n_novel[i-1]);
		}

	};


	if (RETEST) {

		_.each(prev_test_data, function(rec) {
			item = rec['trialdata'];
			if (item[0]=='study') {
				block = item[1];
				id = item[4].split('=')[1];
				ind = item[5].split('=')[1];
				stimuli[block][ind] = Number(id);
			}
		});

		activeitems = _.filter(prev_test_data, function(rec) {
			item = rec['trialdata'];
			cond = item[8].split('=')[1];
			return item[0]=='test' && cond=='active';
		});
		activeitems = _.map(activeitems, function(it) {
			return Number(it['trialdata'][3].split('=')[1]);
		})

		yokeditems = _.filter(prev_test_data, function(rec) {
			item = rec['trialdata'];
			cond = item[8].split('=')[1];
			return item[0]=='test' && cond=='yoked';
		});
		yokeditems = _.map(yokeditems, function(it) {
			return Number(it['trialdata'][3].split('=')[1]);
		})

		remaining = _.map(_.range(IMAGES_RETEST_FOILS.length), function(n) { return n + '-retest'; })


		if (ids[0]==="1022-retest") {
			console.log("1022! switching to original test set");

			activeitems = _.filter(prev_test_data, function(rec) {
				item = rec['trialdata'];
				cond = item[2];
				return item[0]=='study' && cond=='active';
			});
			activeitems = _.map(activeitems, function(it) {
				return Number(it['trialdata'][4].split('=')[1]);
			})

			yokeditems = _.filter(prev_test_data, function(rec) {
				item = rec['trialdata'];
				cond = item[2];
				return item[0]=='study' && cond=='yoked';
			});
			yokeditems = _.map(yokeditems, function(it) {
				return Number(it['trialdata'][4].split('=')[1]);
			})

			// if subject is 1022, then use the original foils for the retest
			remaining = _.difference(_.difference(range(IMAGES.length), yokeditems), activeitems);
			remaining = _.difference(remaining, famitems);
		}

	}

	function studied_location(item) {
		return _.filter(_.map(range(4), function(i) {
							return stimuli[i].indexOf(item); }),
							function(x) { return x > -1; })[0];
	}


	TWOAWAY = {};
	for (var i=0; i<16; i++) {

		TWOAWAY[i] = _.filter(_.range(16), function(j) {
			return Math.sqrt(Math.pow(Math.floor(i/4) - Math.floor(j/4), 2) + Math.pow(Math.floor(i%4) - Math.floor(j%4), 2)) == 2.;
		})

	}

	var iterations = 0;
	do {
		iterations += 1;
		assigned_items = [];
		failures = 0;

		// randomize the order of items for test
		activeitems = shuffle(activeitems);
		yokeditems = shuffle(yokeditems);
		remaining = shuffle(remaining);


		active_distance = shuffle(_.map(_.range(activeitems.length),
								  function(i) { return 2*(i >= activeitems.length/2); }));

		yoked_distance = shuffle(_.map(_.range(yokeditems.length),
								  function(i) { return 2*(i >= yokeditems.length/2); }));

		D = [];
		for (var i=0; i<activeitems.length; i++) {
			D.push({'stimid': activeitems[i],
					'studied_loc': studied_location(activeitems[i]),
					'studied': true,
					'cond': 'active',
					'distance': active_distance[i]})
		};
		for (var i=0; i<yokeditems.length; i++) {
			D.push({'stimid': yokeditems[i],
					'studied_loc': studied_location(yokeditems[i]),
					'studied': true,
					'cond': 'yoked',
					'distance': yoked_distance[i]})
		};

		added_active = [0, 0, 0, 0, 0, 0, 0, 0];
		added_yoked = [0, 0, 0, 0, 0, 0, 0, 0];
		B = _.map(_.range(8), function(x) { return _.range(16); });

		// active items, same location as studied
		it = _.filter(D, function(x) { return x['distance']==0 && x['cond']=='active'; });
		for (var i=0; i<it.length; i++) {

			var item = it[i];

			// assign to a block
			arr = _.filter(_.range(8),
						   function(b) {
							   return (B[b].indexOf(item['studied_loc'])!=-1) &&
									  added_active[b] < n_active[b];
						   });
			if (arr.length==0) {
				failures += 1;
			} else {
				assigned_block = arr.sample(1)[0];

				// increment number of active items in this block
				added_active[assigned_block] += 1;

				// remove location from available set
				B[assigned_block].splice(B[assigned_block].indexOf(item['studied_loc']), 1);

				item['test_block'] = assigned_block;
				item['test_loc'] = item['studied_loc'];

				assigned_items.push(item);
			};
		}

		// yoked items, same location as studied
		it = _.filter(D, function(x) { return x['distance']==0 && x['cond']=='yoked'; });
		for (var i=0; i<it.length; i++) {

			var item = it[i];

			// assign to a block
			arr = _.filter(_.range(8),
						   function(b) {
							   return (B[b].indexOf(item['studied_loc'])!=-1) &&
									  added_yoked[b] < n_yoked[b];
						   });
			if (arr.length==0) {
				failures += 1;
			} else {
				assigned_block = arr.sample(1)[0];

				// increment number of active items in this block
				added_yoked[assigned_block] += 1;

				// remove location from available set
				B[assigned_block].splice(B[assigned_block].indexOf(item['studied_loc']), 1);

				item['test_block'] = assigned_block;
				item['test_loc'] = item['studied_loc'];

				assigned_items.push(item);
			}
		}


		// active items, different location
		it = _.filter(D, function(x) { return x['distance']==2 && x['cond']=='active'; });
		for (var i=0; i<it.length; i++) {

			var item = it[i];

			// find set of locations that are 2 away
			cand_loc = TWOAWAY[item['studied_loc']];

			cand = [];
			for (var b=0; b<8; b++) {
				for (var j=0; j<cand_loc.length; j++) {
					if ((B[b].indexOf(cand_loc[j])!=-1) &&
						added_active[b] < n_active[b]) {
						cand.push([b, cand_loc[j]]);
					}
				}
			}

			if (cand.length==0) {
				//console.log('no candidate locations!');
				failures += 1;
			} else {

				chosen = cand.sample(1)[0];
				assigned_block = chosen[0];
				assigned_loc = chosen[1];

				// increment number of active items in this block
				added_active[assigned_block] += 1;

				// remove location from available set
				B[assigned_block].splice(B[assigned_block].indexOf(assigned_loc), 1);

				item['test_block'] = assigned_block;
				item['test_loc'] = assigned_loc;

				assigned_items.push(item);
			};
		}


		// yoked items, different location
		it = _.filter(D, function(x) { return x['distance']==2 && x['cond']=='yoked'; });
		for (var i=0; i<it.length; i++) {

			var item = it[i];

			// find set of locations that are 2 away
			cand_loc = TWOAWAY[item['studied_loc']];

			cand = [];
			for (var b=0; b<8; b++) {
				for (var j=0; j<cand_loc.length; j++) {
					if ((B[b].indexOf(cand_loc[j])!=-1) &&
						added_yoked[b] < n_yoked[b]) {
						cand.push([b, cand_loc[j]]);
					}
				}
			}

			if (cand.length==0) {
				//console.log('no candidate locations!');
				failures += 1;
			} else {

				chosen = cand.sample(1)[0];
				assigned_block = chosen[0];
				assigned_loc = chosen[1];

				// increment number of active items in this block
				added_yoked[assigned_block] += 1;

				// remove location from available set
				B[assigned_block].splice(B[assigned_block].indexOf(assigned_loc), 1);

				item['test_block'] = assigned_block;
				item['test_loc'] = assigned_loc;

				assigned_items.push(item);
			};
		}

	}
	while (iterations < 1000 && failures > 0);

	if (iterations==1000) {
		alert('problem! please reload');
	} else {

		// how many locations are left?
		total = _.map(B, function(arr) { return arr.length; }).reduce(function(a, b) { return a + b; })

		// assign foils to remaining locations
		cand = [];
		for (var b=0; b<8; b++) {
			for (var j=0; j<B[b].length; j++) {
				cand.push([b, B[b][j]]);
			}
		}
		cand = shuffle(cand);

		for (var i=0; i<remaining.length; i++) {
			item = {'stimid': remaining[i],
					'studied': false,
					'cond': 'new',
					'test_block': cand[i][0],
					'test_loc': cand[i][1]};
			assigned_items.push(item);
		}

		testitems = assigned_items;

		self.chooser();
	}
};

// vi: noexpandtab tabstop=4 shiftwidth=4
