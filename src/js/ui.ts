/* jshint esversion: 6 */
import "mathquill/build/mathquill";
import {SN, R} from "./parser";
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

class UIHandle{
    defControls:{[key:string]:DC} = {};
    defRoot: DC;
    constructor(defControls: {[key:string]:DC}, defRoot: DC) {
        this.defControls = defControls;
        this.defRoot = defRoot;
    }
}

let defControls:{[key:string]:DC} = {};
let uiHandle:UIHandle = new UIHandle(defControls, undefined);
function load(pendulum:Pendulum){
    loadPendulum(pendulum);
    loadComponents();
    loadDragBar();
    loadDefinitions();
    loadAddBtn();
    loadDefSettingsBtn();
    return uiHandle;
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
        pendulum.cr();
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
    let prev:DC = undefined;
    for(let i = 0; i<expressionContainers.length; i++){
        let expression = expressionContainers[i];
        let id = expression.getAttribute('defID');
        let def = new DC(id);
        if(uiHandle.defRoot == undefined)
            uiHandle.defRoot = def;
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

            pendulum.cr();
        }else{
            navBar.textContent = "Pendulum";
            mathPanel.style.display = "block";
            defPanel.style.gridTemplateColumns = 'minmax(36pt, auto) 1fr';
            resizer.style.display = "block";
            root.style.gridTemplateColumns = `minmax(${previousLeftWidth}%, max-content) 2.5pt 1fr`;

            pendulum.cr();
        }
    }
}
function loadAddBtn(){
    addButton.addEventListener("click", addFunction);
}
function addFunction(){
    uiHandle.defRoot.lg().dod();
}

/**
 * DefControl
 * Semi-linkedList structure for definition management
 */
class DC{
    id: string;
    previous: DC = undefined;
    next: DC = undefined;
    //labelControl
    lc: L;
    //statementControl
    sc: C;
    colorName: string;
    visible = true;
    constructor(id:string) {
        this.id = id;
        defControls[id] = this;
        this.fin();
        this.du();
    }
    setColor(colorName: string){
        this.colorName = colorName;
        pendulum.qq(this.lc.label, colorName);
        this.sc.i(pendulum.qc(this.lc.label));
    }
    setVisible(visible: boolean){
        this.visible = visible;
        pendulum.sv(this.lc.label, visible);
        this.sc.i(pendulum.qc(this.lc.label));
    }
    //InitializeControls
    fin(){
        let labelContainer = document.getElementById(`${this.id}-label`);
        this.lc = new L(this, labelContainer, <HTMLElement>labelContainer.children[0]);
        let statementContainer = document.getElementById(`${this.id}-statement`);
        this.sc = new C(this, statementContainer,
            <HTMLElement>statementContainer.children[0],
            <HTMLElement>statementContainer.children[1]);
        this.unl();
    }
    //LinkControls
    unl(){
        this.lc.b = this.sc;
        this.sc.p = this.lc;
        this.lc.us();
        this.sc.u();
    }
    //Insert
    ins(defControl: DC){
        defControl.next = this.next;
        defControl.previous = this;
        if(this.next!=undefined){
            this.next.previous=defControl
        }
        this.next = defControl;
    }
    //InsertNewDefinition
    dod(){
        let newID = getID();
        this.lc.insertLabelHTML(newID);
        this.sc.e(newID);
        let newDefControl = new DC(newID);
        this.ins(newDefControl);
        return newDefControl;
    }
    //delete
    delete(){
        if(uiHandle.defRoot == this)
            if(this.next != undefined)
                uiHandle.defRoot = this.next;
            else
                return;
        if(this.previous!=undefined)
            this.previous.next = this.next;
        if(this.next!=undefined)
            this.next.previous = this.previous;
        this.lc.removeHTML();
        this.sc.d();
        pendulum.dd(this.lc.label);
    }
    //focusNext
    b() {
        this.sc.q.blur();
        if(this.next!=undefined)
            this.next.sc.q.focus();
    }
    //focusLast
    n() {
        this.sc.q.blur();
        if(this.previous!=undefined)
            this.previous.sc.q.focus();
    }

