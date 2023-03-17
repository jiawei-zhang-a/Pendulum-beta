import {SN} from "./parser";
import {Pendulum} from "./pendulum";
import {stat} from "fs";

const aAscii = 'a'.charCodeAt(0);
const contextID = function(letter: string){
    if(letter[0] == '>')
        return alphabet(letter[1])+26;
    return alphabet(letter[0]);
}
const alphabet = function(letter: string){
    let index = letter.charCodeAt(0)-aAscii;
    if(index<0||index>=26)
        return -1;
    return index;
}
const xID = contextID('x');
const yID = contextID('y');
const zID = contextID('z');
const tID = contextID('t');
const rID = contextID('r');
const uID = contextID('u');
const vID = contextID('v');
const vecRID = contextID('>r');

class S {

    e: E = new E();
    p: Pendulum;
    constructor(pendulum: Pendulum){
        this.p = pendulum;
    }
    /**
     * Methods for resolving types of inputted statements (in string) to native representations.
     */

    /**
     * guessLabel
     * Deduces the default label for the statement given, if no label can be effectively deduced,
     * returns undefined.
     * @param statement
     */
    gl(statement: SN): string{
        if(statement==undefined)
            return undefined;
        //First investigate if an equation is present
        if(!(statement.t == 'operator'&&statement.c == 'equal')){
            return undefined;
        }
        let lhs = statement.ch[0];
        let rhs = statement.ch[1];
        if(lhs==undefined||rhs==undefined)
            return undefined;
        //Check for singletons
        if((lhs.t=='$'||lhs.t=='func$')){
            if('xyz'.indexOf(lhs.c)!=-1)
                return undefined;
            return lhs.c;
        }
        if(rhs.t=='$'||rhs.t=='func$'){
            if('xyz'.indexOf(lhs.c)!=-1)
                return undefined;
            return rhs.c;
        }
        let leaves;
        try{//Check for expression completeness
            leaves = statement.gl();
        }catch (e) {
            return undefined;
        }
        //Check for stand-alone algebraics
         let algebraicCounts:{[p: string]:number} = {};
         for(let key in leaves){
             if(algebraicCounts[key]==undefined)
                 algebraicCounts[key] = 1;
             else
                 algebraicCounts[key]++;
         }
         for(let key in algebraicCounts){
             if(algebraicCounts[key]==1
                 &&(this.e.v[key]==undefined
                     ||this.e.v[key].t==3))
                 return key;
         }
         return undefined;
    }
    /**
     * resolveEquation
     * Resolves the equation by assigning it the proper label
     * @param label the overriding string for label supplied by the user
     * @param uid
     * @param statement
     * @return parseMessage the message constant that prompts the UI response
     */
    re(label: SN, uid: string, statement: SN):number {
        // Check if an equation is given.
        if(label == undefined){
            throw new RE("Unable to guess label");
        }
        if(statement == undefined){
            throw new RE("No definition");
        }
        let leaves;
        try{//Check for expression completeness
            leaves = statement.gl();
        }catch (e) {
            if(e instanceof ReferenceError){
                throw new RE("Incomplete expression");
            }else
                throw e;
        }
        //console.log(label);
        if(this.ie(statement)&&label.t=='$'||label.t=='func$'
            &&!this.cl(label.c, leaves))
            throw new RE("Invalid label override");
        let variable = this.de(label, statement);
        variable.x = uid;
        //console.log(variable);
        this.e.v[label.c] = variable;
        this.e.u[uid] = variable;
        variable.ps();
        variable.eh();
        let plugins: string[] = [];
        if(variable.s){
            plugins.push("slider");
        }
        this.p.sfp(uid, plugins)
        return 0;
    }

    /**
     * isEquation
     * Tests whether a given statement is an equation
     * @param statement
     */
    ie(statement: SN){
        return statement.t=='operator'&&statement.c=='=';
    }

    //Define code variable
    dc(label: string,
       compute:(a: Arithmetics,c:Number[][],p:Number[])=>Number|Promise<Number>, dependencies: string[], async: boolean){
        let newVar = this.pv(label, dependencies);
        newVar.t = 2;
        newVar.sc(compute);
        newVar.h = async;
        return newVar;
    }

    //prepareVariable
    pv(label: string, dependencies:string[]){

        let newVar:B;
        // For redefinition, erase the previous dependencies, retain the dependants.
        if(this.e.v[label] != undefined) {
            newVar = this.e.v[label];
            newVar.l.length = 0;
            newVar.rp();
            newVar.m = {};
            newVar.g = {};
            newVar.pm = [];
        } else {
            newVar = new B(label, this.e);
        }
        for (let depVarLabel of dependencies) {
            let reference:number[];
            let rlIndex;
            // Dependency.
            let depVar = this.e.v[depVarLabel];
            // Create dependent variable not present in the current environment.
            if (depVar == undefined) {
                depVar = new B(depVarLabel, this.e);
                this.e.v[depVarLabel] = depVar;
            }
            //Idempotent dependency construction
            newVar.d[depVarLabel]=depVar;
            depVar.q[newVar.n] = newVar;
            // Initialize rl cache if needed.
            if ((rlIndex = newVar.m[depVarLabel]) == undefined) {
                reference = [];
                newVar.m[depVarLabel] = newVar.l.length;
                newVar.g[newVar.l.length] = depVarLabel;
                newVar.l.push(reference);
                newVar.k(depVarLabel);
            }
        }
        return newVar;
    }

    //defineEqnVariable
    de(label: SN, statement:SN):B{
        if(!(statement.c=='equal'&&statement.t=='operator'))
            return this.ed(label.c, label, statement);
        let lhs = statement.ch[0];
        let rhs = statement.ch[1];
        // Explicit definition. Left-hand side is a singleton of a variable
        if(lhs.t == '$' || lhs.t == 'func$'){
            let rhsLeaves = statement.ch[1].gl();
            if(!this.cl(lhs.c, rhsLeaves))
                return this.ed(label.c, lhs, rhs);
        }
        if(rhs.t == '$' || rhs.t == 'func$'){
            let lhsLeaves = statement.ch[0].gl();
            if(!this.cl(rhs.c, lhsLeaves))
                return this.ed(label.c, rhs, lhs);
        }
        return this.ri(label, statement);
    }

    /**
     * containsLabel
     * Checks whether the statement tree contains variables with the
     * specified label, if not returns false
     * @param label
     * @param leaves
     */
    cl(label: string, leaves: SN[]){
        for(let leaf of leaves){
            if(leaf.c==label)
                return true;
        }
        return false;
    }

