/* jshint esversion: 6 */
import "mathquill/build/mathquill";
import {SymNode, Parser} from "./parser";
import {Core} from './core';

// @ts-ignore
var MQ = MathQuill.getInterface(MathQuill.getInterface.MAX);

var objectBar = $('#object-bar')[0];

// var types = {
//     ":": "Variable",
//     "": "Function",
//     "{": "Object"
// };

let names:string[] = [];
let nameControls:{[key:string]:NameControl} = {};
let defControls:{[key:string]:DefControl} = {};

let core = new Core();

/**
 * Used to record whether certain number slots are filled
 */
var indexes:boolean[] = [];

function getIndex(position = 0) {
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

function removeIndex(position = 0) {
    indexes[position] = false;
}

class NameControl {
    public varName = "";
    public nameContainer = document.body;
    public nameField = document.body;
    public type = ':';
    public defControl:DefControl = null;
    mathquill: any;
    parser: Parser;
    constructor() {
        this.parser = new Parser();
    }
    /**
     * Used to synchronize height between definition container and namefield container
     */
    updateSize() {
        var definition = this.defControl.defField;
        var defContainer = this.defControl.defContainer;
        $(this.nameContainer).innerHeight($(this.nameField).outerHeight());
        if (definition.offsetHeight > this.nameField.offsetHeight)
            $(this.nameContainer).outerHeight($(defContainer).outerHeight(true),true);
        else $(defContainer).outerHeight($(this.nameField).outerHeight(true));
    }

    loadDefControl(ec:DefControl) {
        this.defControl = ec;
    }
}
class DefControl {
    public varName: string = "";
    public defContainer = document.body;
    public defField = document.body;
    public type = ':';
    public nameControl: NameControl = null;
    mathquill: any;
    parser: Parser;
    constructor() {
        this.parser = new Parser();
    }
    /**
     * Used to synchronize height between definition container and namefield container
     */
    updateSize() {
        var name = this.nameControl.nameField;
        var nameContainer = this.nameControl.nameContainer;
        $(this.defContainer).innerHeight($(this.defField).outerHeight());
        if (this.defField.offsetHeight > name.offsetHeight)
            $(nameContainer).outerHeight($(this.defContainer).outerHeight(true),true);
        else $(this.defContainer).outerHeight($(name).outerHeight(true));
    }

    loadNameControl(nc = new NameControl()) {
        this.type = nc.type;
        this.nameControl = nc;
    }
}

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
        let container = this.parentElement;
        let name = container.getAttribute('varname');
        let ec = initiateDefControl(name, container, this);
        defControls[name] = ec;
    });
}

function loadReference() {
    for (let varName in nameControls) {
        var nc = nameControls[varName];
        var ec = defControls[varName];
        nc.loadDefControl(ec);
        ec.loadNameControl(nc);
        nc.updateSize();
        ec.updateSize();
    }
}

function addNameField(name:string, autoIndex = 0) {
    if (name == undefined) name = (1 + autoIndex).toString();
    var html = $.parseHTML(`<div class="name-container" varname="${name}"><div class="name">${name}</div><div class="type">:</div></div>`);
    $('#object-bar').append(html);
    // @ts-ignore
    var nc = initiateNameControl(name, html[0], html[0].children[0]);
    nameControls[nc.varName] = nc;
}

function addExpField(name:string, autoIndex = 0) {
    if (name == undefined) name = (1 + autoIndex).toString();
    var html = $.parseHTML(`<div class=\"expression-container\" varname=\"${name} \"> <span class = \"expression\"></span> </div>`);
    $('#mathpanel').append(html);
    // @ts-ignore
    var ec = initiateDefControl(name, html[0], html[0].children[0]);
    defControls[name] = ec;
}

function focusNext(name:string) {
    defControls[name].mathquill.blur();
    defControls[names[(names.indexOf(name) + 1) % names.length]].mathquill.focus();
}

function focusLast(name:string) {
    defControls[name].mathquill.blur();
    defControls[names[(names.indexOf(name) + names.length - 1) % names.length]].mathquill.focus();
}

function removeNameField(name = "") {
    var nc = nameControls[name];
    var html = nc.nameContainer;
    html.parentNode.removeChild(html);
}

function removeDefField(name = "") {
    var ec = defControls[name];
    var html = ec.defContainer;
    html.parentNode.removeChild(html);
}

