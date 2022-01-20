/* jshint esversion: 6 */
import "mathquill/build/mathquill";
import {SymNode, Parser} from "./parser";
import {Pendulum} from './pendulum';

// @ts-ignore
let MQ = MathQuill.getInterface(MathQuill.getInterface.MAX);


// let types = {
//     ":": "Variable",
//     "": "Function",
//     "{": "Object"
// };

let idGenerator = 1;

function getID() {
    return (idGenerator++).toString();
}

function load(pendulum:Pendulum){
    loadPendulum(pendulum);
    loadComponents();
    loadDragBar();
    loadDefinitions();
    loadDefSettingsBtn();
}

let pendulum: Pendulum;
function loadPendulum(p: Pendulum){
    pendulum = p;
}

let resizer: HTMLElement,
    defPanel: HTMLElement,
    graphPanel:HTMLElement,
    root: HTMLElement,
    defSettings: HTMLElement,
    navBar: HTMLElement,
    mathPanel: HTMLElement,
    defBar: HTMLElement;

function loadComponents(){
    resizer = document.getElementById('dragBar');
    defPanel = document.getElementById('defpanel');
    graphPanel = document.getElementById('graphpanel');
    root = <HTMLElement> document.getElementById('root');
    defSettings = document.getElementById("defSettings");
    navBar = document.getElementById("navbar");
    mathPanel = document.getElementById("mathpanel");
    defBar = document.getElementById('object-bar');
}

function loadDragBar(){
    // Query the element
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
        leftWidth = defPanel.getBoundingClientRect().width;

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
        defPanel.style.userSelect = 'none';
        defPanel.style.pointerEvents = 'none';
        graphPanel.style.userSelect = 'none';
        graphPanel.style.pointerEvents = 'none';
        pendulum.canvasResized();
    };

    const mouseUpHandler = function () {
        document.body.style.removeProperty('cursor');

        defPanel.style.removeProperty('user-select');
        defPanel.style.removeProperty('pointer-events');

        graphPanel.style.removeProperty('user-select');
        graphPanel.style.removeProperty('pointer-events');

        // Remove the handlers of `mousemove` and `mouseup`
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    };

// Attach the handler
    resizer.addEventListener('mousedown', mouseDownHandler);
}

function loadDefinitions(){
    let expressionContainers = $('.expression-container');
    let prev:DefControl = undefined;
    for(let i = 0; i<expressionContainers.length; i++){
        let expression = expressionContainers[i];
        let id = expression.getAttribute('defID');
        let def = new DefControl(id);
        def.previous=prev;
        if(prev!=undefined)
            prev.next = def;
        prev = def;
        idGenerator++;
    }
}

function loadDefSettingsBtn(){

    let hideExpressions = false;
    defSettings.addEventListener("click", toggleHideExpressions);
    let previousLeftWidth = 0;
    function toggleHideExpressions(){
        hideExpressions = !hideExpressions;

        if(hideExpressions){
            previousLeftWidth = defPanel.getBoundingClientRect().width * 100 /
                root.getBoundingClientRect().width;
            navBar.textContent = "Π";
            mathPanel.style.display = "none";
            defPanel.style.gridTemplateColumns = 'minmax(36pt, auto) 0px';
            resizer.style.display = "none";
            root.style.gridTemplateColumns = 'max-content 0pt 1fr';

            pendulum.canvasResized();
        }else{
            navBar.textContent = "Pendulum";
            mathPanel.style.display = "block";
            defPanel.style.gridTemplateColumns = 'minmax(36pt, auto) 1fr';
            resizer.style.display = "block";
            root.style.gridTemplateColumns = `minmax(${previousLeftWidth}%, max-content) 2.5pt 1fr`;

            pendulum.canvasResized();
        }
    }
}
let defControls:{[key:string]:DefControl} = {};
/**
 * Semi-linkedList structure for definition management
 */
