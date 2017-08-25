/* Drag-and-drop final feedback (in A+, it is shown on a separate submission page)
 * This script enables event handlers in the final feedback: the feedback for each
 * droppable is shown when the user clicks on the element. If the student answered
 * a droppable with multiple draggables (some of them must have been incorrect),
 * a select menu is added after each droppable as well so that the user may view
 * feedback for the other answers.
 * This final feedback page is not used to make new submissions to the exercise;
 * it only shows the state of a previous submission.
 */
document.addEventListener("DOMContentLoaded", function() {

function initDragAndDropFeedback(element, options, $, window, document, undefined) {
  "use strict";
  
  var pluginName = 'acosDragAndDropFeedback';
  var defaults = {
    feedback_selector: '.draganddrop-feedback',
    info_selector: '.draganddrop-info',
    content_selector: '.draganddrop-content',
    droppable_selector: '.droppable',
  };
  
  function AcosDragAndDropFeedback(element, options) {
    this.element = $(element);
    this.settings = $.extend({}, defaults, options);
    
    this.draggablesPayload = window.draganddrop.draggables;
    this.droppablesPayload = window.draganddrop.droppables;
    this.questionAnswered = window.draganddrop.answers; // answers to each droppable (key: droppable unique id)
    
    // sanity check for the payload
    var allDefined = ([this.draggablesPayload, this.droppablesPayload, this.questionAnswered].every(function(x) {
      return typeof x !== 'undefined' && x !== null;
    }));
    if (!allDefined) {
      console.error("Feedback payload is missing!");
      return;
    }
    if (typeof this.questionAnswered === 'object') {
      // arrays have type "object" too
      for (var t in this.questionAnswered) {
        if (this.questionAnswered.hasOwnProperty(t) && !Array.isArray(this.questionAnswered[t])) {
          console.error("Feedback payload is invalid!");
          return;
        }
      }
    } else {
      console.error("Feedback payload is invalid!");
      return;
    }
    
    this.latestAnswers = {}; // latest answer selected for each droppable (key: droppable unique id)
    this.droppablesByLabel = {}; // array of droppable unique ids for each droppable label (key: droppable label)
    this.origDropContents = {}; // original HTML contents of the droppables (key: droppable unique id)
    this.feedbackDiv = this.element.find(this.settings.feedback_selector);
    this.infoDiv = this.element.find(this.settings.info_selector);
    this.contentDiv = this.element.find(this.settings.content_selector);
    this.init();
  }
  
  $.extend(AcosDragAndDropFeedback.prototype, {
  
    init: function() {
      var self = this;
      
      var idCounter = 0;
      this.element.find(this.settings.droppable_selector).each(function() {
        var uniqueId = idCounter++;
        $(this).data('id', uniqueId);
        var questionLabel = $(this).data('label'); // labels are set by the teacher, they may repeat the same values
        
        if (Array.isArray(self.droppablesByLabel[questionLabel])) {
          self.droppablesByLabel[questionLabel].push(uniqueId);
        } else {
          self.droppablesByLabel[questionLabel] = [uniqueId];
        }
        
        self.origDropContents[uniqueId] = $(this).html();
        
        // initialize the latestAnswers variable (the latest answers in the submission,
        // the variable will then keep track of the latest selected answer)
        var answers = self.questionAnswered[uniqueId];
        var draggableLabel = undefined;
        if (answers && answers.length > 0) {
          draggableLabel = answers[answers.length - 1];
        } else {
          return true; // no answers set, continue to the next element in iteration
        }
        self.latestAnswers[uniqueId] = draggableLabel;
        
        var droppableElem = $(this);
        var isCorrect = self.isCorrectAnswer(draggableLabel, questionLabel);
        // set the reveal effect of the latest answer inside the droppable element
        self.revealAnswerInDroppable(draggableLabel, droppableElem, isCorrect);
        // set correct or wrong style
        if (isCorrect) {
          droppableElem.addClass('correct');
        } else {
          droppableElem.addClass('wrong');
        }
        
        // create the select menu for showing the feedback of other answers for this droppable
        if (answers.length > 1) {
          var answerSelect = $('<select>');
          for (var i = 0; i < answers.length; ++i) {
            var draggableText = getTextContent(self.draggablesPayload[answers[i]].content, answers[i]);
            var opt = $('<option>');
            opt.attr('value', answers[i]).text(draggableText);
            if (i === answers.length - 1) {
              // the last one is initially selected
              opt.prop('selected', true);
            }
            opt.appendTo(answerSelect);
          }
          // insert the select menu into the DOM after the droppable
          droppableElem.after(answerSelect);
          // event handler when the user selects something
          answerSelect.change(function() {
            var dragLabel = answerSelect.val();
            self.latestAnswers[uniqueId] = dragLabel;
            self.showFeedback(dragLabel, droppableElem);
          });
        }
      })
      .click(function(ev) {
        // If no other answer has been selected yet, show feedback for the last answer to this droppable.
        // Otherwise, show the most recently selected answer.
        var droppableElem = $(this);
        var uniqueId = droppableElem.data('id');
        var draggableLabel = self.latestAnswers[uniqueId];
        self.showFeedback(draggableLabel, droppableElem);
      });
      
      // the info/feedback box switches between normal and fixed positioning so that
      // it is always easily readable
      this.setInfoPosition();
      $(window).on('resize', function() {
        self.setInfoPosition();
      });
    },
    
    // event handler: show the feedback associated with the droppable element
    // either the user clicked on the droppable or selected an answer from the select menu
    showFeedback: function(draggableLabel, droppableElem) {
      if (!draggableLabel) {
        this.feedbackDiv.text("[Error: answer not set]");
        return;
      }
      var droppableLabel = droppableElem.data('label');
      
      if (!this.droppablesPayload[droppableLabel] || !this.draggablesPayload[draggableLabel]) {
        this.feedbackDiv.text("[Error: payload not set]");
        return;
      }
      
      // Update styles
      var isCorrect = this.isCorrectAnswer(draggableLabel, droppableLabel);
      
      var feedback = this.getFeedback(draggableLabel, droppableLabel, droppableElem.data('id'));
      this.updateFeedback(feedback, isCorrect);
      droppableElem.removeClass('correct wrong');
      if (isCorrect) {
        droppableElem.addClass('correct');
      } else {
        droppableElem.addClass('wrong');
      }
      
      // reveal text defined by the draggable in the droppable
      this.revealAnswerInDroppable(draggableLabel, droppableElem, isCorrect);
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
    
    getFeedback: function(draggableLabel, droppableLabel, droppableId) {
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
      feedback += this.getComboFeedback(draggableLabel, droppableLabel, droppableId, true);
      
      return feedback;
    },
    
    getComboFeedback: function(draggableLabel, droppableLabel, droppableId, inHtml) {
      // inHtml: if true or undefined, return combined feedback as an HTML string.
      //   If false, return an array of strings (based on the payload, so they may have HTML formatting).
      if (!window.draganddrop.combinedfeedback) {
        // no combined feedback in the exercise
        return inHtml === false ? [] : '';
      }
      var feedback = [];
      var len = window.draganddrop.combinedfeedback.length;
      // loop over all combined feedback and for each combination, check if the conditions are fulfilled
      for (var i = 0; i < len; ++i) {
        var comboObj = window.draganddrop.combinedfeedback[i];
        if (comboObj.combo && comboObj.feedback) {
          var comboFulfilled = true; // are all conditions (pairs) satisfied?
          var currentAnswerInCombo = false;
          // useDropId: if true, second part of the combo pair is a droppable unique id, not label
          var useDropId = comboObj.useDroppableId === true;
          // loop over the answers (draggable-droppable pairs) in the combo:
          // each pair must be satisfied in order to fulfill the combo
          for (var j = 0; j < comboObj.combo.length; ++j) {
            var pair = comboObj.combo[j]; // draggable label, droppable label/id
            // Check if the current answer is part of the combo
            // (one pair must match with the current answer): if not, the combo is not triggered.
            // no type checking in the if since integer labels may be integers or strings
            // after parsing JSON/HTML and accessing via the jQuery data API
            if (!currentAnswerInCombo && pair[0] == draggableLabel &&
                ((!useDropId && pair[1] == droppableLabel) || (useDropId && pair[1] == droppableId))) {
              currentAnswerInCombo = true;
            }
            
            // check if this pair is satisfied, i.e., the latest answer in the droppable is the draggable given in the pair
            var pairSatisfied = false;
            if (useDropId) {
              if (this.latestAnswers[pair[1]] === pair[0]) {
                pairSatisfied = true;
              }
            } else {
              // droppables may reuse the same label, hence all of those droppables must be
              // checked to see if their answer is part of the combo
              for (var k = 0; k < this.droppablesByLabel[pair[1]].length; ++k) {
                var dropId = this.droppablesByLabel[pair[1]][k];
                if (this.latestAnswers[dropId] === pair[0]) {
                  pairSatisfied = true;
                  break;
                }
              }
            }
            if (!pairSatisfied) {
              // this combo is not fulfilled since this pair is missing
              comboFulfilled = false;
              break;
            }
          }
          
          // are the conditions for this combined feedback fulfilled?
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
    
    updateFeedback: function(feedback, isCorrect) {
      this.feedbackDiv.html(feedback).removeClass('correct wrong');
      if (isCorrect) {
        this.feedbackDiv.addClass('correct');
      } else {
        this.feedbackDiv.addClass('wrong');
      }
    },
    
    revealAnswerInDroppable: function(draggableLabel, droppableElem, isCorrect) {
      var dropId = droppableElem.data('id');
      var dragPayload = this.draggablesPayload[draggableLabel];
      // if the reveal value is not defined in the payload,
      // the default action is to replace the droppable content with the draggable content
      if (dragPayload.reveal === false ||
          (dragPayload.revealCorrect === false && isCorrect) ||
          (dragPayload.revealWrong === false && !isCorrect)) {
        // if the reveal value is set to false in the payload,
        // do not reveal anything and keep the droppable text intact
        // The original content is set back here incase other answers have replaced
        // the droppable content with something else.
        droppableElem.html(this.origDropContents[dropId]);
        return;
      }
      
      // helper function for reading different types of reveal effects from the payload
      var getRevealValues = function(obj, arr) {
        var keys = ['replace', 'append', 'prepend'];
        for (var i = 0; i < keys.length; ++i) {
          if (obj.hasOwnProperty(keys[i])) {
            arr[i] = obj[keys[i]];
          }
        }
      };
      
      var replace = false;
      var append = false;
      var prepend = false;
      var revealArray = [replace, append, prepend];
      var useDefault = false;
      
      /* The draggable paylod may define the same reveal effects for both correct and
      incorrect answers, or separately for correct and incorrect answers. If the shared
      reveal effect is defined (field reveal), it is always used and the others are
      ignored (fields revealCorrect and revealWrong). Any kind of reveal is an object
      in the payload with one of the keys defined: replace, append, or prepend.
      */
      if (dragPayload.reveal) {
        getRevealValues(dragPayload.reveal, revealArray);
      } else if (dragPayload.revealCorrect && isCorrect) {
        getRevealValues(dragPayload.revealCorrect, revealArray);
      } else if (dragPayload.revealWrong && !isCorrect) {
        getRevealValues(dragPayload.revealWrong, revealArray);
      } else {
        // use default behaviour: replace with the draggable content
        useDefault = true;
      }
      
      if (useDefault) {
        replace = dragPayload.content;
      } else {
        replace = revealArray[0]; // the content that replaces the old one
        append = revealArray[1];
        prepend = revealArray[2];
      }
      var prependWrap = '';
      var replaceWrap = '';
      var appendWrap = '';
      
      // nested <span> elements are used to hack with pointer events in the drag-and-drop API
      // and they are also used to separate the prepend and append reveal values
      // from the other droppable content
      if (replace) {
        replaceWrap = '<span>' + replace + '</span>';
      } else {
        replaceWrap = this.origDropContents[dropId];
      }
      if (append) {
        appendWrap = '<span class="small drop-reveal"> [' + append + ']</span>';
      }
      if (prepend) {
        prependWrap = '<span class="small drop-reveal">[' + prepend + '] </span>';
      }
      
      droppableElem.html(prependWrap + replaceWrap + appendWrap);
    },
  });
  
  function stripHTML(htmlString) {
    // must wrap the argument string inside a new element so that we can get the whole text content
    return $('<div>').html(htmlString).text().trim();
  }
  
  function getTextContent(htmlString, label) {
    if (!htmlString) {
      return label;
    }
    var text = stripHTML(htmlString);
    if (text) {
      return text;
    }
    
    // text content of the draggable is empty, let's see if there is an <img>
    var nodes = $.parseHTML(htmlString);
    var img = null;
    for (var i = 0; i < nodes.length; ++i) {
      if (nodes[i].nodeName.toUpperCase() === 'IMG') {
        img = $(nodes[i]);
        break;
      }
    }
    
    if (!img) {
      // use the label since we cannot get any text from the HTML
      return label;
    }
    
    var alt = img.attr('alt'); // check the alt attr of the img
    if (alt) {
      alt = alt.trim();
      if (alt)
        return alt;
    }
    
    // try reading a filename from the img src URL
    var src = img.attr('src');
    if (src) {
      // take the last part of the URL (after the last /) and assume it is a filename of the image
      // works if src has no / since lastIndexOf returns -1 then
      return src.substring(src.lastIndexOf('/') + 1);
    }
    
    return label;
  }
  
  // initialize an instance of the class
  return new AcosDragAndDropFeedback(element, options);
}


if (typeof require === 'function') {
  // in a require.js environment (such as Moodle)
  require(["jquery"], function(jQuery) {
    initDragAndDropFeedback(jQuery('.draganddrop'), {}, jQuery, window, document);
  });
} else {
  // jQuery is globally defined (for example, in A+)
  initDragAndDropFeedback(jQuery('.draganddrop'), {}, jQuery, window, document);
}
  
});