function appendDefinition(name:string) {
    addNameField(name);
    addExpField(name);
    let autoIndex = getIndex(names.length);
    nameControls[name].loadDefControl(defControls[name]);
    defControls[name].loadNameControl(nameControls[name]);
}

function removeDefinition(name = "") {
    var index = -1;
    if ((index = names.indexOf(name)) != -1) {
        removeNameField(name);
        delete nameControls[name];
        removeDefField(name);
        delete defControls[name];
        names.splice(index, 1);
        // core.removeDefinition(name);
        if (Number.isInteger(+name)) removeIndex(+name - 1);
    }
    return index;
}

function insertNameField(previous = "", name:string, autoIndex = 0) {
    if (name == undefined) name = (1+autoIndex).toString();
    var html = $.parseHTML(`<div class="name-container" varname="${name}"><div class="name">${name}</div><div class="type">:</div></div>`);
    var previousContainer = nameControls[previous].nameContainer;
    previousContainer.parentNode.insertBefore(html[0], previousContainer.nextSibling);
    var nc = initiateNameControl(name, <HTMLElement>html[0], <HTMLElement>(<HTMLElement>html[0]).children[0]);
    nameControls[nc.varName] = nc;
}

function insertExpField(previous = "", name:string, autoIndex = 0) {
    if (name == undefined) name = (1 + autoIndex).toString();
    var html = $.parseHTML(`<div class=\"expression-container\" varname=\"${name} \"> <span class = \"expression\"></span> </div>`);
    var previousContainer = defControls[previous].defContainer;
    previousContainer.parentNode.insertBefore(html[0], previousContainer.nextSibling);
    var ec = initiateDefControl(name, <HTMLElement>html[0], <HTMLElement>(<HTMLElement>html[0]).children[0]);
    defControls[ec.varName] = ec;
    return name;
}

function insertDefinition(previous = "", name:string = undefined) {
    var index;
    if ((index = names.indexOf(previous)) != -1) {
        var autoIndex = getIndex(index + 1);
        insertNameField(previous, name, autoIndex);
        name = insertExpField(previous, name, autoIndex);
        names.splice(names.indexOf(previous) + 1, 0, name);
        nameControls[name].loadDefControl(defControls[name]);
        defControls[name].loadNameControl(nameControls[name]);
    }

}

function initiateNameControl(name:string, container:HTMLElement, field:HTMLElement) {
    var nc = new NameControl();
    nc.nameContainer = container;
    nc.nameField = field;
    nc.varName = name;

    nc.type = (<HTMLElement>nc.nameContainer.lastElementChild).innerText;
    // console.log(MQ.MathField);
    nc.mathquill = MQ.MathField(nc.nameField, {
        autoSubscriptNumerals: true,
        handlers: {
            edit: () => {
                nc.updateSize();
                //@TODO: replace name with identifier
                let label = nc.parser.toStatementTree(nc.mathquill.latex());
                console.log("updating identifier " + nc.mathquill.latex() + ": " + label);
            }
        }
    });

    let label = nc.parser.toStatementTree(nc.mathquill.latex());
    console.log("updating identifier " + nc.mathquill.latex() + ": " + label);
    // core.createDefinition(name);
    return nc;
}

function initiateDefControl(name:string, container:HTMLElement, field:HTMLElement) {
    var ec = new DefControl();
    ec.defContainer = container;
    ec.defField = field;
    ec.varName = name;
    // ec.parser = new Parser();
    ec.mathquill = MQ.MathField(ec.defField, {
        autoSubscriptNumerals: true,
        autoCommands:'mathbf partial',
        handlers: {
            edit: () => {
                ec.updateSize();
                // core.resizeGraphics();
                let root = ec.parser.toStatementTree(ec.mathquill.latex());
                core.resolveEquation(name, root);
            },
            enter: () => {
                insertDefinition(ec.varName);
                focusNext(ec.varName);
            },
            deleteOutOf: (direction:any) => {
                if (direction == MQ.L) {
                    focusLast(name);
                    removeDefinition(name);
                }
            },
            upOutOf: () => focusLast(name),
            downOutOf: () => focusNext(name),
        }
    });
    let root = ec.parser.toStatementTree(ec.mathquill.latex());
    core.resolveEquation(name, root);
    // console.log(root);
    // core.updateDefinition(name, rpns);
    return ec;
}

export  {
    nameControls,
    defControls,
    loadTags,
    loadShelves,
    loadReference
};