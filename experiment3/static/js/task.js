var	SEED,
	FAM_NROWS = 2,
	FAM_NCOLS = 2,
	FAM_INIT_DELAY = 1000,
	FAM_STUDY_BLOCK_TIME = 60000 * 10,
	N_FAM_BLOCKS = 2,
	FAM_EXPOSE_DURATION = 3000,
	STUDY_NROWS = 4,
	STUDY_NCOLS = 4,
	N_STUDY_BLOCKS = 4,
	ITEMS_PER_STUDY_ROUND = STUDY_NCOLS * STUDY_NCOLS,
	TOTAL_STUDY_ITEMS = N_STUDY_BLOCKS * ITEMS_PER_STUDY_ROUND,
	STUDY_FRAME_DELAY = 500,
	STUDY_DURATION = 'selfpaced', // 'none' | 'selfpaced' | fixed t
	STUDY_BLOCK_TIME = 90000,
	STUDY_INIT_DELAY = 1000,
	STUDY_EXPOSE = 'none', // 'none' | 'free' | 'snake' | 'sequence'
	STUDY_EXPOSE_DURATION = 3000, // how long images are shown at beginning of study
	STUDY_COND = ['active', 'yoked'],
	N_TEST_BLOCKS = 1,
	TEST_INIT_DELAY = 200,
	TEST_DURATION = 'none',
	TEST_FRAME_DELAY = 0,
	TEST_SETS = null,
	RECORD_EMAIL = true,
	STAGE_ASPECT = .7,
	STAGE_HEIGHT = 700,
	STAGE_WIDTH = 1000;

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
					  'emailform.html',
					  'chooser.html',
					  'stage.html',
					  'postquestionnaire.html',
					  'summary.html']);

// load images defined in stimuli.js
psiTurk.preloadImages(IMAGES);


var extract_word_from_filename = function (path) {
    console.log(path);
	fn = path.split('\\').pop().split('/').pop();
	word = fn.split('.')[0];
	if (word.indexOf('_')!=-1) word = word.split('_')[1];
	return word;
}

var index_from_word = function(word) {
	stimid = _.filter(range(IMAGES.length), function(i) { return IMAGES[i].indexOf(word) != -1; })[0]
	return stimid;
}


// load and parse option sets from CSV file
Papa.parse(
	'static/test_sets_utf8.csv',
	{"download": true,
	 "header": true,
	 "encoding": "UTF-8",
	 "complete": function(parsed) {
		TEST_SETS = parsed['data'];
	 },
     "error": function() {
		output('failed to load option sets!');
    }}
);




//if (RETEST) {
//	psiTurk.preloadImages(IMAGES_RETEST_FOILS);
//};
$('#loading').css('display', 'none');


// disable vertical bounce
$(document).bind(
      'touchmove',
          function(e) {
            e.preventDefault();
          }
);

