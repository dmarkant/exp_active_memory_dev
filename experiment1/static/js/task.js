var	SEED,
	FAM_NROWS = 2,
	FAM_NCOLS = 2,
	FAM_INIT_DELAY = 1000,
	FAM_STUDY_BLOCK_TIME = 60000 * 10,
	N_FAM_BLOCKS = 4,
	FAM_EXPOSE_DURATION = 2000,
	STUDY_NROWS = 4,
	STUDY_NCOLS = 4,
	N_STUDY_BLOCKS = 4,
	ITEMS_PER_STUDY_ROUND = STUDY_NCOLS * STUDY_NCOLS,
	TOTAL_STUDY_ITEMS = N_STUDY_BLOCKS * ITEMS_PER_STUDY_ROUND,
	STUDY_FRAME_DELAY = 500,
	STUDY_DURATION = 'selfpaced', // 'none' | 'selfpaced' | fixed t
	STUDY_BLOCK_TIME = 90000,
	STUDY_INIT_DELAY = 1000,
	STUDY_EXPOSE = 'free', // 'none' | 'free' | 'snake'
	STUDY_EXPOSE_DURATION = 2000, // how long images are all shown at beginning of study
	STUDY_COND = ['active', 'yoked'], // replace with randomization
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
	outpfx = [],
	timeouts = [],
	partnerdata = [],
	ids = uniqueId.split(':'),
	block_start_time;

// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);
var LOGGING = true;

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


function set_status(label) {
	$('#status').html('<p>'+label+'</p>');
	if (label==='S') {
		$('#status').css('background-color', '#FE9A2E');
	}
}


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