    /**
     * fieldPlugins
     * Determines the additional visual plugins that this field is displaying, such as
     * slider, value box, arrow base field, ODE start, etc
     */
    pg: string[] = [];
    /**
     * setFieldPlugins
     * Adjust field plugins to match the specified configurations
     * @param plugins
     */
    sp(plugins: string[]){
        for(let currentPlugin of this.pg){
            if(plugins.indexOf(currentPlugin)==-1)
                this.dp(currentPlugin);
        }
        for(let plugin of plugins){
            if(this.pg.indexOf(plugin)==-1)
                this.ap(plugin);
        }
        this.pg = plugins;
    }
    /**
     * addFieldPlugin
     * Inserts a field plugin of the corresponding type into the visual box
     */
    private ap(plugin: string){
        switch (plugin){
            case "slider":
                this.sc.f();
                break;
        }
    }
    //deleteFieldPlugin
    private dp(plugin: string){
        switch (plugin){
            case "slider":
                this.sc.h();
                break;
        }
    }
    /**
     * updateDefinition
     * Label control and statement control should all be fully initialized at this point
     */
    du(){
        let oldLabel = this.lc.label;
        this.lc.ht(pendulum.gh(this.sc.r));
        this.colorName = pendulum.ud(this.id, oldLabel, this.lc.label, this.sc.r);
        this.sc.i(pendulum.qc(this.lc.label));
    }
    //getLast
    lg():DC{
        if(this.next==undefined)
            return this;
        else return this.next.lg();
    }
}

//LabelControl
class L {
    parent: DC;
    public id = "";
    //labelContainer
    public lc:HTMLElement;
    //labelField
    public fl:HTMLElement;
    public type = ':';
    //statementControl
    public b:C;
    public label: SN;
    //mathquill
    mq: any;
    //parser
    s: R;
    //hinting
    o = false;
    //hintTeX
    ot = '';
    constructor(parent: DC, container: HTMLElement, field: HTMLElement) {
        this.parent = parent;
        this.id = parent.id;
        this.s = new R();
        this.lc = container;
        this.fl = field;
        this.it();
    }
    //initiate
    it() {
        this.type = (<HTMLElement>this.lc.lastElementChild).innerText;
        // //console.log(MQ.MathField);
        this.mq = MQ.MathField(this.fl, {
            spaceBehavesLikeTab: true,
            autoSubscriptNumerals: true,
            handlers: {
                edit: this.us.bind(this)
            }
        });
        this.label = this.s.ts(this.mq.latex());
        this.fl.addEventListener('focusin', this.fo.bind(this));
        this.fl.addEventListener('focusout', this.oe.bind(this));
        this.oe();
        //console.log("updating identifier " + this.mq.latex() + ": " + this.label);
    }
    //setHint
    ht(hint: string){
        if(hint==undefined)
            this.ot=this.id;
        else
            this.ot=`\\left(${hint}\\right)`;
        if(this.o){
            this.mq.latex(this.ot);
            this.label = this.s.ts(this.mq.latex());
        }
    }
    //onFocus
    fo(){
        if(this.o){
            this.mq.latex('');
        }
    }
    //onFocusExit
    oe(){
        this.o = this.mq.latex()=='';
        if(this.o){
            this.mq.latex(this.ot);
            this.label = this.s.ts(this.mq.latex());
        }
    }
    /**
     * updateSize
     * Used to synchronize height between definition container and namefield container
     */
    us() {
        if(!this.b)
            return;
        let defField = this.b.sf;
        let defContainer = this.b.sc;
        $(this.lc).innerHeight($(this.fl).outerHeight());
        if (defField.offsetHeight > this.fl.offsetHeight)
            $(this.lc).outerHeight($(defContainer).outerHeight(true),true);
        else $(defContainer).outerHeight($(this.fl).outerHeight(true));
    }

    removeHTML(){
        this.lc.parentNode.removeChild(this.lc);
    }
    insertLabelHTML(newID: string) {
        let html = $.parseHTML(`<div class="name-container" id="${newID}-label" defID="${newID}"> <div class="name"></div> <div class="type">:</div></div>`);
        this.lc.parentNode.insertBefore(html[0], this.lc.nextSibling);
    }
}
const invisibleBackground = `repeating-linear-gradient(
    45deg,
    #dadada,
    #dadada 5px,
    #c6c6c6 5px,
    #c6c6c6 10px)`;