var h = $(window).height() * .9;
if (h < STAGE_HEIGHT) {
	STAGE_HEIGHT = h;
	STAGE_WIDTH = h/STAGE_ASPECT;
}


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
	self.word = pars['word'];
	self.blocking = pars['blocking'] | true;
	self.cond = pars['cond'];
	self.distance = pars['distance'] | 'none';
	self.facecolor = pars['facecolor'] || '#E6E6E6';

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
		    'col='+self.col, 'image='+self.img, 'word='+self.word, 'cond='+self.cond,
		    'distance='+self.distance]);


	self.disp = self.stage.append('g')
						  .attr('id', self.id);

	// background
	self.back = self.disp.append('rect')
						  .attr('x', self.x + padding/2)
						  .attr('y', self.y + padding/2)
						  .attr('width', self.width - padding)
						  .attr('height', self.height - padding)
						  .attr('rx', 15)
						  .attr('ry', 15)
						  .attr('fill', 'white')
						  .attr('opacity', 1.)

	// the word
	self.obj = self.disp.append('text')
						.text(self.word)
						.attr('x', self.obj_x + self.width/2 - padding)
						.attr('y', self.obj_y + self.height/2)
						.attr('text-anchor', 'middle')
						.style('font-size', '1.8em')
						.style('font-family', 'Helvetica')
						.attr('opacity', 0.)

	// the image
	self.face = self.disp.append('image')
						.attr('x', self.obj_x)
						.attr('y', self.obj_y)
						.attr('width', self.obj_w)
						.attr('height', self.obj_h)
						.attr('opacity', 0.)
						.attr('xlink:href', self.img);

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
		self.frame.attr('stroke', '#0040FF')
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

	self.listen_test = function(confirm_btn, callback) {

		self.disp.on(SELECT_EVENT, function() {

			if (!self.active && active_item==undefined) {

				self.active = true;
				if (self.blocking) active_item = self;
				self.frame_on();

				// activate the next button
				confirm_btn.attr('opacity', 1.);
				confirm_btn.btn.attr('fill', '#D8D8D8');

				confirm_btn.on(SELECT_EVENT, function() {
					output(['clicked_done'])
					active_item = undefined;

					confirm_btn.btn.attr('stroke', '#04B486');
					confirm_btn.btn.attr('fill', '#04B486');
					confirm_btn.btn_frame.attr('stroke', '#04B486')

					setTimeout(function() {
						confirm_btn.on(SELECT_EVENT, null);
						confirm_btn.attr('opacity', 0.5);
						confirm_btn.btn.attr('stroke', '#D8D8D8');
						confirm_btn.btn.attr('fill', '#D8D8D8');
						confirm_btn.btn_frame.attr('stroke', '#D8D8D8')
						callback(self.word);
					}, 200);
				});

			} else if (self.active) {
				self.active = false;
				active_item = undefined;
				self.frame_inactive();

				// inactivate the next button
				confirm_btn.attr('opacity', 0.5);
				confirm_btn.on(SELECT_EVENT, null);


			}
		});

	}


	self.unlisten = function() {
		self.disp.on(SELECT_EVENT, function() {});
	};

	self.remove = function() {
		self.disp.remove();
	}


};