    /**
     * readExplicitDefinition
     * Interpret the statement tree as native data representations.
     * @param label Label specified by the user
     * @param defined Tree representation of the variable that is defined, should be a leaf here.
     * @param definition Tree representation of the definition in terms of an expression
     */
    ed(label: string, defined: SN, definition: SN): B {
        let newVar:B;
        // For redefinition, erase the previous dependencies, retain the dependants.
        if(this.e.v[label] != undefined) {
            newVar = this.e.v[label];
            newVar.l.length = 0;
            newVar.rp();
            newVar.m = {};
            newVar.g = {};
            newVar.pm = [];
        } else {
            newVar = new B(label, this.e);
        }
        newVar.p = defined.t=='func$';
        if(newVar.p){//Initialize parameter mapping for parameterized functions
            for(let index in defined.sc){
                let child = defined.sc[index];
                if(child.sc.length!=0){
                    throw new RE("Parameterized function variable with nested denominator is invalid");
                }
                newVar.pm[index] = contextID(child.c);
            }
        }
        /*
            First top-down traversal to generate variables and establish dependencies.
         */
        let leaves: SN[] = definition.gl();
        for(let leaf of leaves){
            // Name of this dependency.
            let depVarLabel = leaf.c;
            //Idempotent parameterized access style specification
            if(leaf.t == 'func$')
                newVar.fa[depVarLabel] = true;
        }
        for (let leaf of leaves) {
            //Consider only symbols representing functions or algebraics
            if (leaf.t == '#' || leaf.t == 'constant')
                continue;
            // Build reference list.
            // Name of this dependency.
            let depVarLabel = leaf.c;
            let reference:number[];
            let rlIndex;
            // Dependency.
            let depVar = this.e.v[depVarLabel];
            // Create dependent variable not present in the current environment.
            if (depVar == undefined) {
                depVar = new B(depVarLabel, this.e);
                this.e.v[depVarLabel] = depVar;
            }
            //Idempotent dependency construction
            newVar.d[depVarLabel]=depVar;
            depVar.q[newVar.n] = newVar;
            // Initialize rl cache if needed.
            if ((rlIndex = newVar.m[depVarLabel]) == undefined) {
                reference = [];
                newVar.m[depVarLabel] = newVar.l.length;
                newVar.g[newVar.l.length] = depVarLabel;
                newVar.l.push(reference);
                newVar.k(depVarLabel);
            }
        }
        //Set type of new var away from constant if it has dependency. As the
        //new variable is reasonably defined by this time, it shouldn't be algebraic
        newVar.t = (Object.keys(newVar.d).length!=0)? 2: 1;
        newVar.s = (definition.t == "#" && definition.ch.length == 0)||
            (definition.t == "operator"&&definition.c=='neg'&&definition.ch[0].t=='#');
        let piScript = this.gp(definition, newVar);
        //console.log("piScript: \n"+piScript);
        newVar.ss(piScript);
        return newVar;
    }

    //readImplicitDefinition
    ri(label: SN, expression: SN):B {
        throw new RE("not yet implemented");
    }

    /**
     * splitLowerCase
     * Retrieves the variable name of the varied quantity of a large
     * operator
     * @param lowerClause
     * @private
     */
    private lc(lowerClause: SN):{variableName: string, lowerClause: SN}{
        if(lowerClause.c==='equal'){
            let lhs = lowerClause.ch[0];
            let rhs = lowerClause.ch[1];
            if(lhs.t == '$')
                return {variableName:lhs.c, lowerClause: rhs};
        }
        return undefined;
    }
    //getPiScript
    gp(statement: SN, variable: B): string{
        let piScript: string = "";// "//owned by: "+variable.n;
        let preScript = `
//The default behavior is parameter extension for vector typed quantities        
if(p.length == 1 && 
    p[0].type!=undefined && p[0].size == pm.length
    && p.type == 4){
    p = p[0].data;
}
for(let index = 0; index<pm.length; index++){
    let q = p[index];
    p[index]=c[pm[index]][0];
    c[pm[index]][0] = q;
    if(q!=undefined&&q.type!=undefined)
        q.lock();
}\n`;
        let postScript = `
for(let index = 0; index<pm.length; index++){
    let q = c[pm[index]][0];
    c[pm[index]][0] = p[index];
    if(q!=undefined&&q.type!=undefined){
        q.release();
        q.recycle();
    }
}\n`;
        if(variable.p&&variable.t!=1){//Append parameter override clause
            piScript+=preScript;
            piScript+="let r = "+this.pt(statement,variable)+";";
            piScript+=postScript;
            piScript+="return r;";
        }
        else
            piScript+="\nreturn "+this.pt(statement, variable)+';';
        return piScript;
    }

    //parseTree
    pt(node: SN, variable: B):string {
        let nodeLabel = node.c;
        let concatenated = "";
        switch(node.t){
            case '$':
                return "get("+variable.m[nodeLabel]+", c)";
            case '#':
                return node.c;
            case 'constant':
                switch (node.c) {
                    case 'i':
                        return 'a.I';
                    default:
                        return 'Math.'+node.c.toUpperCase();
                }
            case 'operator':
                if(node.c=='sum'){
                    return this.pl(node, variable);
                }
            case 'function':
                for(let subTree of node.ch){
                    concatenated+=this.pt(subTree, variable)+",";
                }
                return this.a(node.c)
                    +"("+ concatenated.substring(0, concatenated.length-1) +")";
            case 'func$':
                for(let subTree of node.sc){
                    concatenated+=this.pt(subTree, variable)+",";
                }
                return "get("+variable.m[nodeLabel]+", c, 1)"+"(a, c, "
                        +"["+ concatenated.substring(0, concatenated.length-1) +"])";
            case 'vector':
                for(let subTree of node.ch){
                    concatenated+=this.pt(subTree, variable)+',';
                }
                return `a.getQuantity(4,${concatenated})`;
            case 'array':
                for(let subTree of node.ch){
                    concatenated+=this.pt(subTree, variable)+',';
                }
                return `a.getQuantity(3,${concatenated})`;
        }
        return "";
    }

