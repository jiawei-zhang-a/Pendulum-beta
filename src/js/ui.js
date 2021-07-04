
/* jshint esversion: 6 */
import * as MathQuill from "mathquill/build/mathquill";

var MQ = MathQuill.getInterface(2);
var objectBar = $('#object-bar')[0]; // var types = {
//     ":": "Variable",
//     "": "Function",
//     "{": "Object"
// };

var names = [];
var nameControls = {};
var defControls = {};
/**
 * Used to record whether certain number slots are filled
 */

var indexes = [];

function getIndex() {
    var position = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

    if (position >= indexes.length) {
        indexes[position] = true;
        return position;
    }

    for (var i = position; i < indexes.length; i++) {
        if (!indexes[i]) {
            indexes[i] = true;
            return i;
        }
    }

    indexes.push(true);
    return i;
}

function removeIndex() {
    var position = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    indexes[position] = false;
}

var NameControl =
    /*#__PURE__*/
    function () {
        function NameControl() {
            _classCallCheck(this, NameControl);

            this.varName = "";
            this.nameContainer = document.body;
            this.nameField = document.body;
            this.type = ':';
        }
        /**
         * Used to synchronize height between definition container and namefield container
         */


        _createClass(NameControl, [{
            key: "updateSize",
            value: function updateSize() {
                var definition = this.defControl.defField;
                var defContainer = this.defControl.defContainer;
                $(this.nameContainer).innerHeight($(this.nameField).outerHeight());
                if (definition.offsetHeight > this.nameField.offsetHeight) $(this.nameContainer).outerHeight($(defContainer).outerHeight(true), true);else $(defContainer).outerHeight($(this.nameField).outerHeight(true));
            }
        }, {
            key: "loadDefControl",
            value: function loadDefControl(ec) {
                this.defControl = ec;
            }
        }]);

        return NameControl;
    }();

var DefControl =
    /*#__PURE__*/
    function () {
        function DefControl() {
            _classCallCheck(this, DefControl);

            this.varName = "";
            this.defContainer = document.body;
            this.defField = document.body;
            this.type = ':';
        }
        /**
         * Used to synchronize height between definition container and namefield container
         */


        _createClass(DefControl, [{
            key: "updateSize",
            value: function updateSize() {
                var name = this.nameControl.nameField;
                var nameContainer = this.nameControl.nameContainer;
                $(this.defContainer).innerHeight($(this.defField).outerHeight());
                if (this.defField.offsetHeight > name.offsetHeight) $(nameContainer).outerHeight($(this.defContainer).outerHeight(true), true);else $(this.defContainer).outerHeight($(name).outerHeight(true));
            }
        }, {
            key: "loadNameControl",
            value: function loadNameControl() {
                var nc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new NameControl();
                this.type = nc.type;
                this.nameControl = nc;
            }
        }]);

        return DefControl;
    }();

function loadTags() {
    $('.name').each(function () {
        var container = this.parentElement;
        var name = container.getAttribute('varname');
        var nc = initiateNameControl(name, container, this);
        names.push(name);
        nameControls[name] = nc;
    });
}

function loadShelves() {
    $('.expression').each(function () {
        var container = this.parentElement;
        var name = container.getAttribute('varname');
        var ec = initiateDefControl(name, container, this);
        defControls[name] = ec;
    });
}

function loadReference() {
    for (var varName in nameControls) {
        var nc = nameControls[varName];
        var ec = defControls[varName];
        nc.loadDefControl(ec);
        ec.loadNameControl(nc);
        nc.updateSize();
        ec.updateSize();
    }
}

function addNameField() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
    var autoIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    if (name == undefined) name = 1 + autoIndex;
    var html = $.parseHTML("<div class=\"name-container\" varname=\"".concat(name, "\"><div class=\"name\">").concat(name, "</div><div class=\"type\">:</div></div>"));
    $('#object-bar').append(html);
    var nc = initiateNameControl(name, html[0], html[0].children[0]);
    nameControls[nc.varName] = nc;
}

function addExpField() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
    var autoIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    if (name == undefined) name = 1 + autoIndex;
    var html = $.parseHTML("<div class=\"expression-container\" varname=\"".concat(name, " \"> <span class = \"expression\"></span> </div>"));
    $('#mathpanel').append(html);
    var ec = initiateDefControl(name, html[0], html[0].children[0]);
    defControls[name] = ec;
}

function focusNext(name) {
    defControls[name].mathquill.blur();
    defControls[names[(names.indexOf(name) + 1) % names.length]].mathquill.focus();
}

function focusLast(name) {
    defControls[name].mathquill.blur();
    defControls[names[(names.indexOf(name) + names.length - 1) % names.length]].mathquill.focus();
}

function removeNameField() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
    var nc = nameControls[name];
    var html = nc.nameContainer;
    html.parentNode.removeChild(html);
}

