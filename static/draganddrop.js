;(function($, window, document, undefined) {
  "use strict";
  
  var pluginName = 'acosDragAndDrop';
  var defaults = {
    feedback_selector: '.draganddrop-feedback',
    points_selector: '.draganddrop-points',
    correct_answers_selector: '.draganddrop-correct-answers',
    wrong_answers_selector: '.draganddrop-wrong-answers',
    completed_selector: '.draganddrop-complete',
    droppable_selector: '.droppable',
    draggable_selector: '.draggable',
    draggable_class: 'draggable',
    content_selector: '.draganddrop-content',
    draggables_selector: '.draganddrop-draggables', // container for draggable elements
    info_selector: '.draganddrop-info',
    complete_msg_attr: 'data-msg-complete',
    complete_uploading_msg_attr: 'data-msg-complete-uploading',
    complete_uploaded_msg_attr: 'data-msg-complete-uploaded',
    complete_error_msg_attr: 'data-msg-complete-error',
    final_points_msg_attr: 'data-msg-final',
    drags_left_msg_selector: '.draganddrop-dragsleftmsg', // correct answers left
    drags_left_singular_msg_attr: 'data-msg-singular',
    drags_left_plural_msg_attr: 'data-msg-plural',
  };
  
  function AcosDragAndDrop(element, options) {
    this.element = $(element);
    this.settings = $.extend({}, defaults, options);
    
    this.completed = false;
    // answers made to each droppable (no duplicates even if the same answer is repeated) (key: droppable unique id)
    this.questionAnswered = {};
    this.droppablesByLabel = {}; // array of droppable unique ids for each droppable label (key: droppable label)
    this.latestAnswers = {}; // latest answer for each droppable (key: droppable unique id)
    this.feedbackDiv = this.element.find(this.settings.feedback_selector);
    this.pointsDiv = this.element.find(this.settings.points_selector);
    this.completeDiv = this.element.find(this.settings.completed_selector);
    this.correctPointsElem = this.element.find(this.settings.correct_answers_selector);
    this.wrongPointsElem = this.element.find(this.settings.wrong_answers_selector);
    this.dragsLeftMsgDiv = this.element.find(this.settings.drags_left_msg_selector);
    this.contentDiv = this.element.find(this.settings.content_selector);
    this.draggablesContainer = this.element.find(this.settings.draggables_selector);
    this.infoDiv = this.element.find(this.settings.info_selector);
    this.correctAnswers = 0;
    this.incorrectAnswers = 0;
    this.maxCorrectAnswers = this.element.find(this.settings.droppable_selector).length; // total correct answers in the exercise
    this.answerLog = []; // all answers (drags) for logging
    this.draggablesPayload = window.draganddrop.draggables;
    this.droppablesPayload = window.draganddrop.droppables;
    this.dragData = null; // drag data stored here in case the native API hides it
    this.init();
  }
  
  $.extend(AcosDragAndDrop.prototype, {
  
    init: function() {
      var self = this;
      // create draggable elements based on payload data
      for (var id in this.draggablesPayload) {
        if (this.draggablesPayload.hasOwnProperty(id)) {
          var text = this.draggablesPayload[id].content;
          
          $('<span>')
            .addClass(self.settings.draggable_class)
            .attr('data-label', id)
            .attr('draggable', 'true')
            .html(text)
            .appendTo(self.draggablesContainer);
        }
      }
      
      var idCounter = 0;
      // attach event handlers to the draggable and droppable elements in the exercise as well as
      // generate and add unique IDs to the droppable elements
      this.element.find(this.settings.droppable_selector).each(function() {
        var uniqueId = idCounter++;
        $(this).data('id', uniqueId);
        
        var questionLabel = $(this).data('label'); // labels are set by the teacher, they may repeat the same values
        if (Array.isArray(self.droppablesByLabel[questionLabel])) {
          self.droppablesByLabel[questionLabel].push(uniqueId);
        } else {
          self.droppablesByLabel[questionLabel] = [uniqueId];
        }
        
        self.questionAnswered[uniqueId] = [];
        // the array will contain the draggable labels corresponding to answers made by the user
        // on this droppable (no duplicate values are added to the array)
        
        self.latestAnswers[uniqueId] = null; // latest answer (draggable label) on this droppable
      })
      .on('dragover', function(e) {
        self.handleDragOver(e);
      })
      .on('dragenter', function(e) {
        self.handleDragEnter(e);
      })
      .on('dragleave', function(e) {
        self.handleDragLeave(e);
      })
      .on('drop', function(e) {
        self.handleDrop(e);
      })
      .on('click', function(e) {
        // show feedback again for this droppable
        self.handleDroppableClick(e);
      });
      
      this.draggablesContainer.find(this.settings.draggable_selector)
        .on('dragstart', function(e) {
          self.handleDragStart(e);
        })
        .on('dragend', function(e) {
          self.handleDragEnd(e);
        });
      
      // use fixed positioning for the info and draggables containers
      // if they cannot be seen on the screen otherwise
      this.setInfoPosition();
      this.setDraggablesPosition();
      $(window).on('resize', function() {
        self.setInfoPosition();
        self.setDraggablesPosition();
      });
    },
    
    // Event handlers for drag-and-drop (native HTML5 API)
    handleDragStart: function(e) {
      e.originalEvent.dataTransfer.effectAllowed = 'copy';
      e.originalEvent.dataTransfer.dropEffect = 'copy';
      
      e.target.style.opacity = '0.5'; // e.target is the source node (draggable)
      
      var dragData = $(e.target).data('label');
      try {
        e.originalEvent.dataTransfer.setData('text/plain', dragData);
      } catch (ex) {
        // Internet Explorer does not support the "text/plain" data type
        e.originalEvent.dataTransfer.setData('text', dragData);
      }
      this.dragData = dragData; // keep the data in a variable since the drag-and-drop API is unreliable
    },
    
    handleDragOver: function(e) {
      var draggableLabel = null;
      try {
        draggableLabel = e.originalEvent.dataTransfer.getData('text/plain');
      } catch (ex) {
        // for Internet Explorer
        draggableLabel = e.originalEvent.dataTransfer.getData('text');
      }
      if (!draggableLabel) {
        // fallback when the native API fails
        draggableLabel = this.dragData;
      }
      if (draggableLabel && this.draggablesPayload[draggableLabel] && !$(e.target).hasClass('correct')) {
        e.preventDefault(); // allow drop
        
        e.originalEvent.dataTransfer.dropEffect = 'copy';

        return false;
      }
      return true;
    },
    
    handleDragEnter: function(e) {
      // e.target is the current hover target (droppable)
      e.preventDefault(); // really needed?
      if (!$(e.target).hasClass('correct')) {
        // the droppable has not been correctly answered yet so add a class for styling while hovering over it
        $(e.target).addClass('over');
      }
    },
    
    handleDragLeave: function(e) {
      $(e.target).removeClass('over'); // e.target is previous target element (droppable)
    },
    
    handleDrop: function(e) {
      // e.target is the current targeted droppable element

      e.stopPropagation(); // stops the browser from redirecting
      e.preventDefault();

      var draggableLabel = null;
      try {
        draggableLabel = e.originalEvent.dataTransfer.getData('text/plain');
      } catch (ex) {
        // for Internet Explorer
        draggableLabel = e.originalEvent.dataTransfer.getData('text');
      }
      if (!draggableLabel) {
        // fallback when the native API fails
        draggableLabel = this.dragData;
      }
      
      var droppableLabel = $(e.target).data('label');
      this.checkAnswer(draggableLabel, droppableLabel, $(e.target));

      return false;
    },

    handleDragEnd: function(e) {
      // e.target is the draggable element
      $(e.target).css('opacity', ''); // remove the inline style set in dragstart
      this.element.find(this.settings.droppable_selector).removeClass('over');
      this.dragData = null;
      
      if (this.completed) {
        // if the exercise has been completed, detach the drag event handlers
        // do it here so that the drag event for the last answer may finish normally
        this.detachDragEventHandlers();
      }
    },
    
    // show feedback for a droppable again if it is clicked
    handleDroppableClick: function(e) {
      e.stopPropagation();
      e.preventDefault();
      
      var dropId = $(e.target).data('id');
      var answers = this.questionAnswered[dropId];
      if (answers.length < 1) {
        // not answered yet, do nothing
        return false;
      }
      
      var draggableLabel = this.latestAnswers[dropId];
      var droppableLabel = $(e.target).data('label');
      var feedback = this.getFeedback(draggableLabel, droppableLabel);
      this.updateFeedback(feedback, this.isCorrectAnswer(draggableLabel, droppableLabel));
      
      return false;
    },
    
    // check the answer and do everything else that is necessary and not related to the drag-and-drop API:
    // update UI, check completion and send grading when finished
    checkAnswer: function(draggableLabel, droppableLabel, droppableElem) {
      // if the exercise has been completed or
      // if the correct answer has been given for this droppable, ignore the drag event
      if (this.completed || droppableElem.hasClass('correct')) {
        return;
      }
      
      this.latestAnswers[droppableElem.data('id')] = draggableLabel;
      
      // Has the draggable already been dragged on the droppable previously?
      // It is possible to repeat the same wrong answer before the correct answer is found,
      // but repeating the same wrong answer does not affect grading.
      var wasAnswered = true;
      if (this.questionAnswered[droppableElem.data('id')].indexOf(draggableLabel) === -1) {
        this.questionAnswered[droppableElem.data('id')].push(draggableLabel);
        wasAnswered = false;
      }
      
      var dragPayload = this.draggablesPayload[draggableLabel];
      //var dropPayload = this.droppablesPayload[droppableLabel];
      var isCorrect = this.isCorrectAnswer(draggableLabel, droppableLabel);
      
      var feedback = this.getFeedback(draggableLabel, droppableLabel);
      this.updateFeedback(feedback, isCorrect);
      droppableElem.removeClass('correct wrong');
      if (isCorrect) {
        droppableElem.addClass('correct');
        if (!wasAnswered) {
          this.correctAnswers++;
        }
        // if the same draggable should not be reused after finding the correct droppable for it (default: allow reuse)
        if (dragPayload.reuse === false) {
          this.disableDraggable(draggableLabel);
        }
      } else {
        droppableElem.addClass('wrong');
        if (!wasAnswered) {
          this.incorrectAnswers++;
        }
      }
      
      // reveal text defined by the draggable in the droppable
      this.revealAnswerInDroppable(draggableLabel, droppableElem);
      
      this.updatePoints();
      this.updateCorrectDragsLeftMessage();
      
      // save the answer for logging (only once for each draggable-droppable combination)
      // the full log is uploaded to the ACOS server at the end
      if (!wasAnswered) {
        // with the label a log analyzer can check if the answer was correct or not
        // (exercise JSON payload has the same labels)
        // droppable IDs are unique, labels may be reused
        // no user ID is used here
        // if this content type wants to log multiple things, we should add some type key to the payload (type: "drag")
        var logPayload = {
          qid: droppableElem.data('id'), // question (droppable)
          qlabel: droppableLabel,
          alabel: draggableLabel, // answer (draggable)
          time: new Date().toISOString(), // current time
        };
        
        this.answerLog.push(logPayload);
      }
      
      this.checkCompletion();
    },
    
    getFeedback: function(draggableLabel, droppableLabel) {
      var feedback;
      var dropPl = this.droppablesPayload[droppableLabel];
      var dragPl = this.draggablesPayload[draggableLabel];
      if (dropPl.feedback && dropPl.feedback[draggableLabel]) {
        feedback = dropPl.feedback[draggableLabel];
      } else if (dragPl.feedback && dragPl.feedback[droppableLabel]) {
        feedback = dragPl.feedback[droppableLabel];
      } else if (dropPl.feedback && dropPl.feedback.DEFAULT) {
        feedback = dropPl.feedback.DEFAULT;
      } else if (dragPl.feedback && dragPl.feedback.DEFAULT) {
        feedback = dragPl.feedback.DEFAULT;
      } else {
        feedback = '[ERROR: no feedback set]';
      }
      
      // check combined feedback and add it if necessary
      feedback += this.getComboFeedback(draggableLabel, droppableLabel, true);
      
      return feedback;
    },
    
    getComboFeedback: function(draggableLabel, droppableLabel, inHtml) {
      // inHtml: if true or undefined, return combined feedback as an HTML string.
      //   If false, return an array of strings (based on the payload, so they may have HTML formatting).
      if (!window.draganddrop.combinedfeedback) {
        // no combined feedback in the exercise
        return inHtml === false ? [] : '';
      }
      var feedback = [];
      var len = window.draganddrop.combinedfeedback.length;
      for (var i = 0; i < len; ++i) {
        var comboObj = window.draganddrop.combinedfeedback[i];
        if (comboObj.combo && comboObj.feedback) {
          var comboFulfilled = true;
          var currentAnswerInCombo = false;
          for (var j = 0; j < comboObj.combo.length; ++j) {
            var pair = comboObj.combo[j]; // draggable label, droppable label
            // no type checking in the if since integer labels may be integers or strings
            // after parsing JSON/HTML and accessing via the jQuery data API
            if (pair[0] == draggableLabel && pair[1] == droppableLabel) {
              // check that the current answer is part of the combo
              currentAnswerInCombo = true;
            }
            // droppables may reuse the same label, hence all of those droppables must be
            // checked to see if their answer is part of the combo
            var foundAnswer = false;
            for (var k = 0; k < this.droppablesByLabel[pair[1]].length; ++k) {
              var dropId = this.droppablesByLabel[pair[1]][k];
              if (this.latestAnswers[dropId] === pair[0]) {
                // the latest answer to the droppable should be the draggable given in the pair in order to fulfil the combo
                foundAnswer = true;
                break;
              }
            }
            if (!foundAnswer) {
              comboFulfilled = false;
              break; // this combo is not fulfilled since this pair is missing
            }
          }
          if (comboObj.combo.length > 0 && comboFulfilled && currentAnswerInCombo) {
            feedback.push(comboObj.feedback);
          }
        }
      }
      if (inHtml === false) {
        return feedback;
      } else {
        var html = '';
        var len = feedback.length;
        for (var i = 0; i < len; ++i) {
          html += '<br>' + '<span class="draganddrop-combinedfeedback">' + feedback[i] + '</span>';
        }
        return html;
      }
    },
    
    isCorrectAnswer: function(draggableLabel, droppableLabel) {
      var dropPayload = this.droppablesPayload[droppableLabel];
      var isCorrect = false;
      if (Array.isArray(dropPayload.correct)) {
        if (dropPayload.correct.indexOf(draggableLabel) !== -1) {
          // is the draggableLabel in the array of expected correct draggables?
          isCorrect = true;
        }
      } else {
        if (dropPayload.correct === draggableLabel) {
          isCorrect = true;
        }
      }
      return isCorrect;
    },
    
    checkCompletion: function() {
      if (this.correctAnswers >= this.maxCorrectAnswers) {
        this.completed = true;
        this.dragsLeftMsgDiv.hide();
        this.completeDiv.text(this.completeDiv.attr(this.settings.complete_msg_attr));
        this.completeDiv.removeClass('hide').show();
        this.grade();
        this.sendLog();
      }
    },
    
    grade: function() {
      var self = this;
      
      if (window.location.pathname.substring(0, 6) !== '/html/') {
        // hide this uploading message when acos html protocol is used since it does not store any grading
        this.completeDiv.text(this.completeDiv.attr(this.settings.complete_uploading_msg_attr));
      }
      
      var scorePercentage = Math.round(this.maxCorrectAnswers / (this.correctAnswers + this.incorrectAnswers) * 100);
      
      // show final points
      this.addFinalPointsString(this.pointsDiv, scorePercentage);
      // feedback for the grading event that is sent to the server
      var feedback = this.buildFinalFeedback();
      if (window.ACOS) {
        // set max points to 100 since the points are given as a percentage 0-100%
        ACOS.sendEvent('grade', { max_points: 100, points: scorePercentage, feedback: feedback }, function(content, error) {
          if (error) {
            // error in uploading the grading result to the server, show a message to the user
            self.completeDiv.text(self.completeDiv.attr(self.settings.complete_error_msg_attr) + error.error);
            return;
          }
          // the grading result has been sent to the server
          if (window.location.pathname.substring(0, 6) !== '/html/') {
            // hide this uploading message when acos html protocol is used since it does not store any grading
            self.completeDiv.text(self.completeDiv.attr(self.settings.complete_uploaded_msg_attr));
          }
        });
      }
    },
    
    sendLog: function() {
      if (window.ACOS) {
        window.ACOS.sendEvent('log', this.answerLog);
      }
    },
    
    // disable a draggable element so that it cannot be dragged anymore
    disableDraggable: function(draggableLabel) {
      var dragElem = this.draggablesContainer.find(this.settings.draggable_selector + "[data-label='" + draggableLabel + "']");
      dragElem.attr('draggable', 'false').addClass('disabled');
    },
    
    updatePoints: function() {
      this.correctPointsElem.text(this.correctAnswers);
      this.wrongPointsElem.text(this.incorrectAnswers);
      this.pointsDiv.removeClass('hide').show();
    },
    
    updateCorrectDragsLeftMessage: function() {
      if (this.correctAnswers >= 0.5 * this.maxCorrectAnswers) {
        var left = this.maxCorrectAnswers - this.correctAnswers; // how many correct answers left
        var msgAttr = (left === 1) ? this.settings.drags_left_singular_msg_attr : this.settings.drags_left_plural_msg_attr;
        var msg = this.dragsLeftMsgDiv.attr(msgAttr);
        msg = msg.replace('{counter}', left.toString());
        this.dragsLeftMsgDiv.html(msg);
        this.dragsLeftMsgDiv.removeClass('hide').show();
      }
    },
    
    updateFeedback: function(feedback, isCorrect) {
      this.feedbackDiv.html(feedback).removeClass('correct wrong');
      if (isCorrect) {
        this.feedbackDiv.addClass('correct');
      } else {
        this.feedbackDiv.addClass('wrong');
      }
    },
    
    revealAnswerInDroppable: function(draggableLabel, droppableElem) {
      var dragPayload = this.draggablesPayload[draggableLabel];
      // if the reveal value is not defined in the payload,
      // the default action is to replace the droppable content with the draggable content
      if (dragPayload.reveal === false) {
        // if the reveal value is set to false in the payload,
        // do not reveal anything and keep the droppable text intact
        return;
      }
      
      if (dragPayload.reveal) {
        // nested <span> elements are used to hack with pointer events in the drag-and-drop API
        // and they are also used to separate the prepend and append reveal values
        // from the other droppable content
        droppableElem.find('span.drop-reveal').remove(); // remove previous reveals (append and prepend)
        if (dragPayload.reveal.replace) {
          droppableElem.html('<span>' + dragPayload.reveal.replace + '</span>');
        }
        if (dragPayload.reveal.append) {
          droppableElem.append('<span class="small drop-reveal"> [' + dragPayload.reveal.append + ']</span>');
        }
        if (dragPayload.reveal.prepend) {
          droppableElem.prepend('<span class="small drop-reveal">[' + dragPayload.reveal.prepend + '] </span>');
        }
      } else {
        // by default, replace the droppable content with the draggable content
        droppableElem.html('<span>' + dragPayload.content + '</span>');
      }
    },
    
    detachDragEventHandlers: function() {
      this.element.find(this.settings.droppable_selector)
        .off('dragover dragenter dragleave drag');
      this.draggablesContainer.find(this.settings.draggable_selector)
        .off('dragstart dragend')
        .attr('draggable', 'false')
        .addClass('finished');
    },
    
    addFinalPointsString: function(pointsElem, scorePercentage) {
      // string to format, fill in score
      var finalPointsStr = pointsElem.attr(this.settings.final_points_msg_attr);
      finalPointsStr = finalPointsStr.replace('{score}', scorePercentage.toString());
      // prepend the final score HTML to the points element
      pointsElem.prepend(finalPointsStr);
    },
    
    setInfoPosition: function() {
      if ($(window).height() * 0.8 > this.contentDiv.height()) {
        // exercise content fits easily in the window
        // use normal positioning for the info box
        this.infoDiv.removeClass('fixed');
        this.contentDiv.removeClass('fixed-info');
        this.infoDiv.css('maxHeight', ''); // remove css property
        this.contentDiv.css('marginBottom', '');
      } else {
        // exercise content takes most space in the window or does not fit in:
        // use fixed positioning for the info box to keep it visible on the screen
        this.infoDiv.addClass('fixed');
        this.contentDiv.addClass('fixed-info');
        var h = $(window).height() * 0.25;
        this.infoDiv.css('maxHeight', h);
        this.contentDiv.css('marginBottom', h);
      }
    },
    
    setDraggablesPosition: function() {
      // make the draggables container fixed if it cannot be seen: the window is too small
      // to fit everything on the screen at once
      
      if ($(window).height() * 0.8 > this.contentDiv.height()) {
        // exercise content fits easily in the window
        // use normal positioning for the draggables container
        this.draggablesContainer.removeClass('fixed');
        this.contentDiv.removeClass('fixed-draggables');
        this.draggablesContainer.css('maxHeight', $(window).height() * 0.25);
        // max height prevents the draggables container from becoming massive if there are many draggables
        this.contentDiv.css('marginTop', ''); // remove css property
      } else {
        // exercise content takes most space in the window or does not fit in:
        // use fixed positioning for the draggables container to keep it visible on the screen
        this.draggablesContainer.addClass('fixed');
        this.contentDiv.addClass('fixed-draggables');
        this.draggablesContainer.css('maxHeight', ''); // remove maxHeight to measure real height
        var h = Math.min(this.draggablesContainer.height(), $(window).height() * 0.25);
        this.draggablesContainer.css('maxHeight', h);
        this.contentDiv.css('marginTop', h);
      }
    },
    
    buildFinalFeedback: function() {
      // let the server backend create the HTML of the final feedback
      // only upload the submission data here (what the student answered in each droppable)
      // if the frontend JS could post feedback HTML to the server, a malicious user could
      // inject scripts that create XSS vulnerabilities in the frontend learning management system
      return {
        answers: this.questionAnswered,
        correctAnswers: this.correctAnswers,
        incorrectAnswers: this.incorrectAnswers,
      };
    },
  
  });
  
  // attach a method to jQuery objects that initializes drag-and-drop exercise
  // in the elements matched by the jQuery object
  $.fn[pluginName] = function(options) {
    return this.each(function() {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new AcosDragAndDrop(this, options));
      }
    });
  };
})(jQuery, window, document);

jQuery(function() {
  jQuery('.draganddrop').acosDragAndDrop();
});
