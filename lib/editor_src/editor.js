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
  getData('/site/data/', 'data', ctx, next);
}

var onSiteVars = function (ctx) {
  showVarSubMenu ('SITE SETTINGS', ctx.params.data)
};

function loadPageData (ctx, next) {
  getData('/page/'+_PAGE_ID+'/data', 'data', ctx, next);
}


function loadPageData (ctx, next) {
  getData('/page/'+_PAGE_ID+'/data', 'data', ctx, next);
}

var onPageVars = function (ctx) {
  showVarSubMenu ('CURRENT PAGE', ctx.params.data)
};


function loadPages (ctx, next) {
  getData('/pages/', 'pages', ctx, next);
}
function loadPage (ctx, next) {
  getData('/page/'+ctx.params.page, 'data', ctx, next);
}
function loadTemplates (ctx, next) {
  getData('/site/templates/', 'templates', ctx, next);
}
function onPages (ctx, next) {
  showPagesSubMenu(ctx.params.pages, ctx.params.templates);
}
function onEditPage (ctx, next) {
  editPage(ctx.params.data, ctx.params.templates);
}
function onCreatePage (ctx, next) {
  createPage(ctx.params.templates);
}



function loadCollections (ctx, next) {
  getData('/collections/', 'users', ctx, next);
}
function loadCollection (ctx, next) {
  getData('/collection/'+ctx.params.collection, 'data', ctx, next);
}
function onCollections (ctx, next) {
  showCollectionsSubMenu(ctx.params.users);
}
function onEditCollection (ctx, next) {
  editCollection(ctx.params.data);
}



function loadUsers (ctx, next) {
  getData('/users/', 'users', ctx, next);
}
function loadUser (ctx, next) {
  getData('/user/'+ctx.params.user, 'data', ctx, next);
}
function generateTFA (ctx, next) {
  getData('/tfasecret', 'tfasecret', ctx, next);
}
function onUsers (ctx, next) {
  showUsersSubMenu(ctx.params.users);
}
function onEditUser (ctx, next) {
  var user = ctx.params.data;
  if(!user.tfa) user.tfasecret = ctx.params.tfasecret.base32;
  editUser(ctx.params.data);
}
function onCreateUser (ctx, next) {
  createUser();
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
        "<li><a href='/poros-site-vars'>-SITE</a>"+
        "<li><a href='/poros-page-vars'>-PAGE</a>"+
        "<li><a href='/poros-pages'>-ALL PAGES</a>"+
        "<li><a href='/poros-collections'>-CONTENT </a>"+
        "<li><a href='/poros-users'>-USERS</a>"+
      "</ul>"+
      "<a id='poros-menu-logout' href='/logout'>logout</a>"+
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
  page('/poros-pages', preRoute, loadPages, onPages);
  page('/poros-pages/new', preRoute, loadTemplates, onCreatePage);
  page('/poros-pages/:page', preRoute, loadPage, loadTemplates, onEditPage);
  page('/poros-collections', preRoute, loadCollections, onCollections);
  page('/poros-collections/:collections', preRoute, loadCollections, onEditCollection);
  page('/poros-users', preRoute, loadUsers, onUsers);
  page('/poros-users/new', preRoute, onCreateUser);
  page('/poros-users/:user', preRoute, generateTFA, loadUser, onEditUser);
  page({hashbang: true, dispatch: window.location.hash != '' ? true: false});
}, false )



function showSubMenu (body) {
  var subMenu = document.getElementById('poros-sub-menu');
  var menuHTML = "";

  menuHTML += "<span id='poros-menu-close-button' onClick='closeSubMenu(); page.redirect(\"./\")'>&gt;&lt;</span>";
  menuHTML += body;
  injectElement(subMenu, menuHTML);
  addClass(subMenu, 'small');
  removeClass(subMenu, 'poros-menu-closed');
}

function showVarSubMenu (title, data) {
  var menuHTML = "";
  menuHTML += "<h2>"+title+"</h2>";

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

  showSubMenu(menuHTML);
}

function showPagesSubMenu (pages, templates) {
  var menuHTML = "";
  menuHTML += "<h2>ALL PAGES</h2>";

  menuHTML += "<ul>";
  if (pages) {
    for (var i = 0; i < pages.length; i++) {
      menuHTML += "<li>";
      menuHTML += "<a class='poros-actionable' href='/poros-pages/"+pages[i].id+"'>"+pages[i].slug+"</a>";
    }
  }
  menuHTML += "<a class='poros-actionable' href='/poros-pages/new'>new page</a>";
  menuHTML += "</ul>";

  showSubMenu(menuHTML);
}