    //parseLargeOperator
    pl(node: SN, variable: B): string{
        let nodeLabel = node.c;
        let exprContent = this.pt(node.ch[0], variable);
        let {variableName, lowerClause} = this.lc(node.sc[0]);
        let upperClause = node.sc[1];
        let nID = contextID(variableName);
        let expr = `(n)=>{
    let store = c[${nID}][0];
    c[${nID}][0]=n;
    let r = ${exprContent};
    c[${nID}][0] = store;
    return r;
}`;
        return `${this.a(node.c)}(${this.pt(lowerClause, variable)},
    ${this.pt(upperClause, variable)},${expr})`;
    }

    /**
     * convertAlias
     * Converts from an alias of an operator to its unified name in Arithmetics.
     *
     * @param operator
     */
    a(operator: string): string{
        if(operator == 'invisdot')
            return 'a.invisDot';
        if(operator == 'frac')
            return 'a.div';
        if(operator == 'ln')
            return 'a.log';
        if(operator == 'cos'||operator == 'sin'||operator=='tan'||operator=='cot')
            return 'a.'+operator;
        if(operator == 'sqrt')
            return 'Math.'+operator;
        return 'a.'+operator;
    }

    //deleteDefinition
    d(label: string){
        let variable = this.e.v[label];
        if(variable == undefined)
            return;
        delete this.e.u[variable.x];
        variable.t = 3;
        variable.l.length = 0;
        variable.rp();
        variable.m = {};
        variable.g = {};
        variable.pm = [];
        variable.v = variable.f;
        variable.ps();
        if(Object.keys(variable.q).length==0){
            delete this.e.v[label];
        }
    }

    //createImportVariable
    civ(label: string, URL: string){
        
    }
}

class E {
    //Variables
    v: {[name: string]: B} = {};
    //uidVariables
    u: {[uid: string]: B} = {};
}


class AE extends Error { }
class RE extends Error {
    constructor(message: string) {
        super(message)
    }
}

class Q extends Number{
    rc: RecycleCenter;
    /**
     * 1. real
     * 2. complex
     * 3. array (data matrix)
     * 4. vector (matrix)
     */
    type: number;
    data: Number[];
    size: number;
    private lockNumber: number;
    constructor(type: number, size: number, rc:RecycleCenter,
                dataContainer: Number[]) {
        super();
        this.type = type;
        this.size = size;
        this.lockNumber = 1;
        this.data = dataContainer;
        this.rc = rc;
    }
    //recycle
    r(){
        if(this.lockNumber!==0)
            return;
        let rc =this.rc;
        if(this.type == 2){
            rc.sc.push(this);
            return;
        }
        if(this.type == 3 || this.type == 4){
            if(this.size<=3)
                rc.s0.push(this);
            else
                rc.s1[rc.getLogIndex(this.size/3)].push(this);
        }
    }
    //lock
    l(){
        this.lockNumber++;
        for(let q of this.data)
            if(q instanceof Q)
                q.l();
    }
    //unlock
    c(){
        if(this.lockNumber!==0)
            this.lockNumber--;
        for(let q of this.data)
            if(q instanceof Q)
                q.c();
    }

    valueOf(): number {
        return this.data[0].valueOf();
    }
    toString(): string {
        switch (this.type) {
            case 2:
                return this.data[0]+'+'+this.data[1]+'i';
        }
        return '';
    }
}

class RecycleCenter{
    /**
     * Array / vector stack 0
     */
    s0: Q[];
    /**
     * Array vector stack 1
     */
    s1: Q[][];
    /**
     * Complex variable stack
     */
    sc: Q[];
    constructor() {
        this.s0 = [];
        this.s1 = [];
        this.sc = [];
    }
    getQuantity(type: number, dim: number):Q{
        if(type == 2){
            if(this.sc.length!=0) {
                return this.sc.pop();
            }
            else{
                return  new Q(type, dim, this, [0,0]);
            }
        }
        if(dim<=3){
            if(this.s0.length!=0) {
                let q = this.s0.pop();
                q.type = type;
                q.size = dim;
                return q;
            }
            else{
                return  new Q(type, dim, this, new Array(dim).fill(0));
            }
        }
        else {
            let index = this.getLogIndex(dim/3);
            if(this.s1[index]==undefined)
                this.s1[index] = [];
            if (this.s1[index].length != 0) {
                let q = this.s1[index].pop();
                q.type = type;
                q.size = dim;
                return q;
            }
            else {
                return new Q(type, dim, this, new Array(dim).fill(0));
            }
        }
    }

    /**
     * Take discrete binary log of the input
     * @param r
     */
    getLogIndex(r: number){
        let i = 0;
        while(r!=0){
            r=r>>1;
            i++;
        }
        return i-1;
    }
}

class Arithmetics {
    rc: RecycleCenter;
    //Imaginary unit
    I: Q;
    constructor() {
        this.rc = new RecycleCenter();
        this.I = new Q(2, 2, undefined, [0, 1]);
        this.I.l();
    }

    getQuantity(type: number, ...entries: Number[]):Q{
        let q = this.rc.getQuantity(type, entries.length);
        q.data = entries;
        return q;
        // return new Quantity(type, entries.length, undefined, entries)
    }

    add(a:Number, b:Number): Number {
        if(!(a instanceof Q)&&!(b instanceof Q)){
            //@ts-ignore
            return a+b;
        }
        let ar = this.extensionRank(a);
        let br = this.extensionRank(b);
        if(br>ar){
            a = this.extend(a, (<Q>b).type, (<Q>b).size);
        }
        else if(ar>br){
            b = this.extend(b, (<Q>a).type, (<Q>a).size);
        }
        if(a instanceof Q) {
            if(b instanceof Q){
                if(a.type!=b.type)
                    throw new AE("Incompatible quantity type for addition");
                let dim = Math.max(a.size, b.size);
                let c = this.rc.getQuantity(a.type, dim);
                for(let i = 0; i<dim; i++){
                    let ai = (i>a.size-1)?0:a.data[i];
                    let bi = (i>b.size-1)?0:b.data[i];
                    c.data[i] = this.add(ai,bi);
                }
                a.r();
                b.r();
                return c;

            }else
                throw new AE("Incompatible quantity type for addition");
        }else
            throw new AE("Operation not yet supported");
    }
    neg(a: Number): Number{
        if(a instanceof Q){
            let c = this.rc.getQuantity(a.type, a.size);
            for(let i = 0; i < a.size; i++){
                c.data[i] = this.neg(a.data[i]);
            }
            Arithmetics.recycle(a);
            return c;
        }
        return -a;
    }

