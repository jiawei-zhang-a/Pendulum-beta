import * as UI from './ui';
import {i, C, G, CG} from './graphics';
import {
    CGT,
    CR,
    CC,
    VD,
    colors,
    VF,
    GG,
    PS,
    VG, PG, CAG, P
} from "./graph";
import {S, L, Q, RE} from "./core";
import {SN} from "./parser";
import {cylindricalSteppedPressure, graphCylindrical, ode} from "./program";
import {DC, UIHandle} from "./ui";
// import {Portal} from "function-link";

class EqnExport{
    tex: string;
    color: string;
    visible: boolean;
}

// Coordinator of all actions of sub-modules
class Pendulum {
    //core
    e: S;
    //canvas
    s: C;
    //Color names
    m: string[];
    //UI Handle
    u: UIHandle;
    constructor(s: C){
        this.s = s;
        this.e = new S(this);
        this.m = Object.keys(colors);
        //Load UI
        this.u = UI.load(this);
        //Resize contents to ensure correct placing of graphs
        this.s.onResize();
    }
    ci = 0;
    rc(){
        let modulo = 5;
        let colorName = this.m[this.ci%modulo];
        this.ci++;
        return colorName;
    }
    //Update graph
    ug(label: string, evalHandle: L){
        let graph = this.s.graphs[label];
        let compute = <(t: number, ...param: Number[])=>Number>evalHandle.u.bind(evalHandle);
        let color = this.rc();
        let dataInterface;
        switch (evalHandle.v){
            case 'cartesian':
                dataInterface = (x:number,y:number)=> compute(this.s.time,x,y);
                if(!(graph instanceof CG)){
                    let deleted = this.s.rg(label);
                    if(deleted!=undefined)
                        color = deleted.c;
                }
                if(this.s.graphs[label]==undefined){
                    graph = new CG(label, dataInterface);
                    graph.cg({'material':'standard', 'color':color});
                    graph.gi();
                    graph.pu();
                    this.s.ag(graph);
                }else{
                    if(graph instanceof CG){
                        if(evalHandle.l)
                            graph.ss();
                        graph.d = dataInterface;
                        graph.pu();
                        graph.u();
                    }
                }
                break;
            case 'cartesianAsync':
                let computeAsync = <(t: number, ...param: Number[])=>Promise<Number>>evalHandle.u;
                dataInterface = (x:number,y:number)=> computeAsync(this.s.time,x,y);
                if(!(graph instanceof CG)){
                    let deleted = this.s.rg(label);
                    if(deleted!=undefined)
                        color = deleted.c;
                }
                if(this.s.graphs[label]==undefined){
                    graph = new CAG(label, dataInterface);
                    graph.cg({'material':'standard', 'color':color});
                    graph.gi();
                    graph.pu();
                    this.s.ag(graph);
                }else{
                    if(graph instanceof CAG){
                        if(evalHandle.l)
                            graph.ss();
                        graph.asyncInterface = dataInterface;
                        graph.pu();
                        graph.u();
                    }
                }
                break;
            case 'vector':
                let vecInterface = (x:number,y:number,z:number)=>{
                    // @ts-ignore
                    let result = <Number[]>compute(this.s.time, x, y, z).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof VD)){
                    let deleted = this.s.rg(label);
                    if(deleted!=undefined)
                        color = deleted.c;
                }
                if(this.s.graphs[label] == undefined){
                    graph = new VD(label, vecInterface, ()=>[0,0,0]);
                    graph.cg({'material':'standard', 'color':color});
                    graph.pu();
                    this.s.ag(graph);
                }else{
                    if(graph instanceof VD){
                        if(evalHandle.l)
                            graph.ss();
                        graph.vector = vecInterface;
                        graph.pu();
                        graph.u();
                    }
                }
                break;
            case 'vecField':
                dataInterface = (x:number,y:number,z:number)=>{
                    // @ts-ignore
                    let result = <Number[]>compute(this.s.time, x, y, z).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof VF)){
                    let deleted = this.s.rg(label);
                    if(deleted!=undefined)
                        color = deleted.c;
                }
                if(this.s.graphs[label] == undefined){
                    graph = new VF(label, dataInterface);
                    graph.cg({'material':'standard', 'color':color});
                    graph.pu();
                    this.s.ag(graph);
                }else{
                    if(graph instanceof VF){
                        if(evalHandle.l)
                            graph.ss();
                        graph.vecFunc = dataInterface;
                        graph.uv(dataInterface);
                        graph.pu();
                        graph.u();
                    }
                }
                break;
            case 'parametricSurface':
                dataInterface = (u:number,v:number)=>{
                    // @ts-ignore
                    let result = <Number[]>compute(this.s.time, u, v).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof PS)){
                    let deleted = this.s.rg(label);
                    if(deleted!=undefined)
                        color = deleted.c;
                }
                if(this.s.graphs[label] == undefined){
                    graph = new PS(label, dataInterface);
                    graph.cg({'material':'opaque', 'color':color});
                    graph.gi();
                    graph.pu();
                    this.s.ag(graph);
                }else{
                    if(graph instanceof PS){
                        if(evalHandle.l)
                            graph.ss();
                        graph.d = dataInterface;
                        graph.pu();
                        graph.u();
                    }
                }
                break;
            case 'parametricCurve':
                dataInterface = (u:number)=>{
                    // @ts-ignore
                    let result = <Number[]>compute(this.s.time, u).data;
                    let l = result.length;
                    return [(l>0)?+result[0]:0, (l>1)?+result[1]:0, (l>2)?+result[2]:0];
                };
                if(!(graph instanceof P)){
                    let deleted = this.s.rg(label);
                    if(deleted!=undefined)
                        color = deleted.c;
                }
                if(this.s.graphs[label] == undefined){
                    graph = new P(label, dataInterface);
                    graph.cg({'material':'opaque', 'color':color});
                    graph.gi();
                    graph.pu();
                    this.s.ag(graph);
                }else{
                    if(graph instanceof P){
                        if(evalHandle.l)
                            graph.ss();
                        graph.d = dataInterface;
                        graph.pu();
                        graph.u();
                    }
                }
                break;
            case 'group':
                if(evalHandle.s.length!=0)
                   switch(evalHandle.s[0].v){
                       case 'cartesian':
                           graph = this.gg(label, CR, graph, color,
                               evalHandle,
                               (x:number,y:number)=>
                                   (<Q>evalHandle.u(this.s.time, x, y)).data);
                           break;
                       case 'vector':
                           graph = this.gg(label, VG, graph, color, evalHandle,
                               (x:number,y:number)=>
                                   (<Q>evalHandle.u(this.s.time, x, y)).data);
                           break;
                       case 'parametricSurface':
                           graph = this.gg(label, PG, graph, color, evalHandle,
                               (x:number,y:number)=>
                                   (<Q>evalHandle.u(this.s.time, x, y)).data);
                           break;
                   }
        }
        graph.td = evalHandle.n;
        evalHandle.o(()=>{
            graph.td = evalHandle.n;
            graph.pu();
            graph.u();
        });
        return color;
    }

    //groupGraph
    private gg(label: string, A: { new(label: string, evalHandle: L, dataInteface: Function): GG },
               graph: G, color: string, evalHandle: L,
               dataInterface: Function):G{
        if(!(graph instanceof A)){
            let deleted = this.s.rg(label);
            if(deleted!=undefined)
                color = deleted.c;
        }
        if(this.s.graphs[label] == undefined){
            graph = new A(label, evalHandle, dataInterface);
            graph.cg({'material':'standard', 'color':color});
            graph.pu();
            this.s.ag(graph);
        }else{
            if(graph instanceof A){
                if(evalHandle.l)
                    graph.ss();
                graph.d = dataInterface;
                graph.ug(evalHandle);
                graph.pu();
                graph.u();
            }
        }
        return graph;
    }
    /**
     * wipeGraph
     * Wipes the graph with the corresponding label
     * @param label
     */
    wg(label: string){
        let graph = this.s.graphs[label];
        if(graph!=undefined){
            graph.hm();
        }
    }

    /**
     * deleteGraph
     * Deletes the graph with the corresponding label
     * @param label
     */
    dg(label: string){
        this.s.rg(label);
    }

    //getHint
    gh(statement: SN) {
        return this.e.gl(statement);
    }
    //
    /**
     * updateDefinition
     * @param uid
     * @param oldLabel
     * @param label
     * @param definition
     * @return color of the graph
     */
    ud(uid: string, oldLabel: SN, label: SN, definition: SN):string{

        //console.log("updateDefinition Called ");
        //console.log(oldLabel);
        //console.log(label);
        try{
            if(label == undefined) {
                if (oldLabel != undefined)
                    this.dd(oldLabel);
                return;
            }
            if(oldLabel!=undefined &&oldLabel.c!=label.c){
                //console.log("deleting old label");
                this.dd(oldLabel);
            }
            this.wg(label.c);
            this.e.re(label, uid, definition);
            let variable = this.e.e.v[label.c];
            return this.ug(variable.n,variable.e);
        }catch (e) {
            //console.log(e);
        }
    }
    //deleteDefinition
    dd(label: SN){
        this.e.d(label.c);
        this.dg(label.c);
    }
    //setFieldPlugins
    sfp(uid: string, plugins: string[]){
        UI.defControls[uid].sp(plugins);
    }
    //toggleVisibility
    tv(label: SN){
        let evalHandle = this.e.e.v[label.c].e;
        let graph = this.s.graphs[label.c];
        if(evalHandle!=undefined)
            evalHandle.l = !evalHandle.l;
        if(graph!=undefined){
            if(evalHandle.l) {
                graph.ss();
                return true;
            }
            else {
                graph.hm();
                return false;
            }
        }
    }
    //setVisibility
    sv(label: SN, visible: boolean){
        let variable = this.e.e.v[label.c];
        if(variable==undefined)
            return;
        let evalHandle = variable.e;
        let graph = this.s.graphs[label.c];
        if(evalHandle!=undefined)
            evalHandle.l = visible;
        if(graph!=undefined){
            if(visible) {
                graph.ss();
            }
            else {
                graph.hm();
            }
        }
    }

    /**
     * queryColor
     * Queries for the color of a particular graph with
     * specified label
     */
    qc(label: SN){
        if(this.s.graphs[label.c]!=undefined){
            return this.s.graphs[label.c].qc();
        }
        else
            return -1;
    }
    /**
     * updateColor
     * Update the particular graph to the specifie dcolor
     */
    qq(label: SN, colorName: string){
        if(this.s.graphs[label.c]!=undefined){
            let graph =  this.s.graphs[label.c];
            graph.c = colorName;
            // @ts-ignore, set color
            graph.m.color.setHex(graph.qc());
        }
    }
    /**
     * canvasResized
     *
     * Makes an active call to resize the canvas, especially useful
     * for UI drag bar updates
     */
    cr() {
        this.s.onResize();
    }

    clearFields(){
        let dc = this.u.defRoot;
        do{
            dc.sc.ov("");
            dc.delete();
        }while((dc = dc.next)!=null);
        this.s.onResize();
    }

    toggleGrids(){
        this.s.axesHelper.visible = !this.s.axesHelper.visible;
        for(let gridHelper of this.s.gridHelper){
            gridHelper.visible = !gridHelper.visible;
        }
    }

    /**
     * @return texSheet the TeX sheet representing the currently populated
     * statements, along with the graph color and visibility attributes
     */
    exportFields():string{
        let texSheet:EqnExport[] = [];
        let dc = this.u.defRoot;
        do{
            let eqnExport = new EqnExport();
            eqnExport.tex = dc.sc.getTex();
            eqnExport.color = dc.colorName;
            eqnExport.visible = dc.visible;
            texSheet.push(eqnExport);
        }while((dc = dc.next)!=null);
        console.log(texSheet);
        return JSON.stringify(texSheet,undefined);
    }

    /**
     * Injects a field into the UI, returns the label of that corresponding field
     * @param tex the content of the field injections
     * @return definitionControl the control handle the injected field
     */
    injectField(tex: string):DC{
        let field = this.u.defRoot.lg().dod();
        field.sc.ov(tex);
        // field.sc.a();
        return field;
    }

    /**
     * Load an entire session of statements
     * @param texSheet json string representing the equation sets
     */
    loadTexSheet(texSheet: string){
        this.clearFields();
        let eqns:EqnExport[] = JSON.parse(texSheet);
        for(let i = 0; i<eqns.length; i++){
            let eqn = eqns[i];
            let dc: DC;
            if(i==0){
                dc = this.u.defRoot;
                dc.sc.ov(eqn.tex);
            }else{
                dc = this.injectField(eqn.tex);
            }
            dc.setColor(eqn.color);
            dc.setVisible(eqn.visible);
        }
    }
}
let p: Pendulum;

