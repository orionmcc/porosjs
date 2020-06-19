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
  getData('/collections/', 'collections', ctx, next);
}
function loadCollection (ctx, next) {
  getData('/collections/'+ctx.params.collection, 'records', ctx, next);
}
function loadCollectionMeta (ctx, next) {
  getData('/collections/'+ctx.params.collection+"/meta", 'meta', ctx, next);
}
function loadRecord (ctx, next) {
  getData('/collections/'+ctx.params.collection+"/"+ctx.params.record, 'data', ctx, next);
}
function loadRecordRevisions (ctx, next) {
  getData('/collections/'+ctx.params.collection+"/"+ctx.params.record+"/revisions", 'revisions', ctx, next);
}
function onCollections (ctx, next) {
  showCollectionsSubMenu(ctx.params.collections);
}
function onCollectionRecords (ctx, next) {
  showRecordsSubMenu(ctx.params.collection, ctx.params.records.map(function(d, idx) { return Object.assign({}, d, { _idx: idx }); }  ));
}
function onEditRecord (ctx, next) {
  showRecordsSubMenu(ctx.params.collection, ctx.params.records.map(function(d, idx) { return Object.assign({}, d, { _idx: idx }); }  ));
  editRecord(ctx.params.data, ctx.params.meta, false);
}
function onShowRevisions (ctx, next) {
  //showRevisionsSubMenu
  //ShowRevisions
}
function onCreateRecord (ctx, next) {
  createRecord(ctx.params.meta, ctx.params.records);
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

  if (hasClass(menu,'poros-menu-closed')) {
    window.localStorage.setItem('menuOpen', 'false');
  } else {
    window.localStorage.setItem('menuOpen', 'true');
  }
}

function closeEditMenu() {
  var menu = document.getElementById('poros-record-edit');
  addClass(menu, 'poros-menu-closed');
}

function closeSubMenu() {
  var menu = document.getElementById('poros-sub-menu');
  addClass(menu, 'poros-menu-closed');
  menu = document.getElementById('poros-record-edit');
  addClass(menu, 'poros-menu-closed');
}

function transitionSubmenu(next) {
  closeSubMenu();
  setTimeout(next, 300);
}

function transitionEditmenu(next) {
  closeEditMenu();
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
    "<div id='poros-menu' class='poros-menu-closed'>"+
      "<div id='poros-main-menu'>"+
        "<h1>MENU</h1>"+
        "<ul>"+
          "<li><a id='menu-poros-vars' href='/poros-site-vars'>-SITE</a>"+
          "<li><a id='menu-poros-page-vars' href='/poros-page-vars'>-PAGE</a>"+
          "<li><a id='menu-poros-pages' href='/poros-pages'>-ALL PAGES</a>"+
          "<li><a id='menu-poros-collections' href='/poros-collections'>-CONTENT </a>"+
          "<li><a id='menu-poros-users' href='/poros-users'>-USERS</a>"+
        "</ul>"+
        "<a id='poros-menu-logout' href='/logout'>logout</a>"+
      "</div>"+
      "<div id='poros-sub-menu' class='poros-menu poros-menu-closed'></div>"+
      "<div id='poros-record-edit' class='poros-menu poros-menu-closed'></div>"+
    "</div>"
  );
  document.body.appendChild(menuEl);
  var toggleEl = newElement(
    "<div id='poros-toggle' class='poros-menu-closed' onClick='toggleMenu();'>&gt;&gt;</div>"
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
  page('/poros-collections/:collection', preRoute, loadCollection, onCollectionRecords);
  page('/poros-collections/:collection/new', preRoute, loadCollectionMeta,  loadCollection, onCreateRecord);
  page('/poros-collections/:collection/:record', preRoute, loadCollectionMeta, loadCollection, loadRecord, onEditRecord);
  page('/poros-collections/:collection/:record/revisions', preRoute, loadCollectionMeta, loadRecordRevisions, onShowRevisions); // Load the revisions datas
  page('/poros-collections/:collection/:record/revisions/:revisionId', preRoute, loadCollectionMeta, loadRecordRevisions, onShowRevisions); // Load the revision data
  page('/poros-users', preRoute, loadUsers, onUsers);
  page('/poros-users/new', preRoute, onCreateUser);
  page('/poros-users/:user', preRoute, generateTFA, loadUser, onEditUser);
  page({hashbang: true, dispatch: window.location.hash != '' ? true: false});

  var menuOpen = window.localStorage.getItem("menuOpen");
  if (menuOpen === "true") toggleMenu();
}, false )