    /**
     * Retrieves the extension rank of a,
     * the order is real -> complex -> vector -> array
     * @param a
     * @private
     */
    private extensionRank(a: Number): number{
        if(a instanceof Q){
            if(a.type == 3)
                return 4;
            if(a.type == 4)
                return 3;
            return a.type;
        }
        return 1;
    }
    sub(a:Number, b:Number): Number {
        if(!(a instanceof Q)&&!(b instanceof Q)){
            //@ts-ignore
            return a-b;
        }
        let ar = this.extensionRank(a);
        let br = this.extensionRank(b);
        if(br>ar){
            a = this.extend(a, (<Q>b).type, (<Q>b).size);
        }
        else if(ar>br){
            b = this.extend(b, (<Q>a).type, (<Q>a).size);
        }
        if(a instanceof Q) {
            if(b instanceof Q){
                if(a.type!=b.type||a.size != b.size)
                    throw new AE("Incompatible quantity type for subtraction");
                let dim = Math.max(a.size, b.size);
                let c = this.rc.getQuantity(a.type, dim);
                for(let i = 0; i<dim; i++){
                    let ai = (i>a.size-1)?0:a.data[i];
                    let bi = (i>b.size-1)?0:b.data[i];
                    c.data[i] = this.sub(ai,bi);
                }
                a.r();
                b.r();
                return c;
            }else
                throw new AE("Incompatible quantity type for addition");
        }else
            throw new AE("Operation not yet supported");
    }

    invisDot(a:Number, b:Number): Number {
        switch (Arithmetics.getType(b)) {
            case 4:
                if(Arithmetics.getType(a) <=2) {//Field invisDot a vector or matrix
                    let c = this.rc.getQuantity(4, (<Q>b).size);
                    if(a instanceof Q)
                        a.l();
                    for (let i = 0; i < (<Q>b).size; i++) {
                        c.data[i] = this.invisDot(a, (<Q>b).data[i]);
                    }
                    if(a instanceof Q)
                        a.c();
                    Arithmetics.recycle(a);
                    Arithmetics.recycle(b);
                    return c;
                }else if(Arithmetics.getType(a) == 3){
                    let c = this.rc.getQuantity(3, (<Q>a).size);
                    for (let i = 0; i < (<Q> a).size; i++){
                        c.data[i] = this.invisDot((<Q> a).data[i], b);
                    }
                    Arithmetics.recycle(a);
                    Arithmetics.recycle(b);
                    return c;
                }
                throw new AE("");
            case 3:
                switch (Arithmetics.getType(a)) {
                    case 4:
                        return this.invisDot(b, a);
                    case 3:
                        if((<Q>a).size == (<Q>b).size){
                            let size = (<Q>a).size;
                            let c = this.rc.getQuantity(3, size);
                            for(let i = 0; i < size; i++){
                                //@ts-ignore
                                c.data[i] = this.invisDot(a.data[i], b.data[i]);
                            }
                            Arithmetics.recycle(a);
                            Arithmetics.recycle(b);
                            return c;
                        }else
                            throw new AE("Incompatible operand size");
                    case 2:
                    case 1:
                        let size = (<Q>b).size;
                        let c = this.rc.getQuantity(3, size);
                        for(let i = 0; i < size; i++)
                            c.data[i] = this.invisDot(a, (<Q>b).data[i]);
                        Arithmetics.recycle(b);
                        return c;
                }
                throw new AE("this shouldn't be possible to reach");
            case 2:
                if(Arithmetics.getType(a) <=2){
                    return this.multiply(a, b);
                }else
                    return this.invisDot(b, a);
            case 1:
                if(!(a instanceof Q))
                    //@ts-ignore here a and b must be instances of Number
                    return a*b;
                else return this.invisDot(b, a);
        }

    }

    dot(a:Number, b:Number): Number {
        if (a instanceof Q && b instanceof Q)
            if (a.type == 4 && b.type == 4) {
                if (a.size == b.size && a.size > 0) {
                    let c = this.dot(a.data[0], b.data[0]);
                    for (let i = 1; i < a.size; i++) {
                        c = this.add(c, this.dot(a.data[0], b.data[0]));
                    }
                    Arithmetics.recycle(a);
                    Arithmetics.recycle(b);
                    return c;
                } else
                    throw new AE("Cannot dot product vectors of different dimensions");
            }
        return this.invisDot(a, b);
    }

    private static getType(q: Number){
        if(q instanceof Q)
            return q.type;
        else
            return 1;
    }

    private static getSize(q: Number){
        if(q instanceof Q)
            return q.size;
        else
            return 1;
    }

    private static recycle(q: Number){
        if(q instanceof Q)
            q.r();
    }
    /**
     * Accepts only real or complex quantities, otherwise return 0
     * @param a real or complex
     * @param b real or complex
     * @private
     */
    private multiply(a: Number, b:Number): Number{
        //Broadcast both quantities to complex numbers
        if(!(a instanceof Q)){
            a = this.extend(+a, 2, 2);
        }
        if(!(b instanceof Q)){
            b = this.extend(+b, 2, 2);
        }
        let c = this.rc.getQuantity(2, 2);
        if(a instanceof Q && b instanceof Q
            && a.type == 2 && b.type == 2){
            //@ts-ignore
            c.data[0] = a.data[0]*b.data[0] -a.data[1]*b.data[1];
            //@ts-ignore
            c.data[1] = a.data[0]*b.data[1] +a.data[1]*b.data[0];
            a.r();
            b.r();
            return c;
        }else
            throw new AE("multiply can only act on fields");
    }

    /**
     * Extends a number into a broader quantity
     * @private
     */
    private extend(a: Number, targetType: number, targetDim: number): Q{
        let q = this.rc.getQuantity(targetType, targetDim);
        if(targetType ==3){
            for(let i = 0; i<targetDim; i++){
                q.data[i] = this.clone(a);
            }
        }
        else{
            for(let i = 0; i<targetDim; i++){
                q.data[i] = 0;
            }
            q.data[0] = a;
        }
        return q;
    }

    clone(a: Number){
        if(a instanceof Q){
            let q = this.rc.getQuantity(a.type, a.size);
            q.data = [...a.data];
            return q;
        }else
            return a;
    }

    private isComplex(a: Number) {
        return a instanceof Q && a.type === 2;
    }

    private isField(a: Number){
        return this.isComplex(a)||!(a instanceof Q);
    }