// Generic function for saving data
function output(arr) {
	arr = outpfx.concat(arr);
    psiTurk.recordTrialData(arr);
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
	self.stage_w = Number(self.stage.attr("width")); // square

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

	self.episode = {};

	padding = 10;
	self.obj_x = self.x + padding;
	self.obj_y = self.y + padding;
	self.obj_w = self.width - 2 * padding;
	self.obj_h = self.height - 2 * padding;

	output(['item', 'id='+self.stimid, 'ind='+self.ind, 'row='+self.row, 'col='+self.col, 'image='+self.img]);

	// state variables
	self.active = false;
	self.framed = false;


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
		self.obj.attr('opacity', 1.)
	};

	self.object_off = function() {
		output([self.id, 'object_off'])
		self.active = false;
		self.obj.attr('opacity', 0.)
	};

	self.show = function(duration, callback) {
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

		self.disp.on('touchstart', function() {

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

	self.listen_test = function() {

		self.disp.on('touchstart', function() {

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
		self.disp.on('touchstart', function() {});
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
	psiTurk.showPage('stage.html');
	self.stage = d3.select('#stagesvg');
	self.nrow = STUDY_NROWS;
	self.ncol = STUDY_NCOLS;
	self.images = [];
	self.items = [];
	//self.stage_w = Number(self.stage.attr("width"));
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
									  'duration': STUDY_DURATION
									 }))
		};
	};

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
	self.nrow = 2;
	self.ncol = 2;
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
			var start = self.yevent_data[i-1]['end_time'] + 500 + Math.random()*1500;
			var end = start + STUDY_FRAME_DELAY + 1000 + Math.random()*3000;

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

		self.done_btn.on('touchstart', function() {
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

	for (var i=0; i<self.nrow; i++) {
		for (var j=0; j<self.ncol; j++) {
			var ind = i * self.nrow + j;

			var ti = testitems[block][ind];

			// handle retest IDs -- if retest, use the new set of
			// foils for test
			if (String(ti['ind']).indexOf('-retest') > -1) {
				var loc = Number(ti['ind'].slice(0, ti['ind'].indexOf('-retest')));
				var img = IMAGES_RETEST_FOILS[loc];
			} else {
				var img = IMAGES[ti['ind']];
			}

			self.items.push(new Item({'stage': self.stage,
									  'id': ti['ind'],
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

	$('#modalContinueButton').on('click', function(e) {
		self.finish();
	})

	self.test = function() {
		output(['test']);

		self.done_btn.attr('opacity', 1.)

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


	self.finish = function() {
		output(['finish']);

		$.each(self.items, function(i, item) {
			var ind = item['ind'];
			var ti  = testitems[block][ind];
			var resp = (item.active) ? 'old' : 'new';
			var correct = (ti['studied'] && resp == 'old') ||
						  (!ti['studied'] && resp == 'new');

			test_accuracy.push([ti['cond'], resp, correct]);

			output([i,
					ti['ind'],
					ti['studied'],
					ti['cond'],
					resp,
					correct
					])
		});

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


var Summary = function() {
	var self = this;

	outpfx =['summary'];
	psiTurk.showPage('summary.html');
	$('#partid').html(ids[0]);
	active = _.filter(test_accuracy, function(r) { return r[0]=='active'; });
	active_correct = _.filter(active, function(r) { return r[2]; });

	yoked = _.filter(test_accuracy, function(r) { return r[0]=='yoked'; });
	yoked_correct = _.filter(yoked, function(r) { return r[2]; });

	novel = _.filter(test_accuracy, function(r) { return r[0]=='new'; });
	novel_correct = _.filter(novel, function(r) { return r[2]; });

	$('#acc_active').html(active_correct.length + '/' + active.length);
	$('#acc_yoked').html(yoked_correct.length + '/' + yoked.length);
	$('#acc_novel').html(novel_correct.length + '/' + novel.length);

	output(['hits_active', active_correct.length]);
	output(['misses_active', active.length - active_correct.length]);
	output(['hits_yoked', yoked_correct.length]);
	output(['misses_yoked', yoked.length - yoked_correct.length]);
	output(['cr', novel_correct.length]);
	output(['fa', novel.length - novel_correct.length]);
	output(['COMPLETE']);
	psiTurk.saveData();

	$('#check-button').on('click', function(e) {
		Exit();
	});
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


	self.familiarization = function() {
		self.famblock += 1;

		if (self.famblock == N_FAM_BLOCKS) {
			self.chooser();
		} else {
			self.view = new FamiliarizationStudyPhase(self.famblock);
		}

	};

	self.study = function() {
		psiTurk.saveData();
		self.studyblock += 1;

		if (self.studyblock >= N_STUDY_BLOCKS) {
			self.chooser();
		} else {
			self.view = new StudyPhase(self.studyblock);
		}

	};

	self.test = function() {
		psiTurk.saveData();
		self.testblock += 1;
		if (self.testblock >= N_TEST_BLOCKS) {
			self.chooser();
		} else {
			self.view = new TestPhase(self.testblock);
		}

	};

	self.chooser = function() {
		outpfx = [];
		output(['chooser']);
		psiTurk.showPage('chooser.html');

		if (RETEST) {
			set_status('RT');

			$('#choose-setup').css('display', 'none');
			$('#choose-fam').css('display', 'none');
			$('#choose-study').css('display', 'none');
		} else {

			if (SEED) set_status('S');
			else set_status('AY');

			$('#choose-setup').on('click', function() {
				window.location = '/setup';
			})

			$('#choose-fam').on('click', function() {
				self.familiarization();
			})

			$('#choose-study').on('click', function() {
				self.study();
			})
		}

		$('#choose-test').on('click', function() {
			self.test();
		})

		$('#choose-finish').on('click', function() {
			self.view= new Summary();
		})

	};

	// STUDY SETUP

	// study data from yoked partner
	if (partner_result.length != []) {
		$.each(partner_result.partner_data, function(i, d) {
			var td = d.trialdata;
			if (td[0] == "study") {
				if (td[3] == "item" || td[4] == "episode") {
					partnerdata.push(td);
				};
			};
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

			var n = randrange(0, 8);
			n_active.push(n);
			n_active.push(8 - n);

			var n = randrange(0, 8);
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
		activeitems = _.filter(prev_test_data, function(rec) {
			item = rec['trialdata'];
			return item[0]=='test' && item.length==8 && item[4]==true && item[5]=='active';
		});
		activeitems = _.map(activeitems, function(it) { return it['trialdata'][3]; })

		yokeditems = _.filter(prev_test_data, function(rec) {
			item = rec['trialdata'];
			return item[0]=='test' && item.length==8 && item[4]==true && item[5]=='yoked';
		});
		yokeditems = _.map(yokeditems, function(it) { return it['trialdata'][3]; })

		remaining = _.map(_.range(IMAGES_RETEST_FOILS.length), function(n) { return n + '-retest'; })

	}


	// randomize the order of items for test
	activeitems = shuffle(activeitems);
	yokeditems = shuffle(yokeditems);
	remaining = shuffle(remaining);

	// assign appropriate number of active/yoked/novel
	// items to each test block
	alltest = [];
	for (b=0; b<N_TEST_BLOCKS; b++) {
		ti_b = [];

		for (var i=0; i<n_active[b]; i++) {

			ti_b.push({'ind': activeitems[ind_active[b]+i],
					'studied': true,
					'cond': 'active'});
			alltest.push(activeitems[ind_active[b]+i])
		}

		for (var i=0; i<n_yoked[b]; i++) {
			ti_b.push({'ind': yokeditems[ind_yoked[b]+i],
					'studied': true,
					'cond': 'yoked'});
			alltest.push(yokeditems[ind_yoked[b]+i])

		}

		for (var i=0; i<n_novel[b]; i++) {
			ti_b.push({'ind': remaining[ind_novel[b]+i],
					'studied': false,
					'cond': 'new'});
			alltest.push(remaining[ind_novel[b]+i])
		}
		testitems.push(shuffle(ti_b));
	}

	self.chooser();

};

// vi: noexpandtab tabstop=4 shiftwidth=4
