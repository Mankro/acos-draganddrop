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
    this.questionAnswered = {};
    this.droppablesByLabel = {};
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
            .text(text)
            .appendTo(self.draggablesContainer);
        }
      }
      
      var idCounter = 0;
      // attach event handlers to the draggable and droppable elements in the exercise as well as
      // generate and add unique IDs to the droppable elements
      this.element.find(this.settings.droppable_selector).each(function() {
        var uniqueId = idCounter++;
        $(this).data('id', uniqueId);
        // set the id to an attribute as well so that it is available to
        // the final feedback when the exercise DOM is cloned
        $(this).attr('data-id', uniqueId);
        
        var questionLabel = $(this).data('label'); // labels are set by the teacher, they may repeat the same values
        if (Array.isArray(self.droppablesByLabel[questionLabel])) {
          self.droppablesByLabel[questionLabel].push(uniqueid);
        } else {
          self.droppablesByLabel[questionLabel] = [uniqueId];
        }
        
        self.questionAnswered[uniqueId] = [];
        
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
      });
      
      this.draggablesContainer.find(this.settings.draggable_selector)
        .on('dragstart', function(e) {
          self.handleDragStart(e);
        })
        .on('dragend', function(e) {
          self.handleDragEnd(e);
        });
        
      
      /*this.setInfoPosition(); //TODO
      $(window).on('resize', function() {
        self.setInfoPosition();
      });*/
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
    },
    
    checkAnswer: function(draggableLabel, droppableLabel, droppableElem) {
      // if the correct answer has been given for this droppable, ignore the drag event
      if (droppableElem.hasClass('correct')) {
        return;
      }
      
      var wasAnswered = true;
      if (this.questionAnswered[droppableElem.data('id')].indexOf(draggableLabel) === -1) {
        this.questionAnswered[droppableElem.data('id')].push(draggableLabel);
        wasAnswered = false;
      }
      
      var dragPayload = this.draggablesPayload[draggableLabel];
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
      
      var feedback = this.getFeedback(draggableLabel, droppableLabel);
      this.feedbackDiv.html(feedback).removeClass('correct wrong');
      droppableElem.removeClass('correct wrong');
      if (isCorrect) {
        this.feedbackDiv.addClass('correct');
        droppableElem.addClass('correct');
        if (!wasAnswered) {
          this.correctAnswers++;
        }
        // if the same draggable should not be reused after finding the correct droppable for it (default: allow reuse)
        if (dragPayload.reuse === false) {
          this.disableDraggable(draggableLabel);
        }
      } else {
        this.feedbackDiv.addClass('wrong');
        droppableElem.addClass('wrong');
        if (!wasAnswered) {
          this.incorrectAnswers++;
        }
      }
      
      // reveal text defined by the draggable in the droppable
      if (!wasAnswered) {
        if (dragPayload.reveal) {
          if (dragPayload.reveal.replace) {
            droppableElem.html('<span>' + dragPayload.reveal.replace + '</span>');
          }
          if (dragPayload.reveal.append) {
            droppableElem.find('span.drop-reveal').remove(); // remove previous reveals
            droppableElem.append('<span class="small drop-reveal"> [' + dragPayload.reveal.append + ']</span>');
          }
          if (dragPayload.reveal.prepend) {
            droppableElem.find('span.drop-reveal').remove(); // remove previous reveals
            droppableElem.prepend('<span class="small drop-reveal">[' + dragPayload.reveal.prepend + '] </span>');
          }
        } else {
          // by default, replace the droppable content with the draggable content
          droppableElem.html('<span>' + dragPayload.content + '</span>');
        }
      }
      
      this.updatePoints();
      this.updateCorrectDragsLeftMessage();
      
      //TODO check complete, send grading
      //TODO click on old answers (droppables with some draggable in) to show feedback for those again
    },
    
    getFeedback: function(draggableLabel, droppableLabel) {
      var feedback;
      if (this.droppablesPayload[droppableLabel].feedback && this.droppablesPayload[droppableLabel].feedback[draggableLabel]) {
        feedback = this.droppablesPayload[droppableLabel].feedback[draggableLabel];
      } else if (this.draggablesPayload[draggableLabel].feedback && this.draggablesPayload[draggableLabel].feedback[droppableLabel]) {
        feedback = this.draggablesPayload[draggableLabel].feedback[droppableLabel];
      } else if (this.droppablesPayload[droppableLabel].feedback && this.droppablesPayload[droppableLabel].feedback.DEFAULT) {
        feedback = this.droppablesPayload[droppableLabel].feedback.DEFAULT;
      } else if (this.draggablesPayload[draggableLabel].feedback && this.draggablesPayload[draggableLabel].feedback.DEFAULT) {
        feedback = this.draggablesPayload[draggableLabel].feedback.DEFAULT;
      } else {
        feedback = '[ERROR: no feedback set]';
      }
      
      // check combined feedback and add it if necessary
      if (window.draganddrop.combinedfeedback) {
        var len = window.draganddrop.combinedfeedback.length;
        for (var i = 0; i < len; ++i) {
          var comboObj = window.draganddrop.combinedfeedback[i];
          if (comboObj.combo && comboObj.feedback) {
            var comboFulfilled = true;
            var currentAnswerInCombo = false;
            for (var j = 0; j < comboObj.combo.length; ++j) {
              var pair = comboObj.combo[j]; // draggable label, droppable label
              if (pair[0] === draggableLabel && pair[1] === droppableLabel) {
                // check that the current answer is part of the combo
                currentAnswerInCombo = true;
              }
              // droppables may reuse the same label, hence all of those droppables must be
              // checked to see if their answer is part of the combo
              var foundAnswer = false;
              for (var k = 0; k < this.droppablesByLabel[pair[1]].length; ++k) {
                var dropId = this.droppablesByLabel[pair[1]][k];
                if (this.questionAnswered[dropId][this.questionAnswered[dropId].length - 1] === pair[0]) {
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
              feedback += '<br>' + comboObj.feedback;
            }
          }
        }
      }
      
      return feedback;
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
