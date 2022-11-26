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
// import {Portal} from "function-link";

// Coordinator of all actions of sub-modules
class Pi {
    //core
    e: S;
    //canvas
    s: C;
    //color names
    m: string[];
    constructor(s: C){
        this.s = s;
        this.e = new S(this);
        this.m = Object.keys(colors);
    }
    ci = 0;
    rc(){
        let modulo = 6;
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
    //updateDefinition
    ud(uid: string, oldLabel: SN, label: SN, definition: SN){

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
            this.ug(variable.n,variable.e);
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
            if(evalHandle.l)
                graph.ss();
            else
                graph.hm();
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
     * canvasResized
     *
     * Makes an active call to resize the canvas, especially useful
     * for UI drag bar updates
     */
    cr(){
        this.s.or();
    }
}
let p: Pi;

$(()=>{
    let canvas:C = i();


    // let vector = new Vector3D("example", [1,0,0], [1,1,2]);
    // vector.constructGeometry({'color': 'lightgray'});
    // vector.generateIndices();
    // vector.populate();
    // canvas.addGraph(vector);
    //
    // let vector1 = new Vector3D("example", [1,2,3], [-1,-1,-2]);
    // vector1.constructGeometry({'color': 'blue'});
    // vector1.generateIndices();
    // vector1.populate();
    // canvas.addGraph(vector1);

    p = new Pi(canvas);
    UI.load(p);
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

export {Pi};