    cross(a: Number, b: Number): Number{
        if(a instanceof Q && b instanceof Q) {
            if (a.type == 4 && b.type == 4) {
                if (a.size == b.size && a.size == 3) {
                    let c = this.rc.getQuantity(4, 3);
                    let [u, v, w] = a.data;
                    let [x, y, z] = b.data;
                    let holder = c.data;
                    holder[0] = this.sub(this.multiply(v,z),this.multiply(w,y));
                    holder[1] = this.sub(this.multiply(w,x),this.multiply(u,z));
                    holder[2] = this.sub(this.multiply(u,y),this.multiply(v,x));
                    Arithmetics.recycle(a);
                    Arithmetics.recycle(b);
                    return c;
                } else
                    throw new AE("Cannot cross product vectors of dimension not equal to 3");
            }
            if(a.type==3&&b.type==3){//Cartesian product
                    let c = this.rc.getQuantity(3, a.size*b.size);
                    for(let i = 0; i<a.size; i++)
                        for(let j = 0; j<b.size; j++){
                            let x = a.data[i];
                            let y = b.data[j];
                            let z = this.rc.getQuantity(4,
                                Arithmetics.getSize(x)+Arithmetics.getSize(y));
                            z.data.length = 0;
                            if(x instanceof Q && x.type==4)//Concatenate
                                z.data.push(...x.data);
                            else
                                z.data.push(x);
                            if(y instanceof Q && y.type==4)
                                z.data.push(...y.data);
                            else
                                z.data.push(y);
                            c.data[i*b.size+j] = z;
                        }
                    for(let i = 0; i<a.size; i++)
                        Arithmetics.recycle(a.data[i]);
                    for(let j = 0; j<b.size; j++){
                        Arithmetics.recycle(b.data[j]);
                    }
                    a.r();
                    b.r();
                    return c;
                }
        }
        return this.invisDot(a, b);
    }

    div(a:Number, b:Number): Number {
        if(Arithmetics.getType(b)<=3){
            return this.invisDot(this.invert(b), a);
        }else
            throw new AE("Can not divide by vectors");
    }

    /**
     * Takes inverse of a complex or real number
     * @param a
     * @private
     */
    private invert (a: Number): Number{
        if(!(a instanceof Q))
            return 1/+a;
        else switch (a.type) {
            case 2:
                let c = this.rc.getQuantity(2, 2);
                let modeSq = (+a.data[0])**2+(+a.data[1])**2;
                //Take conjugate of a and divide
                // by mode squared yields complex inverse
                c.data[0] = +a.data[0]/modeSq;
                c.data[1] = -a.data[1]/modeSq;
                a.r();
                return c;
            case 3:
                let d = this.rc.getQuantity(3, a.size);
                for(let i = 0; i< a.size; i++){
                    d.data[i] = this.invert(a.data[i]);
                }
                a.r();
                return d;
        }
        throw new AE("Invert should only act on real or complex numbers or arrays");
    }
    //In the future this controls the branch number taken when doing log or power
    branchNumber = 0;
    /**
     * Accepts complex and real number as parameters,
     * when either a or b
     * @param a
     * @param b
     */
    pow(a:Number, b:Number): Number {
        if(!(a instanceof Q)&&!(b instanceof Q))
            return (+a)**(+b);
        if((b instanceof Q)&&b.type==2){
            if(!(a instanceof Q)){
                let x = b.data[0];
                let y = b.data[1];
                let c = this.rc.getQuantity(2, 2);
                c.data[0] = ((+a)**+x)*Math.cos(Math.log(+a)*+y);
                c.data[1] = ((+a)**+x)*Math.sin(Math.log(+a)*+y);
                Arithmetics.recycle(a);
                Arithmetics.recycle(b);
                return c;
            }
        }
        if(a instanceof Q){
            if(a.type==2&&Arithmetics.getType(b)<=2){//Complex to complex power
                let c = this.rc.getQuantity(2, 2);
                //@ts-ignore
                let r = Math.sqrt(a.data[0]*a.data[0]+a.data[1]*a.data[1]);
                let theta = Math.acos((+a.data[0])/r);
                //@ts-ignore
                if(Arithmetics.len(b)==0){
                    return 1;
                }
                if(r==0) {
                    return 0;
                }
                c.data[0] = Math.log(r);
                c.data[1] = (a.data[1]<0)?(this.branchNumber*2*Math.PI-theta)
                    :this.branchNumber*2*Math.PI+theta;
                // //console.log(c.data[1]);
                Arithmetics.recycle(a);
                return this.pow(Math.E, this.multiply(c, b));
            }
        }
       return this.arrayOperate(a, b, this.pow);
    }
    static len(a: Number): number{
        switch (this.getType(a)) {
            case 1:
                return +a;
            case 2:
                //@ts-ignore
                return a.data[0]*a.data[0]+a.data[1]*a.data[2];
        }
    }
    log(a: Number): Number{
        switch (Arithmetics.getType(a)) {
            case 1:
                return Math.log(+a);
            case 2:
                let c = this.rc.getQuantity(2, 2);
                //@ts-ignore
                let r = Math.sqrt(a.data[0]*a.data[0]+a.data[1]*a.data[1]);
                //@ts-ignore
                let theta = Math.acos((+a.data[0])/r);
                c.data[0] = Math.log(r);
                //@ts-ignore
                c.data[1] = (a.data[1]<0)?(this.branchNumber*2*Math.PI-theta)
                    :this.branchNumber*2*Math.PI+theta;
                Arithmetics.recycle(a);
                return c;
            default:
                return this.arrayFunc(<Q> a, this.log);
        }
    }

    cos(a: Number){
        switch (Arithmetics.getType(a)) {
            case 1:
                return Math.cos(+a);
            case 2:
                let x = +(<Q> a).data[0];
                let y = +(<Q> a).data[1];
                let c = this.rc.getQuantity(2,2);
                c.data[0] = (Math.exp(y)+Math.exp(-y))*Math.cos(x)/2;
                c.data[1] = (Math.exp(-y)-Math.exp(y))*Math.sin(x)/2;
                Arithmetics.recycle(a);
                return c;
            default:
                return this.arrayFunc(<Q> a, this.cos);
        }
    }
    sin(a: Number){
        switch (Arithmetics.getType(a)) {
            case 1:
                return Math.sin(+a);
            case 2:
                let x = +(<Q> a).data[0];
                let y = +(<Q> a).data[1];
                let c = this.rc.getQuantity(2,2);
                c.data[0] = (Math.exp(-y)+Math.exp(y))*Math.sin(x)/2;
                c.data[1] = (Math.exp(y)-Math.exp(-y))*Math.cos(x)/2;
                Arithmetics.recycle(a);
                return c;
            default:
                return this.arrayFunc(<Q> a, this.cos);
        }
    }
    tan(a: Number){
        if(a instanceof Q){
            (<Q>a).l();
            return this.div(this.sin(a),this.cos(a));
        }else{
            return Math.tan(+a);
        }
    }
    cot(a: Number){
        if(a instanceof Q){
            (<Q>a).l();
            return this.div(this.cos(a),this.sin(a));
        }else{
            return 1/Math.tan(+a);
        }
    }
    /**
     * Operates on arrays or vectors with a given unary function iteratively.
     * Returns a quantity of the same type and dimension.
     * @param a
     * @param func
     * @private
     */
    private arrayFunc(a: Q, func: (a: Number)=>Number): Number{
        let c = this.rc.getQuantity(a.type, a.size);
        for(let i = 0; i < a.size; i++){
            c.data[i] = func(a.data[i]);
        }
        Arithmetics.recycle(a);
        return c;
    }