class DefControl{
    id: string;
    previous: DefControl = undefined;
    next: DefControl = undefined;
    labelControl: LabelControl;
    statementControl: StatementControl;
    constructor(id:string) {
        this.id = id;
        defControls[id] = this;
        this.initializeControls();
        this.updateDefinition();
    }
    initializeControls(){
        let labelContainer = document.getElementById(`${this.id}-label`);
        this.labelControl = new LabelControl(this, labelContainer, <HTMLElement>labelContainer.children[0]);
        let statementContainer = document.getElementById(`${this.id}-statement`);
        this.statementControl = new StatementControl(this, statementContainer, <HTMLElement>statementContainer.children[0]);
        this.linkControls();
    }
    linkControls(){
        this.labelControl.statementControl = this.statementControl;
        this.statementControl.labelControl = this.labelControl;
        this.labelControl.updateSize();
        this.statementControl.updateSize();
    }
    insert(defControl: DefControl){
        defControl.next = this.next;
        defControl.previous = this;
        if(this.next!=undefined){
            this.next.previous=defControl
        }
        this.next = defControl;
    }
    insertNewDefinition(){
        let newID = getID();
        this.labelControl.insertLabelHTML(newID);
        this.statementControl.insertStatementHTML(newID);
        let newDefControl = new DefControl(newID);
        this.insert(newDefControl);
    }
    delete(){
        if(this.previous!=undefined)
            this.previous.next = this.next;
        if(this.next!=undefined)
            this.next.previous = this.previous;
        this.labelControl.removeHTML();
        this.statementControl.removeHTML();
    }
    focusNext() {
        this.statementControl.mathquill.blur();
        if(this.next!=undefined)
            this.next.statementControl.mathquill.focus();
    }
    focusLast() {
        this.statementControl.mathquill.blur();
        if(this.previous!=undefined)
            this.previous.statementControl.mathquill.focus();
    }

    /**
     * Label control and statement control should all be fully initialized at this point
     */
    updateDefinition(){
        this.labelControl.setHint(pendulum.getHint(this.statementControl.statement));
        pendulum.updateDefinition(this.labelControl.label, this.statementControl.statement);
    }
}

class LabelControl {
    parent: DefControl;
    public id = "";
    public labelContainer:HTMLElement;
    public labelField:HTMLElement;
    public type = ':';
    public statementControl:StatementControl;
    public label: SymNode;
    mathquill: any;
    parser: Parser;
    hinting = false;
    hintTeX = '';
    constructor(parent: DefControl, container: HTMLElement, field: HTMLElement) {
        this.parent = parent;
        this.id = parent.id;
        this.parser = new Parser();
        this.labelContainer = container;
        this.labelField = field;
        this.initiate();
    }
    initiate() {
        this.type = (<HTMLElement>this.labelContainer.lastElementChild).innerText;
        // console.log(MQ.MathField);
        this.mathquill = MQ.MathField(this.labelField, {
            spaceBehavesLikeTab: true,
            autoSubscriptNumerals: true,
            handlers: {
            }
        });
        this.label = this.parser.toStatementTree(this.mathquill.latex());
        this.labelField.addEventListener('focusin', this.onFocus.bind(this));
        this.labelField.addEventListener('focusout', this.onFocusExit.bind(this));
        this.onFocusExit();
        console.log("updating identifier " + this.mathquill.latex() + ": " + this.label);
    }
    setHint(hint: string){
        if(hint==undefined)
            this.hintTeX=this.id;
        else
            this.hintTeX=`\\left(${hint}\\right)`;
        if(this.hinting){
            this.mathquill.latex(this.hintTeX);
            this.label = this.parser.toStatementTree(this.mathquill.latex());
        }
    }
    onFocus(){
        if(this.hinting){
            this.mathquill.latex('');
        }
    }
    onFocusExit(){
        this.hinting = this.mathquill.latex()=='';
        if(this.hinting){
            this.mathquill.latex(this.hintTeX);
            this.label = this.parser.toStatementTree(this.mathquill.latex());
        }
    }
    /**
     * Used to synchronize height between definition container and namefield container
     */
    updateSize() {
        let defField = this.statementControl.statementField;
        let defContainer = this.statementControl.statementContainer;
        $(this.labelContainer).innerHeight($(this.labelField).outerHeight());
        if (defField.offsetHeight > this.labelField.offsetHeight)
            $(this.labelContainer).outerHeight($(defContainer).outerHeight(true),true);
        else $(defContainer).outerHeight($(this.labelField).outerHeight(true));
    }

