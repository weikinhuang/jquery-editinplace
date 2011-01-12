/*!
 * Edit in place plugin for jquery to allows for editing text on the page - jQuery plugin 0.3.0
 *
 * Copyright (c) 2010 Wei Kin Huang (<a href="http://www.incrementbyone.com">Increment By One</a>)
 *
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */
(function($) {
	var EditInPlace = function(element, options) {
		this.element = element;
		this.j_element = $(element);
		this.options = options;
		this.enabled = true;
		this.events = {};
		this.ui = {};
		this.bind();
	};
	EditInPlace.prototype = {
		bind : function() {
			var self = this;
			this.j_element.addClass(this.options.inactiveClass).addClass("editinplace").data("editinplace", this);
			if (this.options.onAction == "trigger") {
				this.trigger();
			} else if (this.options.onAction) {
				$.each(this.options.onAction.split(" "), function(i, v) {
					self.events[v + ".editinplace"] = function(e) {
						return self.trigger(e);
					};
					self.j_element.bind(v + ".editinplace", self.events[v + ".editinplace"]);
				});
			}
		},
		destroy : function() {
			$.each(this.events, function(k, e) {
				self.j_element.unbind(k, e);
			});
			this.j_element.removeClass(this.options.inactiveClass).removeClass("editinplace").removeData("editinplace");
		},
		enable : function() {
			this.enabled = true;
		},
		disable : function() {
			this.enabled = false;
		},
		trigger : function(event) {
			var ui = this._buildForm();
			this.j_element.before(ui.form).detach();
			ui.input.focus();
			return this.options.activate.apply(this.element, [ event || $.Event("trigger"), ui ]);
		},
		submit : function() {
			if (this.ui.form) {
				var event = $.Event("trigger");
				event.action = "submit";
				this._commit(event, this.ui);
			}
		},
		cancel : function() {
			if (this.ui.form) {
				var event = $.Event("trigger");
				event.action = "cancel";
				this._commit(event, this.ui);
			}
		},
		_buildForm : function() {
			var self = this, ui = {}, submit_event = function(event) {
				event.action = "submit";
				self._commit(event, ui);
			}, cancel_event = function(event) {
				event.action = "cancel";
				self._commit(event, ui);
			};
			this.ui = ui;

			// create the form that the elements will go into
			ui.form = $("<form>").addClass("editinplace editinplace-form " + this.options.activeClass).submit(function(event) {
				submit_event(event);
				return false;
			});

			// create the button elements that provide the form interaction
			var button = this.options.button || "a";
			ui.submit_button = $("<" + button + ">").click(function(event) {
				submit_event(event);
				return false;
			}).addClass("editinplace-action editinplace-submit").text(this.options.submitText || "Submit");
			ui.cancel_button = $("<" + button + ">").click(function(event) {
				cancel_event(event);
				return false;
			}).addClass("editinplace-action editinplace-cancel").text(this.options.cancelText || "Cancel");
			// if the button is a "a" tag, then we need to set the href attributes
			if (button == "a") {
				ui.submit_button.attr("href", "#");
				ui.cancel_button.attr("href", "#");
			}

			// create the input that the user will edit
			switch (this.options.input || "text") {
				case "textarea":
					ui.input = $("<textarea>").attr({
						rows : this.options.options && this.options.options.rows ? this.options.options.rows : 2,
						cols : this.options.options && this.options.options.cols ? this.options.options.cols : 5
					});
					break;
				case "select":
					ui.input = $("<select>");
					$.each(this.options.options || {
						"-1" : "Select Option"
					}, function(v, t) {
						ui.input.append($("<option>").text(t).attr("value", v));
					});
					break;
				default:
					ui.input = $("<input>").attr("type", this.options.input || "text");
					break;
			}

			ui.input.attr("name", "q").addClass("editinplace-input").keypress(function(event) {
				if ((event.which && event.which == 27) || (event.keyCode && event.keyCode == 27)) {
					cancel_event(event);
					return false;
				} else if ((event.which && event.which == 13) || (event.keyCode && event.keyCode == 13)) {
					submit_event(event);
					return false;
				}
			});
			if (this.options.blur) {
				ui.input.blur(function(event) {
					submit_event(event);
				});
			}
			ui.form.append(ui.input).append(ui.submit_button).append(ui.cancel_button);
			ui.input.val(this.options.val.apply(this.element, []));

			this.options.create.apply(this.element, [ $.Event("create"), ui ]);

			return ui;
		},
		_commit : function(event, ui) {
			var self = this, update = function(value) {
				self.options.val.apply(self.element, [ value, self.options.defaultValue ]);
				ui.form.before(self.element).remove();
				self.ui = {};
			};
			ui.value = {
				original : this.options.val.apply(this.element, []),
				updated : ui.input.val()
			};
			switch (event.action) {
				case "submit":
					if (this.options.beforeSubmit.apply(this.element, [ update, event, ui ]) === false) {
						return;
					}
					this.options.submit.apply(this.element, [ update, event, ui ]);
					break;
				case "cancel":
					if (self.options.cancel.apply(this.element, [ update, event, ui ]) === false) {
						return;
					}
					update(ui.value.original);
					break;
			}
		}
	};

	// EditInPlace default options
	EditInPlace.defaults = {
		onAction : "dblclick",
		activeClass : "editinplace-active",
		inactiveClass : "editinplace-inactive",
		defaultValue : "Click to Edit",
		options : false,
		button : "a",
		input : "text",
		submitText : "Submit",
		cancelText : "Cancel",
		blur : false,
		create : function(event, ui) {
		},
		activate : function(event, ui) {
			return false;
		},
		beforeSubmit : function(update, event, ui) {
			return true;
		},
		submit : function(update, event, ui) {
			update(ui.value.updated);
		},
		cancel : function(update, event, ui) {
			return true;
		},
		val : function(value, default_value) {
			if (value == null) {
				return $(this).text().replace(/<br\s*\/?>/ig, "\n");
			}
			var v = value.replace(/\r\n|\n\r|\r|\n/g, "<br />");
			return $(this).text(v !== "" ? v : (default_value || ""));
		}
	};

	// Bind the jquery plugin
	$.fn.editinplace = function(options) {
		if (typeof options === "string") {
			var args = arguments;
			switch (options) {
				case "enable":
				case "disable":
				case "destroy":
				case "trigger":
				case "submit":
				case "cancel":
					this.each(function() {
						EditInPlace.prototype[options].apply($(this).data("editinplace"), args[1]);
					});
					break;
				case "option":
					if (typeof args[1] === "string") {
						if (args[1] in EditInPlace.defaults) {
							this.each(function() {
								$(this).data("editinplace").options[args[1]] = args[2];
							});
						}
					} else {
						this.each(function() {
							$.extend($(this).data("editinplace").options, args[1]);
						});
					}
					break;
			}
			return this;
		}

		options = $.extend({}, EditInPlace.defaults, options);
		return this.each(function() {
			new EditInPlace(this, options);
		});
	};

	// set a global reference to the editinplace class
	$.fn.editinplace.widget = $.editinplace = EditInPlace;
})(jQuery);