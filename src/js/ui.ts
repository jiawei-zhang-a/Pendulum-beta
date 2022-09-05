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
    loadAddBtn();
    loadDefSettingsBtn();
    return defControls;
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
    addButton: HTMLElement,
    navBar: HTMLElement,
    mathPanel: HTMLElement,
    defBar: HTMLElement;

function loadComponents(){
    resizer = document.getElementById('dragBar');
    defPanel = document.getElementById('defpanel');
    graphPanel = document.getElementById('graphpanel');
    root = <HTMLElement> document.getElementById('root');
    addButton = document.getElementById("addButton");
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
let defRoot: DefControl = undefined;
function loadDefinitions(){
    let expressionContainers = $('.expression-container');
    let prev:DefControl = undefined;
    for(let i = 0; i<expressionContainers.length; i++){
        let expression = expressionContainers[i];
        let id = expression.getAttribute('defID');
        let def = new DefControl(id);
        if(defRoot == undefined)
            defRoot = def;
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
function loadAddBtn(){
    addButton.addEventListener("click", addFunction);
}
function addFunction(){
    defRoot.getLast().insertNewDefinition();
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
        this.statementControl = new StatementControl(this, statementContainer,
            <HTMLElement>statementContainer.children[0],
            <HTMLElement>statementContainer.children[1]);
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
        if(defRoot == this)
            if(this.next != undefined)
                this.next = defRoot;
            else
                return;
        if(this.previous!=undefined)
            this.previous.next = this.next;
        if(this.next!=undefined)
            this.next.previous = this.previous;
        this.labelControl.removeHTML();
        this.statementControl.removeHTML();
        pendulum.deleteDefinition(this.labelControl.label);
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
     * Determines the additional visual plugins that this field is displaying, such as
     * slider, value box, arrow base field, ODE start, etc
     */
    fieldPlugins: string[] = [];
    /**
     * Adjust field plugins to match the specified configurations
     * @param plugins
     */
    setFieldPlugins(plugins: string[]){
        for(let currentPlugin of this.fieldPlugins){
            if(plugins.indexOf(currentPlugin)==-1)
                this.deleteFieldPlugin(currentPlugin);
        }
        for(let plugin of plugins){
            if(this.fieldPlugins.indexOf(plugin)==-1)
                this.addFieldPlugin(plugin);
        }
        this.fieldPlugins = plugins;
    }
    /**
     * Inserts a field plugin of the corresponding type into the visual box
     */
    private addFieldPlugin(plugin: string){
        switch (plugin){
            case "slider":
                this.statementControl.insertSliderHTML();
                break;
        }
    }
    private deleteFieldPlugin(plugin: string){
        switch (plugin){
            case "slider":
                this.statementControl.deleteSliderHTML();
                break;
        }
    }
    /**
     * Label control and statement control should all be fully initialized at this point
     */
    updateDefinition(){
        let oldLabel = this.labelControl.label;
        this.labelControl.setHint(pendulum.getHint(this.statementControl.statement));
        pendulum.updateDefinition(this.id, oldLabel, this.labelControl.label, this.statementControl.statement);
        this.statementControl.setColor(pendulum.queryColor(this.labelControl.label));
    }
    getLast():DefControl{
        if(this.next==undefined)
            return this;
        else return this.next.getLast();
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
                edit: this.updateSize.bind(this)
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
        if(!this.statementControl)
            return;
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
const invisibleBackground = `repeating-linear-gradient(
    45deg,
    #dadada,
    #dadada 5px,
    #c6c6c6 5px,
    #c6c6c6 10px)`;

class StatementControl {
    parent: DefControl;
    public id: string = "";
    public statementContainer:HTMLElement;
    public statementField:HTMLElement;
    public colorBox: HTMLElement;
    public sliderNode: HTMLElement;
    public type = ':';
    public labelControl: LabelControl;
    mathquill: any;
    parser: Parser;
    statement: SymNode;
    pluginVisuals: {plugin: HTMLElement};
    constructor(parent: DefControl, container: HTMLElement, field: HTMLElement, colorBox:HTMLElement) {
        this.parent = parent;
        this.id = parent.id;
        this.parser = new Parser();
        this.statementContainer = container;
        this.statementField = field;
        this.colorBox = colorBox;
        this.initiate();
        this.updateValue = this.updateValue.bind(this);
    }
    /**
     * Used to synchronize height between definition container and namefield container
     */
    updateSize() {
        let nameField = this.labelControl.labelField;
        let nameContainer = this.labelControl.labelContainer;
        $(this.statementContainer).innerHeight(this.getInnerHeight());
        if ( this.getOffsetHeight()> nameField.offsetHeight)
            $(nameContainer).outerHeight($(this.statementContainer).outerHeight(true),true);
        else $(this.statementContainer).outerHeight($(nameField).outerHeight(true));
    }

    getInnerHeight(){
        return $(this.statementField).outerHeight()+
            ((this.sliderNode!=undefined)?$(this.sliderNode).outerHeight():0);
    }

    getOffsetHeight(){
        return this.statementContainer.offsetHeight+((this.sliderNode!=undefined)?this.sliderNode.offsetHeight:0);
    }

    initiate() {
        // ec.parser = new Parser();
        this.mathquill = MQ.MathField(this.statementField, {
            autoSubscriptNumerals: true,
            autoCommands:'mathbf partial vec pi',
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
        this.colorBox.addEventListener('click', this.toggleVisibility.bind(this));
    }
    toggleVisibility(){
        pendulum.toggleVisibility(this.labelControl.label);
        this.setColor(pendulum.queryColor(this.labelControl.label));
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
        let html = $.parseHTML(
            `<div class=\"expression-container\" id="${newID}-statement" defID="${newID}">
                    <span class = \"expression\"></span>
                    <div class="color-box"></div>
                </div>`);
        mathPanel.insertBefore(html[0], this.statementContainer.nextSibling);
    }

    insertSliderHTML(){
        let html = $.parseHTML(
          `<span  class="slider" > -10
<input type="range" min="0" max="1000" value="500" id = "${this.id}-slider">
10
</span>`
        )[0];
        this.sliderNode = <HTMLElement> html;
        this.statementContainer.appendChild(html);
        this.statementContainer.style.gridTemplateRows="1fr 1fr;"
        this.sliderNode.addEventListener('input', ((event:Event)=>{
            // @ts-ignore
            this.updateValue(event.target.value);
        }))
    }
    updateValue(newValue: number){
        let tex = "";
        if(this.statement.content=="equal"){
            tex=this.statement.children[0].token.TeX+"=";
        }
        tex+=newValue*0.02-10;
        MQ.MathField(this.statementField).latex(tex);
    }
    deleteSliderHTML(){
        if(!this.sliderNode)
            return;
        this.statementContainer.removeChild(this.sliderNode);
        this.statementContainer.style.gridTemplateColumns = "1fr";
        this.sliderNode = undefined;
    }
    setColor(color: number) {
        if(color>=0){
            let b = color & 0xFF,
                g = (color & 0xFF00) >>> 8,
                r = (color & 0xFF0000) >>> 16;
            this.colorBox.style.background = `rgb(${r}, ${g}, ${b})`;
        }else
            this.colorBox.style.background = invisibleBackground;
    }
}

export  {
    defControls,
    load
};