//StatementControl
class C {
    parent: DC;
    public id: string = "";
    //statementContainer
    public sc:HTMLElement;
    //statementField
    public sf:HTMLElement;
    //colorBox
    public cb: HTMLElement;
    //sliderNode
    public sn: HTMLElement;
    //type
    public o = ':';
    //labelControl
    public p: L;
    //mathquill
    q: any;
    //parser
    s: R;
    //statement
    r: SN;
    //pluginVisuals
    t: {plugin: HTMLElement};
    constructor(parent: DC, container: HTMLElement, field: HTMLElement, colorBox:HTMLElement) {
        this.parent = parent;
        this.id = parent.id;
        this.s = new R();
        this.sc = container;
        this.sf = field;
        this.cb = colorBox;
        this.x();
        this.g = this.g.bind(this);
    }
    /**
     * updateSize
     * Used to synchronize height between definition container and namefield container
     */
    u() {
        let nameField = this.p.fl;
        let nameContainer = this.p.lc;
        $(this.sc).innerHeight(this.v());
        if ( this.w()> nameField.offsetHeight)
            $(nameContainer).outerHeight($(this.sc).outerHeight(true),true);
        else $(this.sc).outerHeight($(nameField).outerHeight(true));
    }
    //getInnerHeight
    v(){
        return $(this.sf).outerHeight()+
            ((this.sn!=undefined)?this.sn.offsetHeight:0);
    }
    //getOffsetHeight
    w(){
        return this.sc.offsetHeight+((this.sn!=undefined)?this.sn.offsetHeight:0);
    }
    //initiate
    x() {
        // ec.parser = new Parser();
        this.q = MQ.MathField(this.sf, {
            autoSubscriptNumerals: true,
            autoCommands:'mathbf partial vec pi',
            handlers: {
                edit: this.a.bind(this),
                enter: () => {
                    this.parent.dod();
                    this.parent.b();
                },
                deleteOutOf: (direction:any) => {
                    if (direction == MQ.L) {
                        this.parent.n();
                        this.parent.delete();
                    }
                },
                upOutOf: () => this.parent.n(),
                downOutOf: () => this.parent.b(),
            }
        });
        this.r = this.s.ts(this.q.latex());
        this.sc.addEventListener('focusin', this.b.bind(this));
        this.sc.addEventListener('focusout', this.c.bind(this));
        this.cb.addEventListener('click', this.y.bind(this));
    }
    //toggleVisibility
    y(){
        this.parent.visible = pendulum.tv(this.p.label);
        this.i(pendulum.qc(this.p.label));
    }
    //loadStatement
    z(){
        this.r = this.s.ts(this.q.latex());
        this.parent.du();
    }
    //onEdit
    a(){
        this.u();
        this.z();
    }
    //onFocus
    b(){
        if(this.parent.previous!=undefined)
            this.parent.previous.sc.sc.style.borderBottomWidth='0';
    }
    //onFocusExit
    c(){
        if(this.parent.previous!=undefined)
            this.parent.previous.sc.sc.style.removeProperty('border-bottom-width');
    }
    getTex(){
        return this.q.latex();
    }
    isEmpty(){
        return this.q.latex()=="";
    }
    //removeHTML
    d(){
        this.sc.parentNode.removeChild(this.sc);
    }
    //insertStatementHTML
    e(newID: string) {
        let html = $.parseHTML(
            `<div class=\"expression-container\" id="${newID}-statement" defID="${newID}">
                    <span class = \"expression\"></span>
                    <div class="color-box"></div>
                </div>`);
        mathPanel.insertBefore(html[0], this.sc.nextSibling);
    }

    //insertSliderHTML
    f(){
        let html = $.parseHTML(
          `<div  class="slider" > -10
<input class="sliderComponent" type="range" min="0" max="1000" value="500" id = "${this.id}-slider">
10
</div>`
        )[0];
        this.sn = <HTMLElement> html;
        this.sc.appendChild(html);
        this.sc.style.gridTemplateRows="1fr 1fr;"
        this.sn.addEventListener('input', ((event:Event)=>{
            // @ts-ignore
            this.g(event.target.value);
        }));
        this.u();
    }
    //updateValue
    g(newValue: number){
        let tex = "";
        if(this.r.c=="equal"){
            tex=this.r.ch[0].token.X+"=";
        }
        tex+=Math.round(1000*(newValue*0.02-10))/1000;
        MQ.MathField(this.sf).latex(tex);
    }
    //Override TeX
    ov(tex: string){
        this.q.latex(tex);
    }
    //deleteSliderHTML
    h(){
        if(!this.sn)
            return;
        this.sc.removeChild(this.sn);
        this.sc.style.gridTemplateColumns = "1fr";
        this.sn = undefined;
    }
    //setColor
    i(color: number) {
        if(color>=0){
            let b = color & 0xFF,
                g = (color & 0xFF00) >>> 8,
                r = (color & 0xFF0000) >>> 16;
            this.cb.style.background = `rgb(${r}, ${g}, ${b})`;
        }else
            this.cb.style.background = invisibleBackground;
    }
}

export  {
    defControls,
    DC,
    load,
    UIHandle
};