function download(filename: string, text: string) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

$(()=>{
    let canvas:C = i();

    // let vector = new Vector3D("example", [1,0,0], [1,1,2]);
    // vector.constructGeometry({'color': 'blue'});
    // vector.generateIndices();
    // vector.populate();
    // canvas.addGraph(vector);
    //
    // let vector1 = new Vector3D("example", [1,2,3], [-1,-1,-2]);
    // vector1.constructGeometry({'color': 'blue'});
    // vector1.generateIndices();
    // vector1.populate();
    // canvas.addGraph(vector1);

    p = new Pendulum(canvas);
    // @ts-ignore
    window.Pendulum = p;
    // @ts-ignore
    window.share = ()=>{
        let texSheet = p.exportFields();
        download("savedtex.txt", texSheet);
    }
    // p.injectField("\\sin (x)+y");
    // p.loadTexSheet(`[{"tex":"a=\\\\left(\\\\cos\\\\left(\\\\frac{2\\\\pi}{5}\\\\right),\\\\sin\\\\left(\\\\frac{2\\\\pi}{5}\\\\right),1\\\\right)","color":"blue","visible":false},{"tex":"b=\\\\left(\\\\cos\\\\left(\\\\frac{4\\\\pi}{5}\\\\right),\\\\sin\\\\left(\\\\frac{4\\\\pi}{5}\\\\right),1\\\\right)","color":"blue","visible":false},{"tex":"c=\\\\left(\\\\cos\\\\left(\\\\frac{6\\\\pi}{5}\\\\right),\\\\sin\\\\left(\\\\frac{6\\\\pi}{5}\\\\right),1\\\\right)","color":"blue","visible":false},{"tex":"d=\\\\left(\\\\cos\\\\left(\\\\frac{8\\\\pi}{5}\\\\right),\\\\sin\\\\left(\\\\frac{8\\\\pi}{5}\\\\right),1\\\\right)","color":"blue","visible":false},{"tex":"f=\\\\left(\\\\cos\\\\left(\\\\frac{10\\\\pi}{5}\\\\right),\\\\sin\\\\left(\\\\frac{10\\\\pi}{5}\\\\right),1\\\\right)","color":"blue","visible":false},{"tex":"a+\\\\left(b-a\\\\right)u","color":"blue","visible":true},{"tex":"b+\\\\left(c-b\\\\right)u","color":"blue","visible":true},{"tex":"c+\\\\left(d-c\\\\right)u","color":"blue","visible":true},{"tex":"d+\\\\left(f-d\\\\right)u","color":"blue","visible":true},{"tex":"f+\\\\left(a-f\\\\right)u","color":"blue","visible":true},{"tex":"\\\\left(a+\\\\left(b-a\\\\right)u\\\\right)v","color":"purple","visible":true},{"tex":"\\\\left(b+\\\\left(c-b\\\\right)u\\\\right)v","color":"orange","visible":true},{"tex":"\\\\left(c+\\\\left(d-c\\\\right)u\\\\right)v","color":"green","visible":true},{"tex":"\\\\left(d+\\\\left(f-d\\\\right)u\\\\right)v","color":"red","visible":true},{"tex":"\\\\left(f+\\\\left(a-f\\\\right)u\\\\right)v","color":"blue","visible":true}]`);
    p.toggleGrids();
    // p.updateGraph("sinusoidal", (x,y)=>Math.cos(x*3+p.canvas.time));

    // let graph2 = new CartesianGraph("cosinusoidal",(x,y)=>x*y*Math.cos(y+canvas.time)/4);
    // graph2.constructGeometry({'material':'standard', 'color':'purple'});
    // graph2.generateIndices();
    // graph2.populate();
    // canvas.addGraph(graph2);

    // let graph3 = new CartesianGraph2D('sin', (x)=>Math.cos(x));
    // graph3.constructGeometry({'color':'purple'});
    // graph3.generateIndices();
    // graph3.populate();
    // canvas.addGraph(graph3)
    // cylindricalSteppedPressure(canvas);
    // graphCylindrical(canvas);
    // ode(canvas);

});

export {Pendulum};