function createPage(templates) {
  var name = prompt("What should we call this page?");
  var slug = name.toLowerCase().split(' ').join('-').replace(/[^a-zA-Z0-9-_]/g, '');
  if (name) transitionSubmenu(function() { editPage({id: null, slug: slug}, templates); });
  else page('/poros-pages');
}

function editPage(data, templates) {
  const accessOptions = [
    {value: '', text: 'Public'},
    {value: 'poros.admin', text: 'Admin'},
    {value: 'poros.superuser', text: 'Super User'},
  ];
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
  menuHTML += "<li>";
  menuHTML += "Access <br />";
  menuHTML += "<select id='data-access' name='access'>"
  for (var i = 0; i < accessOptions.length; i++) {
     menuHTML += "<option value='"+accessOptions[i].value+"'"+(accessOptions[i].value == data.access ? "selected" : "")+">"+accessOptions[i].text+"</option>";
  }
  menuHTML += "</select>";
  menuHTML += "<li><button id='poros-button-okay' />UPDATE</button><button id='poros-button-cancel' />Cancel</button>";
  if (data.id) menuHTML += "<li><button id='poros-button-delete' />DELETE PAGE</button>";
  menuHTML += "</ul>";
  menuHTML += "<input id='data-id' type='hidden' name='id' value='"+data.id+"'/>";
  menuHTML += "</form>";

  showSubMenu(menuHTML);

  var subMenuBack = function(){ page('/poros-pages') }
  var subMenuUpdate = function() {
    //get the data
    var slug = document.getElementById('data-slug').value || '';
    var template = document.getElementById('data-template').value || '';
    var access = document.getElementById('data-access').value || '';
    var id = document.getElementById('data-id').value || '';
    if (slug[0] == '/') slug = slug.substr(1);

    if (slug && template) {
      //submit
      var url = '/api/page';
      if (id) url += '/' + id;

      enqueueData(url,
        "POST",
        "slug="+slug+"&template="+template+"&access="+access,
        function() { subMenuBack(); }
      );
    }
  }

  function deletePage() {
    var confirmDelete = confirm("Are you sure you want to delete this page?");

    if (confirmDelete) {
      var url = '/api/page';
      if (data.id) url += '/' + data.id;
      enqueueData(url,
        "DELETE",
        "",
        function() { subMenuBack(); }
      );
    }
  }

  var okay = document.getElementById('poros-button-okay');
  okay.addEventListener("click", subMenuUpdate);
  var cancel = document.getElementById('poros-button-cancel');
  cancel.addEventListener("click", subMenuBack);
  var del  = document.getElementById('poros-button-delete');
  if (del) del.addEventListener("click", deletePage);
}



function showUsersSubMenu (users) {
  var menuHTML = "";
  menuHTML += "<h2>USERS</h2>";

  menuHTML += "<ul>";
  if (users) {
    for (var i = 0; i < users.length; i++) {
      menuHTML += "<li>";
      menuHTML += "<a class='poros-actionable' href='/poros-users/"+users[i].username+"'>"+users[i].username+"</a>";
    }
  }
  menuHTML += "<a class='poros-actionable' href='/poros-users/new'>new user</a>";
  //menuHTML += "<li><span class='poros-actionable' onClick='createUser()'>new user</span>";
  menuHTML += "</ul>";

  showSubMenu(menuHTML);
}

