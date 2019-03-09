function newElement (HTML) {
  var div = document.createElement('div');
  div.innerHTML = HTML;
  return div.children[0];
}

function injectElement (el, HTML) {
  el.innerHTML = HTML;
}

function hasClass(ele, class1) {
  var classes = ele.className;
  var regex = new RegExp('\\b' + class1 + '\\b');
  return classes.match(regex) !== null;
}

function toggleClass(ele, class1) {
  var classes = ele.className;
  var regex = new RegExp('\\b' + class1 + '\\b');
  var hasOne = classes.match(regex);
  class1 = class1.replace(/\s+/g, '');
  if (hasOne)
    ele.className = classes.replace(regex, '');
  else
    ele.className = classes + ' ' + class1;
}

function addClass(ele, class1) {
  var classes = ele.className;
  var regex = new RegExp('\\b' + class1 + '\\b');
  var hasOne = classes.match(regex);
  class1 = class1.replace(/\s+/g, '');
  if (!hasOne)
    ele.className = classes + ' ' +class1;
}

function removeClass(ele, class1) {
  var classes = ele.className;
  var regex = new RegExp('\\b' + class1 + '\\b');
  var hasOne = classes.match(regex);
  class1 = class1.replace(/\s+/g, '');
  if (hasOne)
    ele.className = classes.replace(regex, '');
}

function handle(eventName, eleId, cb) {
  var ele = document.getElementById(eleId);
  if(ele) ele.addEventListener(eventName, cb);
}