    removeHTML(){
        this.labelContainer.parentNode.removeChild(this.labelContainer);
    }
    insertLabelHTML(newID: string) {
        let html = $.parseHTML(`<div class="name-container" id="${newID}-label" defID="${newID}"> <div class="name"></div> <div class="type">:</div></div>`);
        this.labelContainer.parentNode.insertBefore(html[0], this.labelContainer.nextSibling);
    }
}

class StatementControl {
    parent: DefControl;
    public id: string = "";
    public statementContainer:HTMLElement;
    public statementField:HTMLElement;
    public type = ':';
    public labelControl: LabelControl;
    mathquill: any;
    parser: Parser;
    statement: SymNode;
    constructor(parent: DefControl, container: HTMLElement, field: HTMLElement) {
        this.parent = parent;
        this.id = parent.id;
        this.parser = new Parser();
        this.statementContainer = container;
        this.statementField = field;
        this.initiate();
    }
    /**
     * Used to synchronize height between definition container and namefield container
     */
    updateSize() {
        let nameField = this.labelControl.labelField;
        let nameContainer = this.labelControl.labelContainer;
        $(this.statementContainer).innerHeight($(this.statementField).outerHeight());
        if (this.statementField.offsetHeight > nameField.offsetHeight)
            $(nameContainer).outerHeight($(this.statementContainer).outerHeight(true),true);
        else $(this.statementContainer).outerHeight($(nameField).outerHeight(true));
    }

    initiate() {
        // ec.parser = new Parser();
        this.mathquill = MQ.MathField(this.statementField, {
            autoSubscriptNumerals: true,
            autoCommands:'mathbf partial',
            handlers: {
                edit: this.onEdit.bind(this),
                enter: () => {
                    this.parent.insertNewDefinition();
                    this.parent.focusNext();
                },
                deleteOutOf: (direction:any) => {
                    if (direction == MQ.L) {
                        this.parent.focusLast();
                        this.parent.delete();
                    }
                },
                upOutOf: () => this.parent.focusLast(),
                downOutOf: () => this.parent.focusNext(),
            }
        });
        this.statement = this.parser.toStatementTree(this.mathquill.latex());
        this.statementContainer.addEventListener('focusin', this.onFocus.bind(this));
        this.statementContainer.addEventListener('focusout', this.onFocusExit.bind(this));
    }
    loadStatement(){
        this.statement = this.parser.toStatementTree(this.mathquill.latex());
        this.parent.updateDefinition();
    }
    onEdit(){
        this.updateSize();
        this.loadStatement();
    }
    onFocus(){
        if(this.parent.previous!=undefined)
            this.parent.previous.statementControl.statementContainer.style.borderBottomWidth='0';
    }
    onFocusExit(){
        if(this.parent.previous!=undefined)
            this.parent.previous.statementControl.statementContainer.style.removeProperty('border-bottom-width');
    }
    removeHTML(){
        this.statementContainer.parentNode.removeChild(this.statementContainer);
    }
    insertStatementHTML(newID: string) {
        let html = $.parseHTML(`<div class=\"expression-container\" id="${newID}-statement" defID="${newID}"> <span class = \"expression\"></span> </div>`);
        mathPanel.insertBefore(html[0], this.statementContainer.nextSibling);
    }
}

export  {
    defControls,
    load
};