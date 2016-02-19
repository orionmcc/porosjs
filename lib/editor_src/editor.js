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
   transitionSubmenu(next);
}

function loadSiteData (ctx, next) {
  getData('/site', 'data', ctx, next);
}

var onSiteVars = function (ctx) {
  showVarSubMenu (ctx.params.data)
};

function loadPageData (ctx, next) {
  getData('/page/'+_PAGE_ID, 'data', ctx, next);
}

var onPageVars = function (ctx) {
  showVarSubMenu (ctx.params.data)
};


function loadPages (ctx, next) {
  getData('/pages/', 'pages', ctx, next);
}
function loadTemplates (ctx, next) {
  getData('/site/templates/', 'templates', ctx, next);
}
var onPages = function (ctx, next) {
  showPagesSubMenu(ctx.params.pages, ctx.params.templates);
}

function loadCollections (ctx, next) {
}
var onCollections = function (ctx, next) { console.log("COLLECTIONS"); };

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

function transitionSubmenu(next) {
  closeSubMenu();
  setTimeout(next, 300);
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
  page('/poros-pages', preRoute, loadPages, loadTemplates, onPages);
  page('/poros-collections', preRoute, loadUsers, onUsers);
  page('/poros-users', preRoute, loadUsers, onUsers);
  page({hashbang: true, dispatch: window.location.hash != '' ? true: false});
}, false )



function showSubMenu (body) {
  var subMenu = document.getElementById('poros-sub-menu');
  var oldMenu = subMenu.innerHTML;
  var menuHTML = "";

  menuHTML += "<span id='poros-menu-close-button' onClick='closeSubMenu(); page.redirect(\"./\")'>&gt;&lt;</span>";
  menuHTML += body;
  injectElement(subMenu, menuHTML);
  addClass(subMenu, 'small');
  removeClass(subMenu, 'poros-menu-closed');

  return oldMenu;
}

function showVarSubMenu (data) {
  var menuHTML = "";
  menuHTML += "<h2>VARS</h2>";

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
      menuHTML += "onBlur='updateValue(this, enqueueEl)'";
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

  return showSubMenu(menuHTML);
}

function showPagesSubMenu (pages, templates) {
  var menuHTML = "";
  menuHTML += "<h2>PAGES</h2>";

  menuHTML += "<ul>";
  menuHTML += "<li><span class='poros-actionable' onClick='createPage("+JSON.stringify(templates)+")'>+ CREATE PAGE</span>";
  if (pages) {
    for (var i = 0; i < pages.length; i++) {
      menuHTML += "<li>";
      menuHTML += "<span class='poros-actionable' onClick='transitionSubmenu(function() {editPage("+JSON.stringify(pages[i])+", "+JSON.stringify(templates)+")})'>/"+pages[i].slug+"</span>";
    }
  }
  menuHTML += "</ul>";

  return showSubMenu(menuHTML);
}

function createPage(templates) {
  var name = prompt("What should we call this page?");
  if(name) transitionSubmenu(function() { editPage({id: null, slug: name}, templates); });
}

function editPage(data, templates) {
  console.log('Show sub menu for '+data.slug);
    var menuHTML = "";
    menuHTML += "<h2><a href='/"+data.slug+"/'>"+data.slug+"</a></h2>";

    menuHTML += "<form onSubmit='return false;' action='/'>";
    menuHTML += "<ul>";
    menuHTML += "<li>";
    menuHTML += "Slug <br />";
    menuHTML += "<input id='data-slug' type='text' name='select' value='"+data.slug+"'/>";
    menuHTML += "<li>";
    menuHTML += "Template <br />";
    menuHTML += "<select id='data-template' name='template'>";
    for (var i = 0; i < templates.length; i++) {
       menuHTML += "<option value='"+templates[i].value+"'"+(templates[i].value == data.template ? "selected" : "")+">"+templates[i].text+"</option>";
    }
    menuHTML += "</select>";
    menuHTML += "<li><button id='poros-button-okay' />UPDATE</button><button id='poros-button-cancel' />Cancel</button>";
    menuHTML += "</ul>";
    menuHTML += "<input id='data-id' type='hidden' name='id' value='"+data.id+"'/>";
    menuHTML += "</form>";

    var lastMenu = showSubMenu(menuHTML);
    var subMenuBack = function() {
      transitionSubmenu(function() {
        var subMenu = document.getElementById('poros-sub-menu');
        injectElement(subMenu, lastMenu);
        addClass(subMenu, 'small');
        removeClass(subMenu, 'poros-menu-closed');
      })
    }
    var subMenuUpdate = function() {
      //get the data
      var slug = document.getElementById('data-slug').value || '';
      var template = document.getElementById('data-template').value || '';
      var id = document.getElementById('data-id').value || '';
      if (slug[0] == '/') slug = slug.substr(1);

      if (slug && template) {
        //submit
        var url = '/api/data/page';
        if (id) url += '/' + id;
        enqueueData(url, "slug="+slug+"&template="+template);

        subMenuBack();
      }
    }

    var okay = document.getElementById('poros-button-okay');
    okay.addEventListener("click", subMenuUpdate);
    var cancel = document.getElementById('poros-button-cancel');
    cancel.addEventListener("click", subMenuBack);
}