    /**
     * Operates on arrays with a given binary operator,
     * broadcasts a if b is an array and vice versa. Termwise
     * operate if a and b are arrays with matching dimensions.
     * @param a
     * @param b
     * @param operator
     * @private
     */
    private arrayOperate(a: Number, b: Number, operator: (a: Number, b: Number)=>Number){
        if(Arithmetics.getType(a)<=2 && b instanceof Q && b.type == 3){
            let c = this.rc.getQuantity(3, b.size);
            for(let i = 0; i < b.size; i++){
                c.data[i]=operator(a, b.data[i]);
            }
            Arithmetics.recycle(a);
            Arithmetics.recycle(b);
            return c;
        }
        if(Arithmetics.getType(b)<=2 && a instanceof Q && a.type == 3){
            let c = this.rc.getQuantity(3, a.size);
            for(let i = 0; i < a.size; i++){
                c.data[i]=operator(a.data[i], b);
            }
            Arithmetics.recycle(a);
            Arithmetics.recycle(b);
            return c;
        }
        if(a instanceof Q && b instanceof Q
            &&a.type == 3 && b.type==a.type){
            let c = this.rc.getQuantity(3, a.type);
            for(let i = 0; i < a.size; i++){
                c.data[i]=operator(a.data[i], b.data[i]);
            }
            Arithmetics.recycle(a);
            Arithmetics.recycle(b);
            return c;
        }
        return 0;
    }

    /**
     * Cross prodcut for two element vectors, returns the area as a number
     * @param u first vector
     * @param v second vector
     */
    twoCross(u: number[], v: number[]) {
        if (u.length < 2 || v.length < 2)
            throw new AE("Vector dimensions less than two");
        return u[0]*v[1]-u[1]*v[0];
    }

    /**
     * Takes the factorial of a number
     * @param n
     */
    factorial(n: number):number{
        if(n<=0)
            return 1;
        return n*this.factorial(n-1);
    }

    /**
     * Adds b into a and recycles b instead of recycling both. When
     * a is extended from a number into a Quantity, reference might change
     * @param a
     * @param b
     */
    collapsingAdd(a:Number, b:Number): Number {
        if(!(a instanceof Q)&&!(b instanceof Q)){
            //@ts-ignore
            return a+b;
        }
        let ar = this.extensionRank(a);
        let br = this.extensionRank(b);
        if(br>ar){
            a = this.extend(a, (<Q>b).type, (<Q>b).size);
        }
        else if(ar>br){
            b = this.extend(b, (<Q>a).type, (<Q>a).size);
        }
        if(a instanceof Q) {
            if(b instanceof Q){
                if(a.type!=b.type)
                    throw new AE("Incompatible quantity type for addition");
                let dim = Math.max(a.size, b.size);
                for(let i = 0; i<dim; i++){
                    let ai = (i>a.size-1)?0:a.data[i];
                    let bi = (i>b.size-1)?0:b.data[i];
                    a.data[i] = this.add(ai,bi);
                }
                b.r();
                return a;

            }else
                throw new AE("Incompatible quantity type for addition");
        }else
            throw new AE("Operation not yet supported");
    }
    /**
     * Sums up the expression from range n0 to n1
     * @param n0
     * @param n1
     * @param expr
     */
    sum(n0: number, n1: number, expr:(n:number)=>Number):Number{
        let sum = expr(n0);
        for(let n = n0+1; n <= n1; n++){
            sum = this.collapsingAdd(sum, expr(n));
        }
        return sum;
    }
}

/**
 * Evaluable
 * A simple interface as an evaluation handle for
 * external access of a variable, carries with itself
 * a context matrix
 */
abstract class L {
    //target
    t: B;
    //evaluate
    e: (a:Arithmetics, c:Number[][], p:Number[])=>Number|Promise<Number>;
    //context
    c: Number[][];
    //visType
    v = 'none';
    //visible
    l = true;
    //subEvaluables
    //This list is populated when visType is group
    s: L[] = [];
    //timeDependent
    n: boolean = false;
    public constructor(target: B, previous: L) {
        this.t = target;
        this.e = target.v;
        this.c = new Array(52);
        for(let i = 0; i<26; i++){
            this.c[i] = [NaN];
        }
        for(let i = 26; i<52; i++){
            this.c[i] = [];
        }
        this.p.bind(this);
        if(previous!=undefined)
            this.l = previous.l;
    }

    /**
     * compute
     * @param t
     * @param param sparse array of ID-based parameters
     */
    abstract u(t: number, ...param: Number[]): Number|Promise<Number>;
    //populateContext
    p(t: number, param: number[], vecR: Q) {
        //Supply positional arguments into x & y by default,
        //Parameters clause will then override x & y values
        //if they occupy the same name space. eg. f(y,x)
        this.c[xID][0] = param[0];
        this.c[yID][0] = (param.length>1)?param[1]:0;
        this.c[zID][0] = (param.length>2)?param[2]:0;
        this.c[rID][0] = Math.sqrt(param[0]*param[0]+param[1]*param[1]+param[2]*param[2]);
        this.c[tID][0] = t;
        vecR.data[0] = param[0];
        vecR.data[1] = (param.length>1)?param[1]:0;
        vecR.data[2] = (param.length>2)?param[2]:0;
        this.c[vecRID][0] = vecR;
    }

    //Listener
    st: Function = undefined;

    //onUpdate
    o(callBack: () => void) {
        this.st = callBack;
    }

    //update
    d(){
        if(this.st!=undefined)
            this.st();
    }
}