function showRecordEdit (body) {
  var menu = document.getElementById('poros-record-edit');
  var menuHTML = "";

  menuHTML += "<span id='poros-record-close-button' onClick='closeEditMenu(); page.redirect(\"./\")'>&gt;&lt;</span>";
  menuHTML += body;
  injectElement(menu, menuHTML);
  removeClass(menu, 'poros-menu-closed');
}

function selectMainMenu(id) {
  var oldItems = document.getElementsByClassName("main-menu-selected");
  for (var i = 0; i < oldItems.length; i++) {
      removeClass(oldItems[i], 'menu-selected');
  }

  var menuItem = document.getElementById(id);
  addClass(menuItem, 'main-menu-selected');
}

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

  if(title.indexOf('SITE') != -1) selectMainMenu('menu-poros-vars');
  else selectMainMenu('menu-poros-page-vars');
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

  selectMainMenu('menu-poros-pages');
  showSubMenu(menuHTML);
}

function showCollectionsSubMenu (collections) {
  var menuHTML = "";
  menuHTML += "<h2>COLLECTIONS</h2>";

  menuHTML += "<ul>";
  if (collections) {
    for (var i = 0; i < collections.length; i++) {
      menuHTML += "<li>";
      menuHTML += "<a class='poros-actionable' href='/poros-collections/"+collections[i].name+"'>"+collections[i].name+"</a>";
    }
  }
  menuHTML += "</ul>";

  selectMainMenu('menu-poros-collections');
  showSubMenu(menuHTML);
}


function uploadFile(id) {
  var file = document.getElementById(id);
  file.click();
}


function onFile(mimeTypes, url, cb) {
  var file = this.files[0];

  if(mimeTypes && mimeTypes.indexOf(file.type) == -1) {
    alert('Error : Incorrect file type');
    return;
  }

  var data = new FormData();
  data.append('Records', file);

  enqueueFileUpload(
    url,
    "POST",
    data,
    cb
  );
}

function showRecordsSubMenu (collection, records) {
  var menuHTML = "";
  menuHTML += "<h2>"+collection.toUpperCase()+" RECORDS</h2>";
  menuHTML += "<p><button id='poros-button-alphabetical' />" + (window.localStorage.getItem('sort') == 'alpha' ? "<span>A</span>" : "<span>Idx</span>") + "</button></p>";

  menuHTML += "<ul>";

  // Sort the records
  if (window.localStorage.getItem('sort') == 'alpha') {
    records.sort(function(a, b){
        if(a.pid < b.pid) { return -1; }
        if(a.pid > b.pid) { return 1; }
        return 0;
    });
  } else {
    records.sort(function(a, b){
        if(a._idx < b._idx) { return -1; }
        if(a._idx > b._idx) { return 1; }
        return 0;
    })
  }

  if (records) {
    for (var i = 0; i < records.length; i++) {
      menuHTML += "<li>";
      menuHTML += "<a class='poros-actionable' href='/poros-collections/"+collection+"/"+records[i].pid+"'>"+records[i].pid+"</a>";
    }
  }
  menuHTML += "</ul>";
  menuHTML += "<a class='poros-actionable' href='/poros-collections/"+collection+"/new'>new record</a>";
  menuHTML += "<a class='poros-actionable' href='#' onClick=\"uploadFile('recordFileImport'); return false;\">import records</a>";
  menuHTML += "<input type='file' id='recordFileImport' onChange=\"onFile.call(this, null, '/api/collections/"+collection+"/import', function() { page('/poros-collections/"+collection+"') })\" accept='text/csv' style='display:none' />"
  menuHTML += "<a class='poros-actionable' href='#' onClick=\"window.open('/api/collections/"+collection+"/export', '_blank'); return false;\">export records</a>";
  menuHTML += "<h2 style='cursor:pointer;' onClick='page.redirect(\"/poros-collections\");'>ALL CONTENT</h2>";

  showSubMenu(menuHTML);

  function sortRecords() {
    if (window.localStorage.getItem('sort') == 'alpha') {
      window.localStorage.setItem('sort', '');
    } else {
      window.localStorage.setItem('sort', 'alpha');
    }
    showRecordsSubMenu (collection, records);
  }

  var alpha  = document.getElementById('poros-button-alphabetical');
  if (alpha) alpha.addEventListener("click", sortRecords);
}

