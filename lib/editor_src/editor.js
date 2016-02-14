'use strict';
console.log('EDIT MODE');

function setValue(el) {
  var value = el.value || el.innerText;
  el.dataset.value_memo = value;
}

function updateValue(el, f) {
  var value = el.value || el.innerText;
  if (value != el.dataset.value_memo) {
    f(el);
  }
}

function preRoute(ctx, next) {
   closeSubMenu();
   setTimeout(next, 500);
}

function loadSiteData (ctx, next) {
  getData('/site', ctx, next);
}

var onSiteVars = function (ctx) {
  showVarSubMenu (ctx.params.data)
};

function loadPageData (ctx, next) {
  getData('/page/'+_PAGE_ID, ctx, next);
}

var onPageVars = function (ctx) {
  showVarSubMenu (ctx.params.data)
};


function loadPages () {
}
var onPages = function () { console.log("PAGES"); };

function loadCollections () {
}
var onCollections = function () { console.log("COLLECTIONS"); };

function loadUsers (ctx, next) {
}
var onUsers = function (ctx, next) {
  console.log("USERS");
}

function toggleMenu() {
  var menu = document.getElementById('poros-menu');
  toggleClass(menu, 'poros-menu-closed');
  var toggle = document.getElementById('poros-toggle');
  toggleClass(toggle, 'poros-menu-closed');
}

function closeSubMenu() {
  var menu = document.getElementById('poros-sub-menu');
  addClass(menu, 'poros-menu-closed');
}

window.addEventListener('load', function(){
  tinymce.init({
    selector: 'span.editable',
    inline: true,
    toolbar: 'undo redo',
    menubar: false,
    setup: function(editor) {
      editor.on('blur', saveModel);
    }
  });

  //insert the menu anchor element
  var menuEl = newElement(
    "<div id='poros-menu' class='_poros-menu-closed'>"+
      "<h1>MENU</h1>"+
      "<ul>"+
        "<li><a href='/poros-site-vars'>-SITE VARS</a>"+
        "<li><a href='/poros-page-vars'>-PAGE VARS</a>"+
        "<li><a href='/poros-pages'>-PAGES</a>"+
        "<li><a href='/poros-collections'>-COLLECTIONS</a>"+
        "<li><a href='/poros-users'>-USERS</a>"+
      "</ul>"+
      "<div id='poros-sub-menu' class='poros-menu-closed'>"+
    "</div>"
  );
  document.body.appendChild(menuEl);
  var toggleEl = newElement(
    "<div id='poros-toggle' class='_poros-menu-closed' onClick='toggleMenu();'>&lt;---</div>"
  );
  document.body.appendChild(toggleEl);
  var busyEl = newElement(
    "<img id='poros-status' src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' />"
  );
  document.body.appendChild(busyEl);

  page('/poros-site-vars', preRoute, loadSiteData, onSiteVars);
  page('/poros-page-vars', preRoute, loadPageData, onPageVars);
  page('/poros-pages', preRoute, loadUsers, onUsers);
  page('/poros-collections', preRoute, loadUsers, onUsers);
  page('/poros-users', preRoute, loadUsers, onUsers);
  page({hashbang: true});
}, false )




function showVarSubMenu (data) {
  var subMenu = document.getElementById('poros-sub-menu');
  var menuHTML = "";

  menuHTML += "<h2>VARS</h2>";
  menuHTML += "<span id='poros-menu-close-button' onClick='closeSubMenu()'>&gt;&lt;</span>";

  if (data) {
    menuHTML += "<ul>";
    for (var i = 0; i < data.length; i++) {
      var _var = data[i];
      var displayName = _var.name[0] == '_' ? _var.name.substr(1) : _var.name;
      displayName = displayName.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
      var value = _var.value;
      if(typeof _var.value === 'string') value = _var.value.replace("'", "&#39;");
      menuHTML += "<li>";
      menuHTML += displayName + "<br />";
      if (_var.type == 'text') {
        menuHTML += "<textarea ";
      } else {
        menuHTML += "<input ";
        if (_var.type == 'string') {
          menuHTML += "type='text' ";
        } else if (_var.type == 'number') {
          menuHTML +=" type='number' ";
        } else if (_var.type == 'email') {
          menuHTML +=" type='email' ";
        } else if (_var.type == 'phone') {
          menuHTML +=" type='phone' ";
        }  else {
          menuHTML += "type='text' ";
        }
      }
      if (_var.type != 'text') menuHTML += "value='"+value+"'";
      menuHTML += "data-key='"+_var.key+"'";
      menuHTML += "data-name='"+_var.name+"'";
      if (_var.id) menuHTML += "data-id='"+_var.id+"'";
      menuHTML += "onFocus='setValue(this)'";
      menuHTML += "onBlur='updateValue(this, enqueueData)'";
      if (_var.type == 'text') {
        menuHTML += ">";
        menuHTML += value;
        menuHTML += "</textarea>";
      } else {
        menuHTML += "/>";
      }
    }
    menuHTML += "</ul>";
  }
  injectElement(subMenu, menuHTML);
  addClass(subMenu, 'small');
  removeClass(subMenu, 'poros-menu-closed');
}