//Variable
class B {

    /**
     * name
     * String identifier of variable.
     */
    public n:string;

    /**
     * type
     * Indexed ID of the type of variable matching the inner class names.
     * 1. 'Constant'
     * 2. 'Function'
     * 3. 'Algebraic'
     */
    public t: number = 3;
    //anonymous
    public a: boolean = false;

    /**
     * evalHandle
     * Inner class implemented evaluation handle.
     */
    e: L;
    /**
     * arithmetics
     * Each variable should store an arithmetics instance
     */
    r: Arithmetics;
    /**
     * dependencies
     * References of variables that this variable depends for its definition.
     * Actively managed.
     *
     */
    d:{[key: string]: B};
    /**
     * functionAccess
     * Indicates whether a dependent variable is accessed function style
     * (func$) typed token
     */
    fa:{[key: string]: boolean};
    /**
     * dependants
     * References of variables that depend on this variable.
     * Passively managed.
     */
    q:{[key: string]: B};
    /**
     * piScript
     * Code for evaluating this variable.
     */
    c:string = '';

    /**
     * referenceList
     * Contains references of structure [type, parameter1, parameter2, ...]
     */
    l:(Number|Function)[][];
    /**
     * rlMapping
     * A mapping from local variable names to the index of that
     * local variable inside the reference list
     */
    m: { [varLabel: string]: number };
    /**
     * inverseRlMapping
     * A mapping from reference list indices
     */
    g: { [rlIndex: number]: string };
    /**
     * parameterized
     * Indicates whether the variable takes parameters during evaluation
     */
    p = false;
    /**
     * singleNumber
     * Set to true if the variable is specified by a singular number
     */
    s = false;
    /**
     * asynchronous
     * Determines if the evaluation method is asynchronous
     */
    h = false;
    /**
     * parameterMapping
     * parameter position -> contextID, generated upon instantiation
     */
    pm: number[] = [];
    /**
     * compute
     * Core function generated based on piScript. Takes parameters
     * a: Arithmetics, c: context, p: parameters, pm: parameter mapping,
     * get: reference access
     *
     * @protected
     */
    protected u: Function;

    environment: E;
    /**
     * default
     * Default evaluation clause
     * @param a
     * @param c
     * @param p
     */
    f = (a:Arithmetics, c:Number[][], p: Number[])=>c[this.cd][0];
    /**
     * evaluate
     * Wraps around compute to create local field accessibility. Takes parameters
     * a: Arithmetics, c: context, p: parameters
     *
     * Initialized to default value access
     */
    v: (a:Arithmetics, c:Number[][], p:Number[])=>Number|Promise<Number>
        = this.f;
    //evaluateAsync
    as: (a:Arithmetics, c:Number[][], p:Number[], callback: (val: Number)=>void)=>void;
    //get
    tg = (rlID:number, context: Number[][], s = 0)=>{
        let reference = this.l[rlID];
        if(s!==0){
            switch (reference[0]) {
                case 1: return reference[2];
                case 2: return reference[1];
                case 3: return reference[3];
            }
        }
        switch (reference[0]){//Depends on type
            case 1: return reference[1];
            case 2: return (<Function>reference[1])(this.r, context, []);
            case 3: return context[<number>reference[1]][<number>reference[2]];
        }
        return undefined;
    };
    /**
     * contextID
     * Context ID for default value access
     */
    cd: number;
    /**
     * uid
     * ID of the user input
     */
    x: string;
    /**
     * Default constructors with no initialization.
     */
    public constructor(name:string, environment: E) {
        this.n = name;
        this.environment = environment;
        this.cd = contextID(name);
        this.m = {};
        this.l = [];
        this.g = {};
        this.q = {};
        this.d = {};
        this.fa = {};
        this.r = new Arithmetics();
    }
    //setPiScript
    ss(piScript:string){
        this.c = piScript;
        //a is the Arithmetics library, p contains the parameters,
        // and c is the context matrix
        this.u = new Function('a', 'c', 'p', 'pm', 'get', piScript);
        let compute = this.u;
        let parameterMapping = this.pm;
        let get = this.tg.bind(this);
        this.v = function(a: Arithmetics, context: Number[][], parameters: Number[]){
            return compute(a, context, parameters, parameterMapping, get);
        };
    }
    //setCompute
    sc(compute:(a: Arithmetics, c:Number[][], p:Number[])=>Number|Promise<Number>){
        this.u=compute;
        this.v = function(a: Arithmetics, context: Number[][], parameters: Number[]){
            return compute(a, context, parameters);
        };
    }

    /**
     * loadVisualization
     * Configures the type of visualizations that should be applied to this,
     * based on the name of the dependent variable, the type of this, and so on
     */
    i(pendulum: Pendulum){
        return pendulum.ug(this.n,this.e);
    }
    /**
     * createEvalHandle
     * Instantiates a new evaluation handle for the variable. The type
     * of the evaluation handle varies depending on the number of local
     * algebraics.
     */
    eh(){
        let Anonymous;
        let a = this.r;
        switch (this.t){
            case 1:
                Anonymous = class extends L{
                    u(t:number, ...param: number[]): Number|Promise<Number> {
                        return this.e(a, this.c, []);
                    }
                };
                break;
            case 2: //Parameterized functions are capable of
                //autonomously overriding the context
                let vecR = new Q(4, 3, undefined, [NaN, NaN, NaN]);
                vecR.l();
                if(this.p)
                    Anonymous = class extends L{
                        u(t: number, ...param: number[]): Number|Promise<Number> {
                            this.p(t, param, vecR);
                            return this.e(a, this.c, param);
                        }
                    };
                else {
                    Anonymous = class extends L {
                        u(t:number, ...param: number[]): Number|Promise<Number> {
                            this.p(t, param, vecR);
                            return this.e(a, this.c, []);
                        }
                    };
                }
                break;
            case 3:
                throw new RE("Attempting to create handle for undefined variable");
        }
        this.e = new Anonymous(this, this.e);
        this.o(this.e);
    }

