/*!
 * iScroll native "overflow" scroller (13-12-2011)
 *
 * Copyright (C) 2011 German M. Bravo <german.mb@gmail.com>
 * All rights reserved.
 */
(function(undefined) {
var ua = navigator.userAgent,
	touchPad = ~ua.indexOf('hp-tablet'),

	hasTouch = 'ontouchstart' in window && !touchPad,

	START_EV = hasTouch ? 'touchstart' : 'mousedown',
	MOVE_EV = hasTouch ? 'touchmove' : 'mousemove',
	END_EV = hasTouch ? 'touchend' : 'mouseup',
	CANCEL_EV = hasTouch ? 'touchcancel' : 'mouseup',
	timeouts = [];

	// Constructor
	iScroll = function (el, options) {
		var that = this,
			i;
		that.scroller = typeof el == 'object' ? el : doc.getElementById(el);

		// Default options
		that.options = {
			// Events
			onRefresh: null,
			onBeforeScrollStart: null,
			onScrollStart: null,
			onBeforeScrollMove: null,
			onScrollMove: null,
			onBeforeScrollEnd: null,
			onScrollEnd: null,
			onTouchEnd: null
		};

		// User defined options
		for (i in options) that.options[i] = options[i];

		that.scroller.style.overflow = 'auto';
		that.scroller.style.webkitOverflowScrolling = 'touch';

		that.scrollTop = that.scroller.scrollTop;
		that.y = -that.scrollTop;

		that._bind(START_EV);
		if (!hasTouch) {
			that._bind('mouseout', that.scroller);
			that._bind('scroll');
		}
	};

iScroll.prototype = {
	_scrolling: false,
	_touching: false,

	enabled: true,
	x: 0,
	y: 0,
	scrollTop: 0,

	handleEvent: function (e) {
		var that = this;
		switch(e.type) {
			case START_EV:
				if (!hasTouch && e.button !== 0) return;
				that._start(e);
				break;
			case MOVE_EV: that._move(e); break;
			case END_EV:
			case CANCEL_EV: that._end(e); break;
			case 'scroll': that._scroll(e); break;
			case 'mouseout': that._mouseout(e); break;
		}
	},

	_clear: function(e) {
		var that = this;
		for (var i; i < timeouts.length; i++) {
			clearTimeout(timeouts[i]);
		}
		if($) $(that.scroller).stop();
		that._manual = false;
		that._scrolling = false;
		that._touching = false;
		that._ending = false;
	},

	_start: function(e) {
		var that = this,
			point = hasTouch ? e.touches[0] : e;

		if (!that.enabled) return;

		if (that.options.onBeforeScrollStart) that.options.onBeforeScrollStart.call(that, e);

		that.startY = point.screenY;
		that.scrollTop = that.scroller.scrollTop;

		that._scrolling = true;
		that.y = -that.scrollTop;

		// Fix to avoid scrolling up/down the whole screen:
		if(that.scrollTop <= 0)
			that.scroller.scrollTop = 1;
		if(that.scrollTop + that.scroller.offsetHeight >= that.scroller.scrollHeight)
			that.scroller.scrollTop = that.scroller.scrollHeight - that.scroller.offsetHeight - 1;

		if (that.options.onScrollStart) that.options.onScrollStart.call(that, e);

		that._bind(MOVE_EV);
		that._bind(END_EV);
		that._bind(CANCEL_EV);
	},

	_move: function(e) {
		var that = this,
			point = hasTouch ? e.touches[0] : e,
			scrollTop = that.scrollTop + (that.startY - point.screenY + window.pageYOffset);

		if (that.options.onBeforeScrollMove) that.options.onBeforeScrollMove.call(that, e);

		that.y = -scrollTop;

		if (!hasTouch) {
			that._manual = true;
			that.scroller.scrollTop = scrollTop;
			clearTimeout(timeouts[0]);
			timeouts[0] = setTimeout(function() {
				that._manual = false;
			}, 0);
		}

		if (that.options.onScrollMove) that.options.onScrollMove.call(that, e);
	},

	_end: function(e, delay) {
		if (hasTouch && e.touches && e.touches.length !== 0) return;

		var that = this;

		that._unbind(MOVE_EV);
		that._unbind(END_EV);
		that._unbind(CANCEL_EV);

		that._ending = true;

		clearTimeout(timeouts[1]);
		timeouts[1] = setTimeout(function() {
			if (that.options.onBeforeScrollEnd) that.options.onBeforeScrollEnd.call(that, e);

			that._clear();

			if (that.options.onScrollEnd) that.options.onScrollEnd.call(that, e); // Execute custom code on scroll end

			if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
		}, delay === 0 ? delay : delay || 100);
	},

	_mouseout: function (e) {
		var that = this,
			t = e.relatedTarget;

		while (t) if (t == that.scroller) return; else t = t.parentNode;

		that._end(e, 0);
	},

	_scroll: function (e) {
		var that = this;
		if (that._manual) return;

		var onBefore, on;
		if (that._scrolling) {
			onBefore = that.options.onBeforeScrollMove;
			on = that.options.onScrollMove;
		} else {
			onBefore = that.options.onBeforeScrollStart;
			on = that.options.onScrollStart;
		}

		if (onBefore) onBefore.call(that, e);
		that._scrolling = true;
		that.scrollTop = that.scroller.scrollTop + window.pageYOffset;
		that.y = -that.scrollTop;
		if (on) on.call(that, e);

		that._end(e, 400);
	},

	_bind: function (type, el, bubble) {
		(el || this.scroller).addEventListener(type, this, !!bubble);
	},

	_unbind: function (type, el, bubble) {
		(el || this.scroller).removeEventListener(type, this, !!bubble);
	},

	/**
	 *
	 * Public methods
	 *
	 */
	refresh: function() {
		var that = this;
		that.options.onRefresh.call(that);
	},
	scrollTo: function(x, y, duration) {
		var that = this;
		if ($ && duration) {
			that._manual = true;
			that.scrollTop = -y;
			$(that.scroller).stop().animate({ 'scrollTop': -y }, duration, function() {
				that._manual = false;
			});
		} else {
			that._manual = true;
			that.scrollTop = that.scroller.scrollTop = -y;
			if($) $(that.scroller).stop();
			clearTimeout(timeouts[0]);
			timeouts[0] = setTimeout(function() {
				that._manual = false;
			}, 0);
		}
	}
};

iScroll.overflow = true;

if (typeof exports !== 'undefined') exports.iScroll = iScroll;
else window.iScroll = iScroll;

})();