function editUser(user) {
  var menuHTML = "";
  menuHTML += "<h2>"+user.username.toUpperCase()+"</h2>";
  menuHTML += "<ul>";
  menuHTML += "<li>";
  menuHTML += "Role <br />";
  menuHTML += "<select id='data-role' name='role'>";
    menuHTML += "<option value='poros.user'"+('poros.user' == user.role ? "selected" : "")+">User</option>";
    menuHTML += "<option value='poros.admin'"+('poros.admin' == user.role ? "selected" : "")+">Admin</option>";
    menuHTML += "<option value='poros.superuser'"+('poros.superuser' == user.role ? "selected" : "")+">Super User</option>";
  menuHTML += "</select>";
  menuHTML += "<li>";
  menuHTML += "Two Factor Auth <br />";
  menuHTML += "<select id='data-tfa' name='role'>";
    menuHTML += "<option value='true'"+(true === user.tfa ? "selected" : "")+">Enabled</option>";
    menuHTML += "<option value='false'"+(true !== user.tfa ? "selected" : "")+">Disabled</option>";
  menuHTML += "</select>";
  if (user.tfasecret)  menuHTML += "<li><img id='poros-tfa-qrcode' class='poros-hide' src='https://chart.googleapis.com/chart?chs=230x230&cht=qr&chl=otpauth%3A%2F%2Ftotp%2Fporos%2F"+user.username+"%3Fsecret%3D"+user.tfasecret+"&choe=UTF-8' />";
  menuHTML += "<li><button id='poros-button-okay' />UPDATE</button><button id='poros-button-cancel' />Cancel</button>";
  menuHTML += "</ul>";

  showSubMenu(menuHTML);

  var subMenuBack = function(){ page('/poros-users'); }
  var subMenuUpdate = function() {
    //get the data
    var role = document.getElementById('data-role').value || 'poros.user';
    var tfa = document.getElementById('data-tfa').value === 'true';
    var tfasecret = user.tfasecret;
    var url = '/api/user/'+user.username;

    var postUser = function() {
      enqueueData(url,
        'POST',
        'role='+role+'&tfa='+tfa+'&tfasecret='+tfasecret,
        function () {
          subMenuBack();
        });
      }

    if (tfa && tfasecret) {
      var token = prompt('Please enter the authenticator code displayed on Google Authenticator to confirm two factor auth.');
      enqueueData('/api/tfaverify',
        'POST',
        'token='+token,
        function (err) {
          if (err) alert('Error verifying auth, please try again.');
          else postUser();
        });
    } else {
      postUser();
    }
  }

  function toggleTFA() {
    var tfa = document.getElementById('data-tfa').value === 'true';
    if( tfa ) {
      removeClass( document.getElementById('poros-tfa-qrcode'), 'poros-hide');
    } else {
      addClass( document.getElementById('poros-tfa-qrcode'), 'poros-hide');
    }
  }

  var okay = document.getElementById('poros-button-okay');
  okay.addEventListener("click", subMenuUpdate);
  //var okay = document.getElementById('poros-delete-user');
  //okay.addEventListener("click", subMenuUpdate);
  var cancel = document.getElementById('poros-button-cancel');
  cancel.addEventListener("click", subMenuBack);
  if (user.tfasecret) {
    var tfa = document.getElementById('data-tfa');
    tfa.addEventListener("change", toggleTFA);
  }
}

function createUser(user) {

  var name = prompt('Please enter a username') || '';
  name = name.toLowerCase().split(' ').join('_').replace(/[^a-zA-Z0-9-_]/g, '');
  if (!name) return page('/poros-users');
  var password = prompt('Please enter a password of at least 7 characters');
  if (!password) return page('/poros-users');
  var passwordConfirm = prompt('Please confirm the password');

  if (!name || password.length < 7 || password != passwordConfirm ) {
    alert( "Unable to create user" );
    page('/poros-users');
  } else {
    var menuHTML = "";
    menuHTML += "<h2>"+name.toUpperCase()+"</h2>";
    menuHTML += "<input id='data-username' type='hidden' value='"+name+"'/>"
    menuHTML += "<input id='data-password' type='hidden' value='"+password+"'/>"
    menuHTML += "<ul>";
    menuHTML += "<li>";
    menuHTML += "Role <br />";
    menuHTML += "<select id='data-role' name='role'>";
      menuHTML += "<option value='poros.user'>User</option>";
      menuHTML += "<option value='poros.admin'>Admin</option>";
      menuHTML += "<option value='poros.superuser'>Super User</option>";
    menuHTML += "</select>";
    menuHTML += "<li><button id='poros-button-okay' />UPDATE</button><button id='poros-button-cancel' />Cancel</button>";
    menuHTML += "</ul>";

    showSubMenu(menuHTML);

    var subMenuBack = function(){ page('/poros-users') }
    var subMenuUpdate = function() {
      //get the data
      var role = document.getElementById('data-role').value || 'poros.user';
      var url = '/api/user/'+name;
      enqueueData(
        url,
        'POST',
        'role='+role+'&newPassword='+password,
        function() {
          subMenuBack();
        });
    }

    var okay = document.getElementById('poros-button-okay');
    okay.addEventListener("click", subMenuUpdate);
    var cancel = document.getElementById('poros-button-cancel');
    cancel.addEventListener("click", subMenuBack);
  }
}
