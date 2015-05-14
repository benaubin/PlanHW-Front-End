//SPOILERS








//Turn back









//No srsly













//You are not listening








//Like spoilers... stop scrolling down



























//UGH


















//Fine - Here is the...





//List of cheat codes
// - ↑↑↓↓←→←→BA (Gives you a chainsaw)
// - /penguins (Changes all text to 'penguins!')

var kk=[],k="38,38,40,40,37,39,37,39,66,65,13",doc=$(document),pp=[],p="191,80,69,78,71,85,73,78,83,13";doc.keydown(function(e){kk.push(e.keyCode);if(kk.toString().indexOf(k)>=0){doc.unbind('keydown',arguments.callee);nd_mode="chainsaw";nd_vAlign="bottom";nd_hAlign="right";nd_vMargin="10";nd_hMargin="10";nd_target="_top";$("body").append('<script language="javascript" src="http://www.netdisaster.com/js/mynd.js"></script>')}});function toTitleCase(s){return s.replace(/\w\S*/g,function(t){return t.charAt(0).toUpperCase()+t.substr(1).toLowerCase();});} doc.keydown(function(e){pp.push(e.keyCode);if(pp.toString().indexOf(p)>=0){doc.unbind('keydown',arguments.callee);alert('PENGUINS!');$('p, a, h1, h2, h3, h4, h5').text('PENGUINS!')}});