    /**
     * getVisType
     * Get the visualization type of this by testing the output
     * quantity of this. Array typed evalHandles get recursively
     * computed
     */
    o(evalHandle: L){
        let q = evalHandle.u(0, 0,0,0);
        evalHandle.s.length=0;
        if(this.b('t')&&this.environment.v['t'].t==3)
            evalHandle.n = true;
        if(!(q instanceof Q)) {
            evalHandle.v = 'cartesian';
            if(this.h)
                evalHandle.v='cartesianAsync';
        }
        else switch (q.type) {
            case 2:
                evalHandle.v = 'cartesian';
                if(this.h)
                    evalHandle.v='cartesianAsync';
                break;
            case 4:
                if(this.b('u')
                    &&this.environment.v['u'].t == 3){
                    if(this.b('v')&&
                        this.environment.v['v'].t==3) {
                        evalHandle.v = 'parametricSurface';
                        evalHandle.p = (t, param, vecR)=>{
                            //Supply positional arguments into x & y by default,
                            //Parameters clause will then override x & y values
                            //if they occupy the same name space. eg. f(y,x)
                            evalHandle.c[uID][0] = param[0];
                            evalHandle.c[vID][0] = (param.length>1)?param[1]:0;
                            evalHandle.c[tID][0] = t;
                        };
                        evalHandle.p.bind(evalHandle);
                    }else{
                        evalHandle.v = 'parametricCurve';
                        evalHandle.p = (t, param, vecR)=> {
                            //Supply positional arguments into x & y by default,
                            //Parameters clause will then override x & y values
                            //if they occupy the same name space. eg. f(y,x)
                            evalHandle.c[uID][0] = param[0];
                            evalHandle.c[tID][0] = t;
                        }
                    }
                }
                else if(this.b('xyzr')||this.d['>r']!=undefined)
                    evalHandle.v = 'vecField';
                else
                    evalHandle.v = 'vector';
                break;
            case 3:
                evalHandle.v = 'group';
                for(let i = 0; i<q.size; i++){
                    let Anonymous = class extends L{
                        u(t: number, ...param: Number[]): Number|Promise<Number> {
                            let q = evalHandle.u(t, ...param);
                            if(q instanceof Promise){
                                return new Promise((resolve)=>{
                                    (<Promise<Number>> q).then((val)=>resolve((<Q> val).data[i]));
                                });
                            }else
                                return (<Q> evalHandle.u(t, ...param)).data[i];
                        }
                    }
                    let subHandle = new Anonymous(this, this.e);
                    evalHandle.s.push(subHandle);
                    //console.log(evalHandle);
                    this.o(subHandle);
                }
                if(evalHandle.s.length!=0
                    &&evalHandle.s[0].v=='parametricSurface'){
                    evalHandle.p = (t, param, vecR)=>{
                        //Supply positional arguments into x & y by default,
                        //Parameters clause will then override x & y values
                        //if they occupy the same name space. eg. f(y,x)
                        evalHandle.c[uID][0] = param[0];
                        evalHandle.c[vID][0] = (param.length>1)?param[1]:0;
                        evalHandle.c[tID][0] = t;
                    };
                    evalHandle.p.bind(evalHandle);
                }
                break;
        }
        //This is a deep traversal of the evaluation tree, invoked each time eval handle is created
        for(let key in this.q){
            let dependant = this.q[key];
            dependant.o(dependant.e);
        }
        evalHandle.d();
    }

    /**
     * containsVariables
     * Checks if the dependencies of this contains the specified keys
     * @private
     */
    private b(keys: string): boolean{
        let r = false;
        for(let c of keys){
            if(this.d[c]!=undefined)
                return true;
        }
        for(let key in this.d) {
            let dependent = this.d[key];
            if (dependent.b(keys))
                return true;
        }
        return false;
    }
    /**
     * getAlgebraics
     * Creates a list of local algebraic references
     */
    j(): number[][]{
        let algebraics:number[][] = [];
        for(let reference of this.l){
            if(reference[0]==3)
                algebraics.push(<number[]>reference);
        }
        return algebraics;
    }
    //removeDependencies
    rp(){
        for(let key in this.d){
            let object = this.d[key];
            delete object.q[this.n];
            delete this.fa[key];
            delete this.d[key];
        }
    }

    /**
     * pulseDependants
     * After (re)definition, pulse dependents should be called
     * to inform the dependents of this about the changed internal states.
     *
     * When internal states of this are unchanged, pulseDependents
     * should be idempotent.
     */
    ps(){
        for(let key in this.q){
            let dependant = this.q[key];
            dependant.k(this.n);
        }
    }

    /**
     * configureReference
     * Configures the locally referenced variable based on its type,
     * by updating the local cache structures such as the reference list.
     * The specified variable is assumed to exist in the dependency table by
     * the time of this call.
     *
     * Idempotent.
     *
     * @param varName the name of the locally referenced variable.
     */
    k(varName: string){
        let reference = this.l[this.m[varName]];
        let depVar = this.d[varName];
        if(depVar==undefined)
            return;
        let accessStyle = this.fa[varName];
        //Information access style, style 1 and style 2 are equivalent for local Algebraics,
        //except style 2 is slower but permits parameter as multiplicative clause
        reference[0] = depVar.t;
        switch (reference[0]) {
            case 1:
                let quantity = depVar.v(this.r,undefined,[]);
                if(quantity instanceof Q)
                   quantity.l();
                reference[1] = <Q> quantity;
                if(accessStyle){
                    reference[2] = (a:Arithmetics,c:Number[][],p: Number[])=>{
                        if(p.length===0)
                            return quantity;
                        let b = (p.length === 1)? p[0]: a.rc.getQuantity(4, p.length);
                        if(p.length>1)
                            for(let i = 0; i<(<Q>b).size; i++){
                                (<Q>b).data[i] = p[i];
                            }
                        return a.invisDot(<Q> quantity, b);
                    }
                }
                break;
            case 2:
                if(depVar.p||!accessStyle)
                    reference[1] = depVar.v;
                else
                    reference[1] = (a:Arithmetics,c:Number[][],p: Number[])=>{//Special dealing with func$ type
                        return a.invisDot(<Q> depVar.v(a,c,[]), (p.length!=0)?p[0]:1);
                    }
                break;
            case 3:
                reference[1] = contextID(depVar.n);
                reference[2] = 0;
                if(accessStyle){
                    reference[3] = (a:Arithmetics,c:Number[][],p: Number[])=>{
                        let r = c[<number>reference[1]][<number>reference[2]];
                        if(p.length===0)
                            return r;
                        let b = (p.length === 1)? p[0]: a.rc.getQuantity(4, p.length);
                        if(p.length > 1)
                            for(let i = 0; i<(<Q>b).size; i++){
                                (<Q>b).data[i] = p[i];
                            }
                        return a.invisDot(r, b);
                    }
                }
                break;
        }
    }
}

export {B, S, RE, L, Q};