var StudyPhase = function(block) {
	var self = this;

	self.study_cond = (SEED) ? 'active' : STUDY_COND[block % 2];
	if (self.study_cond == 'yoked') {
		self.yevent_ind = -1;
		self.yevent_data = yokeddata[Math.floor(block/2)]['episodes'];
	}

	outpfx =['study', block, self.study_cond];
	output(['init']);
	psiTurk.showPage('stage.html');
	self.stage = d3.select('#stagesvg');
	self.stage.attr('width', STAGE_WIDTH);
	self.stage.attr('height', STAGE_HEIGHT);

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
			var img = IMAGES[stimuli[block][ind]];
			var word = extract_word_from_filename(img);
			self.items.push(new Item({'stage': self.stage,
									  'id': stimuli[block][ind],
									  'ind': ind,
									  'row': i,
									  'col': j,
									  'x_off': self.x_off,
									  'width': self.item_w,
									  'height': self.item_h,
									  'image': img,
									  'word': word,
									  'framedelay': STUDY_FRAME_DELAY,
									  'duration': STUDY_DURATION,
									  'cond': self.study_cond
									 }))
		};
	};


	self.controls = new Controls(self.stage);

	self.expose_free = function() {
		output(['expose free']);

		$.each(self.items, function(i, item) {
			item.show(STUDY_EXPOSE_DURATION);
		})

		to = setTimeout(function() {
			self.study();
		}, STUDY_EXPOSE_DURATION);
		timeouts.push(to);

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

		// listen for any clicks
		$('#stagesvg').on(SELECT_EVENT, function(ev) {
			output(['stage_clicked', ev.offsetX, ev.offsetY]);
		});

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

		$.each(self.items, function(i, item) { item.listen(); })

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
	var self = this;
	self.study_cond = ['active', 'yoked', 'active', 'yoked'][block];
	outpfx =['familiarization-study', block, self.study_cond];
	output(['init']);
	psiTurk.showPage('stage.html');
	self.stage = d3.select('#stagesvg');
	self.stage.attr('width', STAGE_WIDTH);
	self.stage.attr('height', STAGE_HEIGHT);

	self.nrow = FAM_NROWS;
	self.ncol = FAM_NCOLS;

	self.items = [];
	self.stage_h = 400;
	self.stage_w = self.stage_h; // square
	self.item_w = self.stage_w / FAM_NROWS;
	self.item_h = self.stage_h / FAM_NCOLS;
	self.x_off = (Number(self.stage.attr("width")) - self.stage_w) / 2;
	self.y_off = (Number(self.stage.attr("height")) - self.stage_h) / 2;

	var n_items = FAM_NROWS*FAM_NCOLS;
	self.stims = shuffle(famitems.slice(block*n_items, block*n_items+n_items));

	for (var i=0; i<self.nrow; i++) {
		for (var j=0; j<self.ncol; j++) {
			var ind = i * self.nrow + j;
			var img = IMAGES[self.stims[ind]];
			var word = extract_word_from_filename(img);
			self.items.push(new Item({'stage': self.stage,
									  'id': self.stims[ind],
									  'ind': ind,
									  'row': i,
									  'col': j,
									  'x_off': self.x_off,
									  'y_off': self.y_off,
									  'width': self.item_w,
									  'height': self.item_h,
									  'image': img,
									  'word': word,
									  'framedelay': STUDY_FRAME_DELAY,
									  'duration': STUDY_DURATION
									 }))
		};
	};


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
			item.object_off();
			item.listen();
		})

		// start the timer
		//to = setTimeout(function() {
		//	clear_timeouts();
		//	exp.view = new FamiliarizationTestPhase(block);
		//}, FAM_STUDY_BLOCK_TIME);
		//timeouts.push(to);
	};

	self.study_yoked = function() {
		output(['yoked_study_begin']);
		$.each(self.items, function(i, item) {
			item.object_off();
		})
		block_start_time = timestamp();

		self.yevent_data = [{'ind': 0,
							 'start_time': 2000,
						     'end_time': 4000,
						     'duration': 2000}];
		for (i=1; i<50; i++) {
			var start = Math.floor(self.yevent_data[i-1]['end_time'] + 500 + Math.random()*1500);
			var end = Math.floor(start + STUDY_FRAME_DELAY + 3000);

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
		//to = setTimeout(function() {
		//	clear_timeouts();
		//	exp.view = new FamiliarizationTestPhase(block);
		//}, FAM_STUDY_BLOCK_TIME);
		//timeouts.push(to);

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
	self.stage.attr('width', STAGE_WIDTH);
	self.stage.attr('height', STAGE_HEIGHT);

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



var TestPhase = function() {
	var self = this;
	outpfx =['test'];
	output(['init']);
	psiTurk.showPage('stage.html');
	self.stage = d3.select('#stagesvg');
	self.stage.attr('width', STAGE_WIDTH);
	self.stage.attr('height', STAGE_HEIGHT);

	self.items = [];
	self.stage_h = Number(self.stage.attr("height"));
	self.stage_w = self.stage_h; // square
	self.nrow = STUDY_NROWS;
	self.ncol = STUDY_NCOLS;
	self.item_w = self.stage_w / self.nrow;
	self.item_h = self.stage_h / self.ncol;
	self.x_off = (Number(self.stage.attr("width")) - self.stage_w) / 2;

	self.trial_ind = -1;
	self.target_ind = null;
	self.recognized = [];

	self.controls = new Controls(self.stage);

	btn_size = self.item_w * .6;
	self.done_btn = self.stage.append('g')
							  .attr('id', 'done-btn')
							  .attr('opacity', 0.4);

    var btn_x = self.stage_h/2 + self.x_off + 15 - btn_size/2;
	var btn_y = self.stage_h - btn_size - 20;

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

	var sc = 10*(STAGE_HEIGHT/700)
	self.done_btn.btn = self.done_btn.append('path')
						  .attr('d', "M6.41 0l-.69.72-2.78 2.78-.81-.78-.72-.72-1.41 1.41.72.72 1.5 1.5.69.72.72-.72 3.5-3.5.72-.72-1.44-1.41z")
						  .attr('width', btn_size/2)
						  .attr('height', btn_size/2)
						  .attr('stroke', '#D8D8D8')
						  .attr('stroke-width', .4)
						  .attr('fill', '#D8D8D8')
						  .attr("transform", "translate("+btn_x+","+btn_y+") scale("+sc+")")

	// ensure that no foil is repeated within a trial, and only used 3 times
	var order = shuffle(range(testitems.length));
	//var offsets = range(testitems.length - 1).sample(3);
	//var option_inds = [order,
	//				   order.rotate(offsets[0]+1),
	//				   order.rotate(offsets[1]+1),
	//				   order.rotate(offsets[2]+1)];
	//option_inds = shuffle(_.zip.apply(_, option_inds)); // transpose

	self.test = function() {

		outpfx =['test', self.trial_ind];
		//option_inds_i = option_inds[self.trial_ind];

		// current target is always first column
		//self.target_ind = option_inds_i[0];
		self.target_ind = order[self.trial_ind];

		// shuffle order presented
		//option_inds_i = shuffle(option_inds_i);

		//var ti = testitems[target_ind];
		var stimid = testitems[self.target_ind]['stimid'];
		var cond = testitems[self.target_ind]['cond'];
		var img = IMAGES[stimid];
		var target_word = extract_word_from_filename(img);

		self.cue = new Item({'stage': self.stage,
						     'id': stimid,
						     'ind': -1,
						     'row': .7,
						     'col': .1,
							 'x_off': self.x_off,
							 'width': .4 * STAGE_HEIGHT,
							 'height': .4 * STAGE_HEIGHT,
							 'image': img,
							 'word': target_word,
							 'cond': cond,
							 'framedelay': TEST_FRAME_DELAY,
							 'duration': TEST_DURATION,
							 'blocking': true});

		ts = _.filter(TEST_SETS, function(ts) { return ts['Target']==target_word; })[0];
		allwords = shuffle([target_word, ts['D1'], ts['D2'], ts['D3']]);

		self.options = [];
		for (var j=0; j<allwords.length; j++) {
			var word = allwords[j];
			var stimid = index_from_word(word);
			var cond = _.filter(testitems, function(ti) { return ti['stimid']==stimid; })[0]['cond'];
			var img = IMAGES[stimid];
			output(['option', stimid, cond, img, word]);

			self.options.push(new Item({'stage': self.stage,
										'id': stimid,
										'ind': j,
										'row': j,
										'col': 2,
										'x_off': self.x_off,
										'width': self.item_w,
										'height': self.item_h,
										'image': img,
										'word': word,
										'cond': cond,
										'framedelay': TEST_FRAME_DELAY,
										'duration': TEST_DURATION,
										'blocking': true,
										}))
		};

		// listen for response
		self.cue.object_off();
		$.each(self.options, function(i, item) {
			item.object_on();
			item.frame_inactive();
			item.listen_test(self.done_btn, self.record_response);
		})

	}

	self.record_response = function(word) {
		var ti = testitems[self.target_ind];
		var stimid = ti['stimid'];
		var cond = ti['cond'];
		var img = IMAGES[stimid];
		var target_word = extract_word_from_filename(img);

		var correct = (word===target_word) ? 1 : 0;
		test_accuracy.push([cond, correct]);
		output(['response', target_word, word, cond, correct]);

		// cleanup
		$.each(self.options, function(i, item) {
			item.unlisten();
		});

		// self.next();
		setTimeout(function() {
			self.cue.remove();
			$.each(self.options, function(i, item) { item.remove(); });
			setTimeout(self.next, 200);
		}, 200);
	}

	self.next = function() {
		self.trial_ind += 1;
		if (self.trial_ind==testitems.length) {
			self.finish();
		} else {
			self.test();
		}
	};

	self.finish = function() {
		setTimeout(exp.test, 300);
	};


	self.begin = function() {
		setTimeout(function() {
			self.next();
		}, TEST_INIT_DELAY);
	};

	self.controls.start.remove();
	self.begin();
};



var EmailForm = function() {
	$('#main').html('');
	var self = this;
	psiTurk.showPage('emailform.html');

	record_responses = function() {

		psiTurk.recordTrialData(['postquestionnaire', 'submit']);

		$('textarea').each( function(i, val) {
			output([this.id, this.value]);
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
		exp.chooser();
	};

	$("#btn-submit").click(function() {
		record_responses();
	});

}


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
	active_correct = _.filter(active, function(r) { return r[1]; });

	yoked = _.filter(test_accuracy, function(r) { return r[0]=='yoked'; });
	yoked_correct = _.filter(yoked, function(r) { return r[1]; });

	output(['hits_active', active_correct.length]);
	output(['misses_active', active.length - active_correct.length]);
	output(['hits_yoked', yoked_correct.length]);
	output(['misses_yoked', yoked.length - yoked_correct.length]);
	output(['COMPLETE']);
	psiTurk.saveData();

	setTimeout(function() {
		psiTurk.showPage('summary.html');
		$('#partid').html(ids[0]);
		$('#acc_active').html(active_correct.length + '/' + active.length);
		$('#acc_yoked').html(yoked_correct.length + '/' + yoked.length);
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

	self.begin = function() {
		if (RECORD_EMAIL && !RETEST) {
			self.view = new EmailForm();
		} else {
			self.chooser();
		}
	}

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
			self.view = new TestPhase();
		}

	};

	self.chooser = function() {
		outpfx = [];
		output(['chooser']);
		psiTurk.showPage('chooser.html');

		var btn_fam = $('#choose-fam');
		var btn_study = $('#choose-study');
		var btn_test = $('#choose-test');


		if (RETEST) {
			$('#choose-setup').css('display', 'none');
			$('#choose-fam').css('display', 'none');
			$('#choose-study').css('display', 'none');
			$('#choose-finish').css('display', 'none');
		} else {
			$('#choose-setup').on('click', function() {
				window.location = '/setup';
			});

			if ((self.famblock+1)==N_FAM_BLOCKS) {
				btn_fam.html('Practice<br /><span class=counter>'+N_FAM_BLOCKS+'/'+N_FAM_BLOCKS+'</span>');
				btn_fam.css('opacity', '.5')
			} else {
				btn_fam.html('Practice<br /><span class=counter>'+(self.famblock+1)+'/'+N_FAM_BLOCKS+'</span>');
				btn_fam.on('click', self.familiarization);
			}

			if ((self.studyblock+1)==N_STUDY_BLOCKS) {
				btn_study.html('Study<br /><span class=counter>'+N_STUDY_BLOCKS+'/'+N_STUDY_BLOCKS+'</span>');
				btn_study.css('opacity', '.5')
			} else {
				btn_study.html('Study<br /><span class=counter>'+(self.studyblock+1)+'/'+N_STUDY_BLOCKS+'</span>');
				btn_study.on('click', self.study);
			}

			if ((self.testblock+1)<N_TEST_BLOCKS) {
				$('#choose-finish').css('opacity', '.5')
			} else {
				$('#choose-finish').on('click', function() {
					//self.view = new PostQuestionnaire();
					Summary();
				});
			}
		}

		if ((self.testblock+1)==N_TEST_BLOCKS) {
			btn_test.html('Test<br /><span class=counter>'+N_TEST_BLOCKS+'/'+N_TEST_BLOCKS+'</span>');
			btn_test.css('opacity', '.5')
		} else {
			btn_test.html('Test<br /><span class=counter>'+(self.testblock+1)+'/'+N_TEST_BLOCKS+'</span>');
			btn_test.on('click', self.test);
		}


	};

	// STIMULI SETUP

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
			yokeddata[b] = {'condition': blockdata[0][2],
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

	};
	remaining = _.difference(range(IMAGES.length), yokeditems);

	// reserve first 8 items for familiarization
	famitems = range(8);
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
			cond = item[10].split('=')[1];
			return item[0]=='study' && cond=='active';
		});
		activeitems = _.map(activeitems, function(it) {
			return Number(it['trialdata'][4].split('=')[1]);
		})

		yokeditems = _.filter(prev_test_data, function(rec) {
			item = rec['trialdata'];
			cond = item[10].split('=')[1];
			return item[0]=='study' && cond=='yoked';
		});
		yokeditems = _.map(yokeditems, function(it) {
			return Number(it['trialdata'][4].split('=')[1]);
		})

	}

	function studied_location(item) {
		return _.filter(_.map(range(4), function(i) {
							return stimuli[i].indexOf(item); }),
							function(x) { return x > -1; })[0];
	}
	D = [];
	for (var i=0; i<activeitems.length; i++) {
		D.push({'stimid': activeitems[i],
				'studied_loc': studied_location(activeitems[i]),
				'cond': 'active'})
	};
	for (var i=0; i<yokeditems.length; i++) {
		D.push({'stimid': yokeditems[i],
				'studied_loc': studied_location(yokeditems[i]),
				'cond': 'yoked'})
	};
	testitems = shuffle(D);

	self.begin();
};

// vi: noexpandtab tabstop=4 shiftwidth=4