function createRecord(collection, records) {
  var pid = prompt("What should we call this record?");
  if (pid) transitionSubmenu(function() {
    showRecordsSubMenu (collection.id, records)
    editRecord({pid: pid}, collection, true);
  });
  else page('/poros-collections/'+collection.id);
}

function editRecord(data, collection, isNew) {
  tinymce.remove('div');

  console.log('Show sub menu for '+data.pid);
  var menuHTML = "";
  menuHTML += "<h2>"+data.pid+"</h2>";
  menuHTML += "<a href='/poros-collections/"+collection.id+"/"+data.pid+"/revisions'>Revision History</a>";

  menuHTML += "<form onSubmit='return false;' action='/'>";

  menuHTML += "<ul>";
  for (var i = 0; i < collection.fields.length; i++) {
    menuHTML += "<li>";
    menuHTML += collection.fields[i].id+"<br />";
    //TODO: Handle by type
    if (collection.fields[i].type == 'json') menuHTML += "<input id='data-"+collection.fields[i].id+"' type='text' name='"+collection.fields[i].id+"' value='"+(JSON.stringify(data[collection.fields[i].id] || ''))+"'/>";
    if (collection.fields[i].type == 'readonly') menuHTML += "<input disabled id='data-"+collection.fields[i].id+"' type='text' name='"+collection.fields[i].id+"' value='"+(data[collection.fields[i].id] || '')+"'/>";
    if (collection.fields[i].type == 'text') menuHTML += "<input id='data-"+collection.fields[i].id+"' type='text' name='"+collection.fields[i].id+"' value='"+(data[collection.fields[i].id] || '')+"'/>";
    if (collection.fields[i].type == 'richtext') {
      var fieldId = collection.fields[i].id;
     //menuHTML += "<input id='data-"+fieldId+"' type='text' name='"+fieldId+"' value='"+(data[fieldId] || '')+"'/>";
     menuHTML += "<div id='data-"+fieldId+"'>"+(data[fieldId] || '')+"</div>";
      setTimeout(function () {
        tinyMCE.init({ selector: '#data-'+fieldId, toolbar: 'bold, italic, alignleft, aligncenter, alignright, alignjustify, bullist, numlist, outdent, indent', init_instance_callback: function (editor) {
          editor.on('Change', function (e) {
            document.getElementById('data-'+fieldId).innerHTML = tinymce.get('data-'+fieldId).getContent();
          });
        },
          menubar: false, })
      }, 1);
    }
    if (collection.fields[i].type == 'number') menuHTML += "<input id='data-"+collection.fields[i].id+"' type='text' name='"+collection.fields[i].id+"' value='"+(data[collection.fields[i].id] || '')+"'/>";
    if (collection.fields[i].type == 'boolean') {
      menuHTML += "<select id='data-"+collection.fields[i].id+"' name='"+collection.fields[i].id+"'>";
      menuHTML += "<option value='true'"+(data[collection.fields[i].id] ? "selected" : "")+">True</option>";
      menuHTML += "<option value='false'"+(!data[collection.fields[i].id] ? "selected" : "")+">False</option>";
      menuHTML += "</select>";
    }
  }
  menuHTML += "<li><button id='poros-button-okay' />UPDATE</button><button id='poros-button-cancel' />Cancel</button>";
  if (!isNew) menuHTML += "<li><button id='poros-button-duplicate' />DUPLICATE RECORD</button>";
  if (!isNew) menuHTML += "<li><button id='poros-button-delete' />DELETE RECORD</button>";
  menuHTML += "</ul>";
  menuHTML += "<input id='data-pid' type='hidden' name='pid' value='"+data.pid+"'/>";
  menuHTML += "</form>";

  showRecordEdit(menuHTML);

  var subMenuBack = function(){ page('/poros-collections/'+collection.id) }
  var subMenuUpdate = function() {
    var pid = document.getElementById('data-pid').value;
    if (pid !== null) {
      //submit
      var url = '/api/collections/'+collection.id+"/"+pid;
      var data = {};
      data['pid'] = pid;
      for (var i = 0; i < collection.fields.length; i++) {
        if (collection.fields[i].type == 'number') data[collection.fields[i].id] = Number(document.getElementById('data-'+collection.fields[i].id).value);
        else if (collection.fields[i].type == 'boolean') data[collection.fields[i].id] = document.getElementById('data-'+collection.fields[i].id).value === 'true';
        else if (collection.fields[i].type == 'richtext') data[collection.fields[i].id] = document.getElementById('data-'+collection.fields[i].id).innerHTML || '';
        else if (collection.fields[i].type == 'json') data[collection.fields[i].id] = JSON.parse(document.getElementById('data-'+collection.fields[i].id).value || '');
        else data[collection.fields[i].id] = document.getElementById('data-'+collection.fields[i].id).value || '';
      }

      enqueueData(url,
        "POST",
        data,
        function() { subMenuBack(); }
      );
    }
  }

  function deleteRecord() {
    var confirmDelete = confirm("Are you sure you want to delete this record?");

    if (confirmDelete) {
      var pid = document.getElementById('data-pid').value;
      var url = '/api/collections/'+collection.id+"/"+pid;
      if (pid) {
        enqueueData(url,
          "DELETE",
          null,
          function() { subMenuBack(); }
        );
      }
    }
  }

  function duplicateRecord() {
    var pid = prompt("What should we call the duplicate record?");
    if (pid) transitionEditmenu(function() {
      editRecord(Object.assign({}, data, {pid: pid}), collection, true);
    });
  }

  var okay = document.getElementById('poros-button-okay');
  okay.addEventListener("click", subMenuUpdate);
  var cancel = document.getElementById('poros-button-cancel');
  cancel.addEventListener("click", subMenuBack);
  var del  = document.getElementById('poros-button-duplicate');
  if (del) del.addEventListener("click", duplicateRecord);
  var del  = document.getElementById('poros-button-delete');
  if (del) del.addEventListener("click", deleteRecord);
}


