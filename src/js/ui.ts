/* jshint esversion: 6 */
import "mathquill/build/mathquill";
import {SymNode, Parser} from "./parser";
import {Pendulum} from './pendulum';
import MouseDownEvent = JQuery.MouseDownEvent;
import MouseMoveEvent = JQuery.MouseMoveEvent;

// @ts-ignore
let MQ = MathQuill.getInterface(MathQuill.getInterface.MAX);

let objectBar = $('#object-bar')[0];

// let types = {
//     ":": "Variable",
//     "": "Function",
//     "{": "Object"
// };

let names:string[] = [];
let nameControls:{[key:string]:NameControl} = {};
let defControls:{[key:string]:DefControl} = {};

/**
 * Used to record whether certain number slots are filled
 */
let indexes:boolean[] = [];

function getIndex(position = 0) {
    if (position >= indexes.length) {
        indexes[position] = true;
        return position;
    }
    let i = position;
    for (; i < indexes.length; i++) {
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

function load(pendulum:Pendulum){
    loadPendulum(pendulum);
    loadDragBar();
    loadTags();
    loadShelves();
    linkNameDefControls();
    loadDefSettingsBtn();
}

let pendulum: Pendulum;
function loadPendulum(p: Pendulum){
    pendulum = p;
}

function loadDragBar(){
    // Query the element
    const resizer = document.getElementById('dragBar');
    const leftSide = <HTMLElement>resizer.previousElementSibling;
    const rightSide = <HTMLElement>resizer.nextElementSibling;
    const root = <HTMLElement> document.getElementById('root');
// The current position of mouse
    let x = 0;
    let y = 0;

// Width of left side
    let leftWidth = 0;

// Handle the mousedown event
// that's triggered when user drags the resizer
    const mouseDownHandler = function (e: MouseEvent) {
        // Get the current mouse position
        x = e.clientX;
        y = e.clientY;
        leftWidth = leftSide.getBoundingClientRect().width;

        // Attach the listeners to `document`
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    };
    const mouseMoveHandler = function (e: MouseEvent) {
        // How far the mouse has been moved
        const dx = e.clientX - x;

        const newLeftWidth = ((leftWidth + dx) * 100) /
            root.getBoundingClientRect().width;
        root.style.gridTemplateColumns = `minmax(${newLeftWidth}%, max-content) 2.5pt 1fr`;
        leftSide.style.userSelect = 'none';
        leftSide.style.pointerEvents = 'none';
        rightSide.style.userSelect = 'none';
        rightSide.style.pointerEvents = 'none';
        pendulum.canvasResized();
    };

    const mouseUpHandler = function () {
        document.body.style.removeProperty('cursor');

        leftSide.style.removeProperty('user-select');
        leftSide.style.removeProperty('pointer-events');

        rightSide.style.removeProperty('user-select');
        rightSide.style.removeProperty('pointer-events');

        // Remove the handlers of `mousemove` and `mouseup`
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    };

// Attach the handler
    resizer.addEventListener('mousedown', mouseDownHandler);
}

function loadTags() {
    $('.name').each(function () {
        let container = this.parentElement;
        let id = container.getAttribute('varname');
        let nc = initiateNameControl(id, container, this);
        names.push(id);
        nameControls[id] = nc;
    });
}

function loadShelves() {
    $('.expression').each(function () {
        let container = this.parentElement;
        let id = container.getAttribute('varname');
        let ec = initiateDefControl(id, container, this);
        defControls[id] = ec;
    });
}

function linkNameDefControls() {
    for (let varName in nameControls) {
        let nc = nameControls[varName];
        let ec = defControls[varName];
        nc.loadDefControl(ec);
        ec.loadNameControl(nc);
        nc.updateSize();
        ec.updateSize();
    }
}

function loadDefSettingsBtn(){
    const defSettings = document.getElementById("defSettings");
    const navBar = document.getElementById("navbar");
    const defPanel = document.getElementById("defpanel");
    const mathPanel = document.getElementById("mathpanel");
    const dragBar = document.getElementById("dragBar");
    const root = document.getElementById("root");

    const mainHighlight = getComputedStyle(defSettings).getPropertyValue('--mainHighlight');
    const white = '#ffffff';

    let hideExpressions = false;
    defSettings.addEventListener("click", toggleHideExpressions);
    let previousLeftWidth = 0;
    function toggleHideExpressions(e: Event){
        hideExpressions = !hideExpressions;

        if(hideExpressions){
            previousLeftWidth = defPanel.getBoundingClientRect().width * 100 /
                root.getBoundingClientRect().width;
            navBar.textContent = "Π";
            mathPanel.style.display = "none";
            defPanel.style.gridTemplateColumns = 'minmax(36pt, auto) 0px';
            dragBar.style.display = "none";
            root.style.gridTemplateColumns = 'max-content 0pt 1fr';

            pendulum.canvasResized();
        }else{
            navBar.textContent = "Pendulum";
            mathPanel.style.display = "block";
            defPanel.style.gridTemplateColumns = 'minmax(36pt, auto) 1fr';
            dragBar.style.display = "block";
            root.style.gridTemplateColumns = `minmax(${previousLeftWidth}%, max-content) 2.5pt 1fr`;

            pendulum.canvasResized();
        }
    }
}

class NameControl {
    public id = "";
    public nameContainer:HTMLElement;
    public nameField:HTMLElement;
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
        let defField = this.defControl.defField;
        let defContainer = this.defControl.defContainer;
        $(this.nameContainer).innerHeight($(this.nameField).outerHeight());
        if (defField.offsetHeight > this.nameField.offsetHeight)
            $(this.nameContainer).outerHeight($(defContainer).outerHeight(true),true);
        else $(defContainer).outerHeight($(this.nameField).outerHeight(true));
    }

    loadDefControl(ec:DefControl) {
        this.defControl = ec;
    }
}
class DefControl {
    public id: string = "";
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
        let nameField = this.nameControl.nameField;
        let nameContainer = this.nameControl.nameContainer;
        $(this.defContainer).innerHeight($(this.defField).outerHeight());
        if (this.defField.offsetHeight > nameField.offsetHeight)
            $(nameContainer).outerHeight($(this.defContainer).outerHeight(true),true);
        else $(this.defContainer).outerHeight($(nameField).outerHeight(true));
    }

    loadNameControl(nc = new NameControl()) {
        this.type = nc.type;
        this.nameControl = nc;
    }
}

