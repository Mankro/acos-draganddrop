(function(){var e,t,a={}.hasOwnProperty;e=function(){class e{constructor(e,t){this.element=$(e),this.settings=$.extend({},this.constructor.defaults,t),this.draggablesPayload=window.draganddrop.draggables,this.droppablesPayload=window.draganddrop.droppables,this.latestAnswers={},this.droppablesByLabel={},this.origDropContents={},this.contentDiv=this.element.find(this.settings.content_selector),this.feedbackDiv=this.element.find(this.settings.feedback_selector),this.infoDiv=this.element.find(this.settings.info_selector)}getFeedback(e,t,a){var r,s,n;return n=void 0,s=this.droppablesPayload[t],r=this.draggablesPayload[e],n=s.feedback&&s.feedback[e]?s.feedback[e]:r.feedback&&r.feedback[t]?r.feedback[t]:s.feedback&&s.feedback.DEFAULT?s.feedback.DEFAULT:r.feedback&&r.feedback.DEFAULT?r.feedback.DEFAULT:"[ERROR: no feedback set]",n+=this.getComboFeedback(e,t,a,!0)}getComboFeedback(e,t,a,r){var s,n,o,i,d,l,c,h,p,b,g,f,v,u,w,k,m,y,C,A;if(!window.draganddrop.combinedfeedback)return!1===r?[]:"";for(d=[],window.draganddrop.combinedfeedback.length,c=0,b=(m=window.draganddrop.combinedfeedback).length;c<b;c++)if((n=m[c]).combo&&n.feedback){for(s=!0,o=!1,A=!0===n.useDroppableId,h=0,g=(y=n.combo).length;h<g;h++){if(w=y[h],!o&&w[0]===e&&(!A&&w[1]===t||A&&w[1].toString()===a.toString())&&(o=!0),k=!1,A)this.latestAnswers[w[1]]===w[0]&&(k=!0);else for(p=0,f=(C=this.droppablesByLabel[w[1]]).length;p<f;p++)if(i=C[p],this.latestAnswers[i]===w[0]){k=!0;break}if(!k){s=!1;break}}n.combo.length>0&&s&&o&&d.push(n.feedback)}if(!1===r)return d;for(l="",u=0,v=d.length;u<v;u++)l+='<br><span class="draganddrop-combinedfeedback">'+d[u]+"</span>";return l}isCorrectAnswer(e,t){var a,r;return a=this.droppablesPayload[t],r=!1,Array.isArray(a.correct)?-1!==a.correct.indexOf(e)&&(r=!0):a.correct===e&&(r=!0),r}updateFeedback(e,t){this.feedbackDiv.html(e).removeClass("correct wrong"),t?this.feedbackDiv.addClass("correct"):this.feedbackDiv.addClass("wrong")}revealAnswerInDroppable(e,t,a){var r,s,n,o,i,d,l,c,h,p,b,g,f;i=t.data("id"),o=this.draggablesPayload[e],n=!1,null==(d=this.droppablesPayload[t.data("label")]).revealCorrect&&a||null==d.revealWrong&&!a?(!1===o.reveal||!1===o.revealCorrect&&a||!1===o.revealWrong&&!a)&&(n=!0):(!1===d.revealCorrect&&a||!1===d.revealWrong&&!a)&&(n=!0),n?t.html(this.origDropContents[i]):(l=function(e,t){var a,r,s,n;for(a=r=0,n=(s=["replace","append","prepend"]).length;0<=n?r<n:r>n;a=0<=n?++r:--r)e.hasOwnProperty(s[a])&&(t[a]=e[s[a]])},g=[p=!1,r=!1,c=!1],f=!1,d.revealCorrect&&a?l(d.revealCorrect,g):d.revealWrong&&!a?l(d.revealWrong,g):o.reveal?l(o.reveal,g):o.revealCorrect&&a?l(o.revealCorrect,g):o.revealWrong&&!a?l(o.revealWrong,g):f=!0,f?p=o.content:(p=g[0],r=g[1],c=g[2]),h="",b="",s="",b=p?"<span>"+p+"</span>":this.origDropContents[i],r&&(s='<span class="small drop-reveal"> ['+r+"]</span>"),c&&(h='<span class="small drop-reveal">['+c+"] </span>"),t.html(h+b+s))}setInfoPosition(){var e;.8*$(window).height()>this.contentDiv.height()?(this.infoDiv.removeClass("fixed"),this.contentDiv.removeClass("fixed-info"),this.infoDiv.css("maxHeight",""),this.contentDiv.css("marginBottom","")):(this.infoDiv.addClass("fixed"),this.contentDiv.addClass("fixed-info"),e=.25*$(window).height(),this.infoDiv.css("maxHeight",e),this.contentDiv.css("marginBottom",e))}}return e.defaults={feedback_selector:".draganddrop-feedback",droppable_selector:".droppable",content_selector:".draganddrop-content",info_selector:".draganddrop-info"},e}.call(this),t=function(){class t extends e{constructor(e,t){var a,r;super(e,t),this.questionAnswered=window.draganddrop.answers,[r,a]=this.checkPayloadSanity(),r?this.init():console.error("Error in initialization, aborting: "+a)}checkPayloadSanity(){var e,t,r;if(![this.draggablesPayload,this.droppablesPayload,this.questionAnswered].every(function(e){return null!=e}))return[!1,"Feedback payload is missing!"];if("object"!=typeof this.questionAnswered||Array.isArray(this.questionAnswered))return[!1,"Feedback payload has the wrong type!"];for(t in r=this.questionAnswered)if(a.call(r,t)&&(e=r[t],!Array.isArray(e)))return[!1,"Feedback payload is invalid!"];return[!0,""]}init(){var e,t;t=this,e=0,this.element.find(this.settings.droppable_selector).each(function(){var a,r,s,n,o,i,d,l,c,h,p,b,g;if(g=e++,$(this).data("id",g),p=$(this).data("label"),Array.isArray(t.droppablesByLabel[p])?t.droppablesByLabel[p].push(g):t.droppablesByLabel[p]=[g],t.origDropContents[g]=$(this).html(),n=void 0,!((r=t.questionAnswered[g])&&r.length>0))return!0;if(n=r[r.length-1],t.latestAnswers[g]=n,i=$(this),l=t.isCorrectAnswer(n,p),t.revealAnswerInDroppable(n,i,l),l?(i.addClass("correct"),(s=t.draggablesPayload[n]).htmlclass&&i.addClass(s.htmlclass)):i.addClass("wrong"),r.length>1){for(a=$("<select>"),d=c=0,b=r.length;0<=b?c<b:c>b;d=0<=b?++c:--c)o=t.constructor.getTextContent(t.draggablesPayload[r[d]].content,r[d]),(h=$("<option>")).attr("value",r[d]).text(o),d===r.length-1&&h.prop("selected",!0),h.appendTo(a);i.after(a),a.change(function(){var e,r,s;return s=t.latestAnswers[g],(r=t.draggablesPayload[s]).htmlclass&&i.removeClass(r.htmlclass),e=a.val(),t.latestAnswers[g]=e,t.showFeedback(e,i)})}}).click(function(e){var a,r,s;s=(r=$(this)).data("id"),a=t.latestAnswers[s],t.showFeedback(a,r)}),this.setInfoPosition(),$(window).on("resize",function(){return t.setInfoPosition()})}showFeedback(e,t){var a,r,s,n;e?(r=t.data("label"),this.droppablesPayload[r]&&this.draggablesPayload[e]?(n=this.isCorrectAnswer(e,r),s=this.getFeedback(e,r,t.data("id")),this.updateFeedback(s,n),t.removeClass("correct wrong"),n?(t.addClass("correct"),(a=this.draggablesPayload[e]).htmlclass&&t.addClass(a.htmlclass)):t.addClass("wrong"),this.revealAnswerInDroppable(e,t,n)):this.feedbackDiv.text("[Error: payload not set]")):this.feedbackDiv.text("[Error: answer not set]")}static stripHTML(e){return $("<div>").html(e).text().trim()}static getTextContent(e,a){var r,s,n,o,i,d,l,c,h;if(!e)return a;if(h=t.stripHTML(e))return h;for(s=null,n=0,o=(d=$.parseHTML(e)).length;n<o;n++)if("IMG"===(i=d[n]).nodeName.toUpperCase()){s=$(i);break}return s?(r=null!=(l=s.attr("alt"))?l.trim():void 0)?r:(c=s.attr("src"))?c.substring(c.lastIndexOf("/")+1):a:a}}return t.pluginName="acosDragAndDropFeedback",t}.call(this),$.fn[t.pluginName]=function(e){return this.each(function(){$.data(this,"plugin_"+t.pluginName)||$.data(this,"plugin_"+t.pluginName,new t(this,e))})},$(function(){return $(".draganddrop").acosDragAndDropFeedback()})}).call(this);