function removeDefField() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
    var ec = defControls[name];
    var html = ec.defContainer;
    html.parentNode.removeChild(html);
}

function appendDefinition() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
    addNameField(name);
    addExpField(name);
    var autoIndex = getIndex(names.length);
    nameControls[name].loadDefControl(defControls[name], autoIndex);
    defControls[name].loadNameControl(nameControls[name], autoIndex);
}

function removeDefinition() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
    var index = -1;

    if ((index = names.indexOf(name)) != -1) {
        removeNameField(name);
        delete nameControls[name];
        removeDefField(name);
        delete defControls[name];
        names.splice(index, 1); // core.removeDefinition(name);

        if (Number.isInteger(+name)) removeIndex(+name - 1);
    }

    return index;
}

function insertNameField() {
    var previous = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
    var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
    var autoIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    if (name == undefined) name = 1 + autoIndex;
    var html = $.parseHTML("<div class=\"name-container\" varname=\"".concat(name, "\"><div class=\"name\">").concat(name, "</div><div class=\"type\">:</div></div>"));
    var previousContainer = nameControls[previous].nameContainer;
    previousContainer.parentNode.insertBefore(html[0], previousContainer.nextSibling);
    var nc = initiateNameControl(name, html[0], html[0].children[0]);
    nameControls[nc.varName] = nc;
}

function insertExpField() {
    var previous = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
    var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
    var autoIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    if (name == undefined) name = 1 + autoIndex;
    var html = $.parseHTML("<div class=\"expression-container\" varname=\"".concat(name, " \"> <span class = \"expression\"></span> </div>"));
    var previousContainer = defControls[previous].defContainer;
    previousContainer.parentNode.insertBefore(html[0], previousContainer.nextSibling);
    var ec = initiateDefControl(name, html[0], html[0].children[0]);
    defControls[ec.varName] = ec;
    return name;
}

function insertDefinition() {
    var previous = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
    var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
    var index;

    if ((index = names.indexOf(previous)) != -1) {
        var autoIndex = getIndex(index + 1);
        name = insertNameField(previous, name, autoIndex);
        name = insertExpField(previous, name, autoIndex);
        names.splice(names.indexOf(previous) + 1, 0, name);
        nameControls[name].loadDefControl(defControls[name]);
        defControls[name].loadNameControl(nameControls[name]);
    }
}

function initiateNameControl(name, container, field) {
    var nc = new NameControl();
    nc.nameContainer = container;
    nc.nameField = field;
    nc.varName = name; // nc.parser = new NameParser();

    nc.type = nc.nameContainer.lastElementChild.innerText;
    nc.mathquill = MQ.MathField(nc.nameField, {
        autoSubscriptNumerals: true,
        handlers: {
            edit: function edit() {
                nc.updateSize(); // core.resizeGraphics();
                //replace name with identifier
                // let identifier = getIdentifier(nc.parser.tokenize(nc.mathquill.latex()));
                // console.log("updating identifier " + nc.mathquill.latex() + ": " + tokensToString(nc.parser.tokenize(nc.mathquill.latex())));
            }
        }
    }); // let identifier = getIdentifier(nc.parser.tokenize(nc.mathquill.latex()));
    // console.log("updating identifier " + nc.mathquill.latex() + ": " + tokensToString(nc.parser.tokenize(nc.mathquill.latex())));
    // core.createDefinition(name);

    return nc;
}

function initiateDefControl(name, container, field) {
    var ec = new DefControl();
    ec.defContainer = container;
    ec.defField = field;
    ec.varName = name; // ec.parser = new Parser();

    ec.mathquill = MQ.MathField(ec.defField, {
        autoSubscriptNumerals: true,
        handlers: {
            edit: function edit() {
                ec.updateSize(); // core.resizeGraphics();
                // let rpns = ec.parser.getRPN(ec.mathquill.latex());
                // console.log(rpnsToString(rpns));
                // core.updateDefinition(name, rpns);
            },
            enter: function enter() {
                insertDefinition(ec.varName);
                focusNext(ec.varName);
            },
            deleteOutOf: function deleteOutOf(direction) {
                if (direction == MQ.L) {
                    focusLast(name);
                    removeDefinition(name);
                }
            },
            upOutOf: function upOutOf() {
                return focusLast(name);
            },
            downOutOf: function downOutOf() {
                return focusNext(name);
            }
        }
    }); // let rpns = ec.parser.getRPN(ec.mathquill.latex());
    // core.updateDefinition(name, rpns);

    return ec;
}

module.exports = {
    nameControls: nameControls,
    defControls: defControls,
    loadTags: loadTags,
    loadShelves: loadShelves,
    loadReference: loadReference
};
//# sourceMappingURL=ui.js.map