function addNameField(id:string, autoIndex = 0) {
    if (id == undefined) id = (1 + autoIndex).toString();
    let html = $.parseHTML(
        `<div class="name-container" varname="${id}">
            <div class="name">${id}</div>
            <div class="type">:</div>
        </div>`);
    $('#object-bar').append(html);
    // @ts-ignore
    let nc = initiateNameControl(id, html[0], html[0].children[0]);
    nameControls[nc.id] = nc;
}

function addExpField(id:string, autoIndex = 0) {
    if (id == undefined) id = (1 + autoIndex).toString();
    let html = $.parseHTML(
        `<div class=\"expression-container\" varname=\"${id} \">
            <span class = \"expression\"></span> 
        </div>`);
    $('#mathpanel').append(html);
    // @ts-ignore
    let ec = initiateDefControl(id, html[0], html[0].children[0]);
    defControls[id] = ec;
}

function focusNext(id:string) {
    defControls[id].mathquill.blur();
    defControls[names[(names.indexOf(id) + 1) % names.length]].mathquill.focus();
}

function focusLast(id:string) {
    defControls[id].mathquill.blur();
    defControls[names[(names.indexOf(id) + names.length - 1) % names.length]].mathquill.focus();
}

function removeNameField(id = "") {
    let nc = nameControls[id];
    let html = nc.nameContainer;
    html.parentNode.removeChild(html);
}

function removeDefField(id = "") {
    let ec = defControls[id];
    let html = ec.defContainer;
    html.parentNode.removeChild(html);
}

function appendDefinition(id:string) {
    addNameField(id);
    addExpField(id);
    let autoIndex = getIndex(names.length);
    nameControls[id].loadDefControl(defControls[id]);
    defControls[id].loadNameControl(nameControls[id]);
}

function removeDefinition(id = "") {
    let index = -1;
    if ((index = names.indexOf(id)) != -1) {
        removeNameField(id);
        delete nameControls[id];
        removeDefField(id);
        delete defControls[id];
        names.splice(index, 1);
        // core.removeDefinition(id);
        if (Number.isInteger(+id)) removeIndex(+id - 1);
    }
    return index;
}

function insertNameField(previous = "", id:string, autoIndex = 0) {
    let html = $.parseHTML(`<div class="name-container" varname="${id}"><div class="name">${id}</div><div class="type">:</div></div>`);
    let previousContainer = nameControls[previous].nameContainer;
    previousContainer.parentNode.insertBefore(html[0], previousContainer.nextSibling);
    let nc = initiateNameControl(id, <HTMLElement>html[0], <HTMLElement>(<HTMLElement>html[0]).children[0]);
    nameControls[nc.id] = nc;
}

function insertExpField(previous = "", id:string, autoIndex = 0) {
    let html = $.parseHTML(`<div class=\"expression-container\" varname=\"${id} \"> <span class = \"expression\"></span> </div>`);
    let previousContainer = defControls[previous].defContainer;
    previousContainer.parentNode.insertBefore(html[0], previousContainer.nextSibling);
    let ec = initiateDefControl(id, <HTMLElement>html[0], <HTMLElement>(<HTMLElement>html[0]).children[0]);
    defControls[ec.id] = ec;
}

function insertDefinition(previous = "", id:string = undefined) {
    let index;
    if ((index = names.indexOf(previous)) != -1) {
        let autoIndex = getIndex(index + 1);
        if (id == undefined) id = (1 + autoIndex).toString();
        insertNameField(previous, id, autoIndex);
        insertExpField(previous, id, autoIndex);
        names.splice(names.indexOf(previous) + 1, 0, id);
        nameControls[id].loadDefControl(defControls[id]);
        defControls[id].loadNameControl(nameControls[id]);
    }

}

function initiateNameControl(id:string, container:HTMLElement, field:HTMLElement) {
    let nc = new NameControl();
    nc.nameContainer = container;
    nc.nameField = field;
    nc.id = id;

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

function initiateDefControl(id:string, container:HTMLElement, field:HTMLElement) {
    let ec = new DefControl();
    ec.defContainer = container;
    ec.defField = field;
    ec.id = id;
    // ec.parser = new Parser();
    ec.mathquill = MQ.MathField(ec.defField, {
        autoSubscriptNumerals: true,
        autoCommands:'mathbf partial',
        handlers: {
            edit: () => {
                ec.updateSize();
                // core.resizeGraphics();
                let root = ec.parser.toStatementTree(ec.mathquill.latex());
                pendulum.updateDefinition(id, root);
            },
            enter: () => {
                insertDefinition(ec.id);
                focusNext(ec.id);
            },
            deleteOutOf: (direction:any) => {
                if (direction == MQ.L) {
                    focusLast(id);
                    removeDefinition(id);
                }
            },
            upOutOf: () => focusLast(id),
            downOutOf: () => focusNext(id),
        }
    });
    let root = ec.parser.toStatementTree(ec.mathquill.latex());
    pendulum.updateDefinition(id, root);
    return ec;
}

export  {
    nameControls,
    defControls,
    load
};