function createPage(templates) {
  var name = prompt("What should we call this page?");
  if (name) transitionSubmenu(function() { editPage({id: null, slug: name.toLowerCase().split(' ').join('-').replace(/[^a-zA-Z0-9-_]/g, '')}, templates); });
  else page('/poros-pages');
}

function editPage(data, templates) {
  const accessOptions = [
    {value: '', text: 'Public'},
    {value: 'poros.admin', text: 'Admin'},
    {value: 'poros.superuser', text: 'Super User'},
    {value: 'poros.maintenance', text: 'Maintenance'},
  ];
  console.log('Show sub menu for '+data.slug, data);

  function findValueinOptions(a, value) {
    for (var i = 0; i < a.length; i++) {
      if (a[i].value == value) return true;
    }

    return false;
  }

  var menuHTML = "";
  menuHTML += "<h2><a href='/"+data.slug+"/'>"+data.slug+"</a></h2>";

  menuHTML += "<form onSubmit='return false;' action='/'>";
  menuHTML += "<ul>";
  menuHTML += "<li>";
  menuHTML += "Slug <br />";
  menuHTML += "<input id='data-slug' type='text' name='select' value='"+data.slug+"'/>";
  menuHTML += "<li>";
  if (data.template && !findValueinOptions(templates, data.template)) menuHTML += "<span style='color: red; font-weight: 700;'>!</span>";
  menuHTML += "Template <br />";
  menuHTML += "<select id='data-template' name='template'>";
  for (var i = 0; i < templates.length; i++) {
     menuHTML += "<option value='"+templates[i].value+"'"+(templates[i].value == data.template ? "selected" : "")+">"+templates[i].text+"</option>";
  }
  menuHTML += "</select>";
  menuHTML += "<li>";
  menuHTML += "Access <br />";
  if (data.access && !findValueinOptions(accessOptions, data.access)) menuHTML += "<span style='color: red; font-weight: 700;'>!</span>";
  menuHTML += "<select id='data-access' name='access'>"
  for (var i = 0; i < accessOptions.length; i++) {
     menuHTML += "<option value='"+accessOptions[i].value+"'"+(accessOptions[i].value == data.access ? "selected" : "")+">"+accessOptions[i].text+"</option>";
  }
  menuHTML += "</select>";
  menuHTML += "<li>";
  menuHTML += "Default <br />";
  menuHTML += "<select id='data-default' name='default'>";
  menuHTML += "<option value='true'"+(data.default ? "selected" : "")+">True</option>";
  menuHTML += "<option value='false'"+(!data.default ? "selected" : "")+">False</option>";
  menuHTML += "</select>";
  menuHTML += "<li><button id='poros-button-okay' />UPDATE</button><button id='poros-button-cancel' />Cancel</button>";
  if (data.id !== null) menuHTML += "<li><button id='poros-button-delete' />DELETE PAGE</button>";
  menuHTML += "</ul>";
  menuHTML += "<input id='data-id' type='hidden' name='id' value='"+data.id+"'/>";
  menuHTML += "</form>";

  showSubMenu(menuHTML);

  var subMenuBack = function(){ page('/poros-pages') }
  var subMenuUpdate = function() {
    //get the data
    var id = document.getElementById('data-id').value || '';
    var slug = document.getElementById('data-slug').value || '';
    var template = document.getElementById('data-template').value || '';
    if (slug[0] == '/') slug = slug.substr(1);
    var data = {
      slug: slug,
      template: template,
      access: document.getElementById('data-access').value || '',
      def: document.getElementById('data-default').value === 'true',
    };

    if (slug && template) {
      //submit
      var url = '/api/page';
      if (id !== 'null') url += '/' + id;

      enqueueData(url,
        "POST",
        data,
        function() { subMenuBack(); }
      );
    }
  }

  function deletePage() {
    var confirmDelete = confirm("Are you sure you want to delete this page?");

    if (confirmDelete) {
      var url = '/api/page';
      if (data.id !== null) url += '/' + data.id;
      enqueueData(url,
        "DELETE",
        null,
        function() { subMenuBack(); }
      );
    }
  }

  handle('click', 'poros-button-okay', subMenuUpdate);
  handle('click', 'poros-button-cancel', subMenuBack);
  handle('click', 'poros-button-delete', deletePage);
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
  menuHTML += "</ul>";

  selectMainMenu('menu-poros-users');
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
    var tfa = document.getElementById('data-tfa').value === 'true';
    var tfasecret = user.tfasecret;
    var url = '/api/user/'+user.username;
    var data = {
      role: document.getElementById('data-role').value || 'poros.user',
      tfa: tfa,
      tfasecret: tfasecret,
    };

    var postUser = function() {
      enqueueData(url,
        'POST',
        data,
        function () {
          subMenuBack();
        });
      }

    if (tfa && tfasecret) {
      var token = prompt('Please enter the authenticator code displayed on Google Authenticator to confirm two factor auth.');
      enqueueData('/api/tfaverify',
        'POST',
        { token: token},
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

  handle('click', 'poros-button-okay', subMenuUpdate);
  handle('click', 'poros-button-cancel', subMenuBack);
  if (user.tfasecret) {
    handle('change', 'data-tfa', toggleTFA);
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
    showSubMenu(makeUserTemplate (name, password));

    var subMenuBack = function () { page('/poros-users') }
    var subMenuUpdate = function () {
      //get the data
      var role = document.getElementById('data-role').value || 'poros.user';
      var url = '/api/user/'+name;
      enqueueData(
        url,
        'POST',
        {
          role: role,
          newPassword: password,
        },
        function () {
          subMenuBack();
        });
    }

    handle('click', 'poros-button-okay', subMenuUpdate);
    handle('click', 'poros-button-cancel', subMenuBack);
  }
}
