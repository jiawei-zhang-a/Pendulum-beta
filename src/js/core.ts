import {SymNode} from "./parser";
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

class Core {

    environment: Environment = new Environment();

    /**
     * Methods for resolving types of inputted statements (in string) to native representations.
     */

    /**
     * Deduces the default label for the statement given, if no label can be effectively deduced,
     * returns undefined.
     * @param statement
     */
    guessLabel(statement: SymNode): string{
        if(statement==undefined)
            return undefined;
        //First investigate if an equation is present
        if(!(statement.type == 'operator'&&statement.content == 'equal')){
            return undefined;
        }
        let lhs = statement.children[0];
        let rhs = statement.children[1];
        if(lhs==undefined||rhs==undefined)
            return undefined;
        //Check for singletons
        if((lhs.type=='$'||lhs.type=='func$')){
            if('xyz'.indexOf(lhs.content)!=-1)
                return undefined;
            return lhs.content;
        }
        if(rhs.type=='$'||rhs.type=='func$'){
            if('xyz'.indexOf(lhs.content)!=-1)
                return undefined;
            return rhs.content;
        }
        let leaves;
        try{//Check for expression completeness
            leaves = statement.getLeaves();
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
                 &&(this.environment.variables[key]==undefined
                     ||this.environment.variables[key].type==3))
                 return key;
         }
         return undefined;
    }
    /**
     * Resolves the equation by assigning it the proper label
     * @param label the overriding string for label supplied by the user
     * @param statement
     * @return parseMessage the message constant that prompts the UI response
     */
    resolveEquation(label: SymNode, statement: SymNode):number {
        // Check if an equation is given.
        if(label == undefined){
            throw new ResolutionError("Unable to guess label");
        }
        if(statement == undefined){
            throw new ResolutionError("No definition");
        }
        let leaves;
        try{//Check for expression completeness
            leaves = statement.getLeaves();
        }catch (e) {
            if(e instanceof ReferenceError){
                throw new ResolutionError("Incomplete expression");
            }else
                throw e;
        }
        console.log(label);
        if(this.isEquation(statement)&&label.type=='$'||label.type=='func$'
            &&!this.containsLabel(label.content, leaves))
            throw new ResolutionError("Invalid label override");
        let variable = this.defineEqnVariable(label, statement);
        console.log(variable);
        this.environment.variables[label.content] = variable;
        variable.pulseDependents();
        variable.createEvalHandle();
        return 0;
    }

    /**
     * Tests whether a given statement is an equation
     * @param statement
     */
    isEquation(statement: SymNode){
        return statement.type=='operator'&&statement.content=='=';
    }

    defineEqnVariable(label: SymNode, statement:SymNode):Variable{
        if(!(statement.content=='equal'&&statement.type=='operator'))
            return this.readExplicitDefinition(label.content, label, statement);
        let lhs = statement.children[0];
        let rhs = statement.children[1];
        // Explicit definition. Left-hand side is a singleton of a variable
        if(lhs.type == '$' || lhs.type == 'func$'){
            let rhsLeaves = statement.children[1].getLeaves();
            if(!this.containsLabel(lhs.content, rhsLeaves))
                return this.readExplicitDefinition(label.content, lhs, rhs);
        }
        if(rhs.type == '$' || rhs.type == 'func$'){
            let lhsLeaves = statement.children[0].getLeaves();
            if(!this.containsLabel(rhs.content, lhsLeaves))
                return this.readExplicitDefinition(label.content, rhs, lhs);
        }
        return this.readImplicitDefinition(label, statement);
    }

    /**
     * Checks whether the statement tree contains variables with the
     * specified label, if not returns false
     * @param label
     * @param leaves
     */
    containsLabel(label: string, leaves: {[p: string]: SymNode}){
        for(let key in leaves){
            if(key==label)
                return true;
        }
        return false;
    }

    /**
     * Interpret the statement tree as native data representations.
     * @param label Label specified by the user
     * @param defined Tree representation of the variable that is defined, should be a leaf here.
     * @param definition Tree representation of the definition in terms of an expression
     */
    readExplicitDefinition(label: string, defined: SymNode, definition: SymNode): Variable {
        let newVar:Variable;
        // For redefinition, erase the previous dependencies, retain the dependants.
        if(this.environment.variables[label] != undefined) {
            newVar = this.environment.variables[label];
            newVar.referenceList.length = 0;
            newVar.removeDependencies();
            newVar.rlMapping = {};
            newVar.inverseRlMapping = {};
            newVar.parameterMapping = [];
        } else {
            newVar = new Variable(label);
        }
        newVar.parameterized = defined.type=='func$';
        if(newVar.parameterized){//Initialize parameter mapping for parameterized functions
            for(let index in defined.subClauses){
                let child = defined.subClauses[index];
                if(child.subClauses.length!=0){
                    throw new ResolutionError("Parameterized function variable with nested denominator is invalid");
                }
                newVar.parameterMapping[index] = contextID(child.content);
            }
        }
        /*
            First top-down traversal to generate variables and establish dependencies.
         */
        let leaves: {[varName: string]: SymNode} = definition.getLeaves();

        for (let varName in leaves) {
            let leaf = leaves[varName];
            //Consider only symbols representing functions or algebraics
            if (leaf.type == '#')
                continue;
            // Build reference list.
            // Name of this dependency.
            let depVarLabel = leaf.content;
            let reference:number[];
            let rlIndex;
            // Dependency.
            let depVar = this.environment.variables[depVarLabel];
            // Create dependent variable not present in the current environment.
            if (depVar == undefined) {
                depVar = new Variable(depVarLabel);
                this.environment.variables[depVarLabel] = depVar;
            }
            //Idempotent dependency construction
            newVar.dependencies[depVarLabel]=depVar;
            depVar.dependants[newVar.name] = newVar;
            //Idempotent parameterized access style specification
            if(leaf.type == 'func$')
                newVar.functionAccess[depVarLabel] = true;
            // Initialize rl cache if needed.
            if ((rlIndex = newVar.rlMapping[depVarLabel]) == undefined) {
                reference = [];
                newVar.rlMapping[depVarLabel] = newVar.referenceList.length;
                newVar.inverseRlMapping[newVar.referenceList.length] = depVarLabel;
                newVar.referenceList.push(reference);
                newVar.configureReference(depVarLabel);
            }
        }
        //Set type of new var away from constant if it has dependency. As the
        //new variable is reasonably defined by this time, it shouldn't be algebraic
        newVar.type = (Object.keys(newVar.dependencies).length!=0)? 2: 1;
        let piScript = this.getPiScript(definition, newVar);
        console.log("piScript: \n"+piScript);
        newVar.setPiScript(piScript);
        return newVar;
    }

    readImplicitDefinition(label: SymNode, expression: SymNode):Variable {
        throw new ResolutionError("not yet implemented");
    }

    getPiScript(statement: SymNode, variable: Variable): string{
        let piScript: string = "";
        if(variable.parameterized){//Append parameter override clause
            piScript+=
                "for(let index in pm){\n" +
                " c[pm[index]][0] = p[index];\n" +
                "}\n";
        }
        piScript+="return "+this.parseTree(statement, variable)+';';
        return piScript;
    }

    parseTree(node: SymNode, variable: Variable):string {
        let nodeLabel = node.content;
        let concatenated = "";
        switch(node.type){
            case '$':
                return "get("+variable.rlMapping[nodeLabel]+", c)";
            case '#':
                return node.content;
            case 'constant':
                return 'Math.'+node.content.toUpperCase();
            case 'operator':
            case 'function':
                for(let subTree of node.children){
                    concatenated+=this.parseTree(subTree, variable)+",";
                }
                return this.convertAlias(node.content)
                    +"("+ concatenated.substring(0, concatenated.length-1) +")";
            case 'func$':
                for(let subTree of node.subClauses){
                    concatenated+=this.parseTree(subTree, variable)+",";
                }
                return "get("+variable.rlMapping[nodeLabel]+", c)"+"(a, c, "
                        +"["+ concatenated.substring(0, concatenated.length-1) +"]"+")";

        }
        return "";
    }

    /**
     * Converts from an alias of an operator to its unified name in Arithmetics.
     *
     * @param operator
     */
    convertAlias(operator: string): string{
        if(operator == 'invisdot')
            return 'a.invisDot';
        if(operator == 'frac')
            return 'a.div';
        if(operator == 'ln')
            return 'a.log';
        if(operator == 'cos'||operator == 'sin'||operator=='tan' ||operator == 'sqrt')
            return 'Math.'+operator;
        if(operator == 'cot')
            return '1/Math.tan';
        return 'a.'+operator;
    }
}

class Environment {
    variables: {[name: string]: Variable} = {};
}


class ArithmeticError extends Error { }
class ResolutionError extends Error {
    constructor(message: string) {
        super(message)
    }
}

class Quantity extends Number{
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
    locked: boolean;
    constructor(type: number, rc:RecycleCenter,
                dataContainer: Number[]) {
        super();
        this.type = type;
        this.locked = false;
        this.data = dataContainer;
        this.rc = rc;
    }

    recycle(){
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
}

class RecycleCenter{
    /**
     * Array / vector stack 0
     */
    s0: Quantity[];
    /**
     * Array vector stack 1
     */
    s1: Quantity[][];
    /**
     * Complex variable stack
     */
    sc: Quantity[];
    constructor() {
        this.s0 = [];
        this.s1 = [];
        this.sc = [];
    }
    getQuantity(type: number, dim: number):Quantity{
        if(type == 2){
            if(this.sc.length!=0) {
                return this.sc.pop();
            }
            else{
                return  new Quantity(type, this, [0,0]);
            }
        }
        if(dim<=3){
            if(this.s0.length!=0) {
                let q = this.s0.pop();
                q.type = type;
                return q;
            }
            else{
                return  new Quantity(type, this, new Array(dim).fill(0));
            }
        }
        else {
            let index = this.getLogIndex(dim/3);
            if (this.s1[index].length != 0) {
                let q = this.s1[index].pop();
                q.type = type;
                return q;
            }
            else {
                return new Quantity(type, this, new Array(dim).fill(0));
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
    constructor() {
        this.rc = new RecycleCenter();
    }
    add(a:Number, b:Number): Number {
        if(a instanceof Quantity) {
            if(b instanceof Quantity){
                if(a.type!=b.type||a.size != b.size)
                    throw new ArithmeticError("Incompatible quantity type for addition");
                let dim = a.size;
                let c = this.rc.getQuantity(a.type, dim);
                for(let i = 0; i<dim; i++){
                    c.data[i] = this.add(a.data[i],b.data[i]);
                }
                a.recycle();
                b.recycle();
                return c;

            }else
                throw new ArithmeticError("Incompatible quantity type for addition");
        }else{
            //@ts-ignore
            return a+b;
        }
    }

    sub(a:Number, b:Number): Number {
        if(a instanceof Quantity) {
            if(b instanceof Quantity){
                if(a.type!=b.type||a.size != b.size)
                    throw new ArithmeticError("Incompatible quantity type for subtraction");
                let dim = a.size;
                let c = this.rc.getQuantity(a.type, dim);
                for(let i = 0; i<dim; i++){
                    c.data[i] = this.sub(a.data[i],b.data[i]);
                }
                a.recycle();
                b.recycle();
                return c;
            }else
                throw new ArithmeticError("Incompatible quantity type for addition");
        }else{
            //@ts-ignore
            return a-b;
        }
    }

    invisDot(a:Number, b:Number): Number {
        switch (Arithmetics.getType(b)) {
            case 4:
                if(Arithmetics.getType(a) <=2) {//Field invisDot a vector or matrix
                    let c = this.rc.getQuantity(4, (<Quantity>b).size);
                    for (let i = 0; i < (<Quantity>b).size; i++) {
                        c.data[i] = this.invisDot(a, (<Quantity>b).data[i]);
                    }
                    Arithmetics.recycle(a);
                    Arithmetics.recycle(b);
                    return c;
                }else if(Arithmetics.getType(a) == 3){
                    let c = this.rc.getQuantity(3, (<Quantity>a).size);
                    for (let i = 0; i < (<Quantity> a).size; i++){
                        c.data[i] = this.invisDot((<Quantity> a).data[i], b);
                    }
                    Arithmetics.recycle(a);
                    Arithmetics.recycle(b);
                    return c;
                }
                throw new ArithmeticError("");
            case 3:
                switch (Arithmetics.getType(a)) {
                    case 4:
                        return this.invisDot(b, a);
                    case 3:
                        if((<Quantity>a).size == (<Quantity>b).size){
                            let size = (<Quantity>a).size;
                            let c = this.rc.getQuantity(3, size);
                            for(let i = 0; i < size; i++){
                                //@ts-ignore
                                c.data[i] = this.invisDot(a.data[i], b.data[i]);
                            }
                            Arithmetics.recycle(a);
                            Arithmetics.recycle(b);
                            return c;
                        }else
                            throw new ArithmeticError("Incompatible operand size");
                    case 2:
                    case 1:
                        let size = (<Quantity>b).size;
                        let c = this.rc.getQuantity(3, size);
                        for(let i = 0; i < size; i++)
                            c.data[i] = this.invisDot(a, (<Quantity>b).data[i]);
                        Arithmetics.recycle(b);
                        return c;
                }
                throw new ArithmeticError("this shouldn't be possible to reach");
            case 2:
                if(Arithmetics.getType(a) <=2){
                    return this.multiply(a, b);
                }else
                    return this.invisDot(b, a);
            case 1:
                if(!(a instanceof Quantity))
                    //@ts-ignore here a and b must be instances of Number
                    return a*b;
                else return this.invisDot(b, a);
        }

    }

    dot(a:Number, b:Number): Number {
        if(a instanceof Quantity && b instanceof Quantity)
            if(a.type==4&&b.type==4){
                if(a.size==b.size && a.size>0){
                    let c = this.dot(a.data[0], b.data[0]);
                    for(let i = 1; i < a.size ;i++){
                        c = this.add(c, this.dot(a.data[0], b.data[0]));
                    }
                    Arithmetics.recycle(a);
                    Arithmetics.recycle(b);
                    return c;
                }else
                    throw new ArithmeticError("Cannot dot product vectors of different dimensions");
            }
        return this.invisDot(a, b);
    }


    private static getType(q: Number){
        if(q instanceof Quantity)
            return q.type;
        else
            return 1;
    }

    private static getSize(q: Number){
        if(q instanceof Quantity)
            return q.size;
        else
            return 1;
    }

    private static recycle(q: Number){
        if(q instanceof Quantity)
            q.recycle();
    }
    /**
     * Accepts only real or complex quantities, otherwise return 0
     * @param a real or complex
     * @param b real or complex
     * @private
     */
    private multiply(a: Number, b:Number): Number{
        //Broadcast both quantities to complex numbers
        if(!(a instanceof Quantity)){
            a = this.extend(+a, 2, 2);
        }
        if(!(b instanceof Quantity)){
            b = this.extend(+b, 2, 2);
        }
        let c = this.rc.getQuantity(2, 2);
        if(a instanceof Quantity && b instanceof Quantity
            && a.type == 2 && b.type == 2){
            //@ts-ignore
            c.data[0] = a.data[0]*b.data[0] -a.data[1]*b.data[1];
            //@ts-ignore
            c.data[1] = a.data[0]*b.data[1] +a.data[1]*b.data[0];
            a.recycle();
            b.recycle();
            return c;
        }else
            throw new ArithmeticError("multiply can only act on fields");
    }

    /**
     * Extends a number into a broader quantity
     * @private
     */
    private extend(a: number, targetType: number, targetDim: number): Quantity{
        let q = this.rc.getQuantity(targetType, targetDim);
        for(let i = 0; i<targetDim; i++){
            q.data[i] = 0;
        }
        q.data[0] = a;
        return q;
    }

    cross(a: Number, b: Number): Number{
        if(a instanceof Quantity && b instanceof Quantity) {
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
                    throw new ArithmeticError("Cannot cross product vectors of dimension not equal to 3");
            }
            if(a.type==3&&b.type==3){//Cartesian product
                if(a.size==b.size && a.size==3){
                    let c = this.rc.getQuantity(3, a.size*b.size);
                    for(let i = 0; i<a.size; i++)
                        for(let j = 0; j<b.size; j++){
                            let x = a.data[i];
                            let y = b.data[j];
                            let z = this.rc.getQuantity(4,
                                Arithmetics.getSize(x)+Arithmetics.getSize(y));
                            if(x instanceof Quantity && x.type==4)//Concatenate
                                z.data.push(...x.data);
                            else
                                z.data.push(x);

                            if(y instanceof Quantity && y.type==4)
                                z.data.push(...y.data);
                            else
                                z.data.push(y);
                            Arithmetics.recycle(x);
                            Arithmetics.recycle(y);
                            c.data[i*b.size+j] = z;
                        }
                    a.recycle();
                    b.recycle();
                    return c;
                }
            }
        }
        return this.invisDot(a, b);
    }

    div(a:Number, b:Number): Number {
        if(Arithmetics.getType(b)<=3){
            return this.invisDot(this.invert(b), a);
        }else
            throw new ArithmeticError("Can not divide by vectors");
    }

    /**
     * Takes inverse of a complex or real number
     * @param a
     * @private
     */
    private invert (a: Number): Number{
        if(!(a instanceof Quantity))
            return 1/+a;
        else switch (a.type) {
            case 2:
                let c = this.rc.getQuantity(2, 2);
                let modeSq = (+a.data[0])**2+(+a.data[1])**2;
                //Take conjugate of a and divide
                // by mode squared yields complex inverse
                c.data[0] = +a.data[0]/modeSq;
                c.data[1] = -a.data[1]/modeSq;
                a.recycle();
                return c;
            case 3:
                let d = this.rc.getQuantity(3, a.size);
                for(let i = 0; i< a.size; i++){
                    d.data[i] = this.invert(a.data[i]);
                }
                a.recycle();
                return d;
        }
        throw new ArithmeticError("Invert should only act on real or complex numbers or arrays");
    }

    pow(a:Number, b:Number): Number {
        if(!(a instanceof Quantity)&&!(b instanceof Quantity))
            return (+a)**(+b);
        return 0;
    }

    sum(v:Array<number>): number {
        let summed = 0;
        for (let i = 0; i < v.length; i++)
            summed += v[i];
        return summed
    }

    /**
     * Cross prodcut for two element vectors, returns the area as a number
     * @param u first vector
     * @param v second vector
     */
    twoCross(u: number[], v: number[]) {
        if (u.length < 2 || v.length < 2)
            throw new ArithmeticError("Vector dimensions less than two");
        return u[0]*v[1]-u[1]*v[0];
    }
}

/**
 * A simple interface as an evaluation handle for
 * external access of a variable, carries with itself
 * a context matrix
 */
abstract class Evaluable {
    target: Variable;
    evaluate: (a:Arithmetics, c:Number[][], p:Number[])=>Number;
    context: Number[][];
    public constructor(target: Variable) {
        this.target = target;
        this.evaluate = target.evaluate;
        this.context = new Array(26);
        for(let i = 0; i<26; i++){
            this.context[i] = [];
        }
        for(let i = 26; i<52; i++){
            this.context[i] = [];
        }
    }

    /**
     *
     * @param param sparse array of ID-based parameters
     */
    abstract compute(...param: Number[]): Number;
}

class Variable {

    /**
     * String identifier of variable.
     */
    public name:string;

    /**
     * Indexed ID of the type of variable matching the inner class names.
     * 1. 'Constant'
     * 2. 'Function'
     * 3. 'Algebraic'
     */
    public type: number = 3;
    public anonymous: boolean = false;

    /**
     * Inner class implemented evaluation handle.
     */
    evalHandle: Evaluable;
    /**
     * Each variable should store an arithmetics instance
     */
    arithmetics: Arithmetics;
    /**
     * References of variables that this variable depends for its definition.
     * Actively managed.
     */
    dependencies:{[key: string]: Variable};
    /**
     * Indicates whether a dependent variable is accessed function style
     * (func$) typed token
     */
    functionAccess:{[key: string]: boolean};
    /**
     * References of variables that depend on this variable.
     * Passively managed.
     */
    dependants:{[key: string]: Variable};
    /**
     * Code for evaluating this variable.
     */
    piScript:string = '';

    /**
     * Contains references of structure [type, parameter1, parameter2, ...]
     */
    referenceList:(Number|Function)[][];
    /**
     * A mapping from local variable names to the index of that
     * local variable inside the reference list
     */
    rlMapping: { [varLabel: string]: number };
    /**
     * A mapping from reference list indices
     */
    inverseRlMapping: { [rlIndex: number]: string };
    /**
     * Indicates whether the variable takes parameters during evaluation
     */
    parameterized = false;
    /**
     * parameter position -> contextID, generated upon instantiation
     */
    parameterMapping: number[] = [];
    /**
     * Core function generated based on piScript. Takes parameters
     * a: Arithmetics, c: context, p: parameters, pm: parameter mapping,
     * get: reference access
     *
     * @protected
     */
    protected compute: Function;
    /**
     * Wraps around compute to create local field accessibility. Takes parameters
     * a: Arithmetics, c: context, p: parameters
     *
     * Initialized to default value access
     */
    evaluate: (a:Arithmetics, c:Number[][], p:Number[])=>Number
        = (a:Arithmetics, c:Number[][], p: Number[])=>c[this.contextID][0];
    get = (rlID:number, context: Number[][])=>{
        let reference = this.referenceList[rlID];
        switch (reference[0]){
            case 1: return reference[1];
            case 2: return reference[1];
            case 3: return context[<number>reference[1]][<number>reference[2]];
        }
        return undefined;
    };
    /**
     * Context ID for default value access
     */
    contextID: number;
    /**
     * Default constructors with no initialization.
     */
    public constructor(name:string) {
        this.name = name;
        this.contextID = contextID(name);
        this.rlMapping = {};
        this.referenceList = [];
        this.inverseRlMapping = {};
        this.dependants = {};
        this.dependencies = {};
        this.functionAccess = {};
        this.arithmetics = new Arithmetics();
    }

    setPiScript(piScript:string){
        this.piScript = piScript;
        //a is the Arithmetics library, p contains the parameters,
        // and c is the context matrix
        this.compute = new Function('a', 'c', 'p', 'pm', 'get', piScript);
        let compute = this.compute;
        let parameterMapping = this.parameterMapping;
        let get = this.get.bind(this);
        this.evaluate = function(a: Arithmetics, context: Number[][], parameters: Number[]){
            return compute(a, context, parameters, parameterMapping, get);
        };
    }

    /**
     * Determines how the evaluation handle should be used
     */
    visType = 'none';

    /**
     * Configures the type of visualizations that should be applied to this,
     * based on the name of the dependent variable, the type of this, and so on
     */
    loadVisualization(pendulum: Pendulum){
        let algebraics = this.getAlgebraics();
        return pendulum.updateGraph(this.name,
            (x,y)=>this.evalHandle.compute(Number(x),Number(y)).valueOf());
    }
    /**
     * Instantiates a new evaluation handle for the variable. The type
     * of the evaluation handle varies depending on the number of local
     * algebraics.
     */
    createEvalHandle(){
        let Anonymous;
        let a = this.arithmetics;
        switch (this.type){
            case 1:
                Anonymous = class extends Evaluable{
                    compute(...param: number[]): Number {
                        return this.evaluate(a, this.context, []);
                    }
                };
                break;
            case 2: //Parameterized functions are capable of
                //autonomously overriding the context
                let xID = contextID('x');
                let yID = contextID('y');
                if(this.parameterized)
                    Anonymous = class extends Evaluable{
                        compute(...param: number[]): Number {
                            //Supply positional arguments into x & y by default,
                            //Parameters clause will then override x & y values
                            //if they occupy the same name space. eg. f(y,x)
                            this.context[xID][0] = param[0];
                            this.context[yID][0] = (param.length>1)?param[1]:0;
                            return this.evaluate(a, this.context, param);
                        }
                    };
                else {
                    Anonymous = class extends Evaluable {
                        compute(...param: number[]): Number {
                            this.context[xID][0] = param[0];
                            this.context[yID][0] = (param.length>1)?param[1]:0;
                            return this.evaluate(a, this.context, []);
                        }
                    };
                }
                break;
            case 3:
                throw new ResolutionError("Attempting to create handle for undefined variable");
        }
        this.evalHandle = new Anonymous(this);
    }

    /**
     * Creates a list of local algebraic references
     */
    getAlgebraics(): number[][]{
        let algebraics:number[][] = [];
        for(let reference of this.referenceList){
            if(reference[0]==3)
                algebraics.push(<number[]>reference);
        }
        return algebraics;
    }

    removeDependencies(){
        for(let key in this.dependencies){
            let object = this.dependencies[key];
            delete object.dependants[this.name];
            delete this.functionAccess[key];
            delete this.dependencies[key];
        }
    }

    /**
     * After (re)definition, pulse dependents should be called
     * to inform the dependents of this about the changed internal states.
     *
     * When internal states of this are unchanged, pulseDependents
     * should be idempotent.
     */
    pulseDependents(){
        for(let key in this.dependants){
            let dependant = this.dependants[key];
            dependant.configureReference(this.name);
        }
    }

    /**
     * Configures the locally referenced variable based on its type,
     * by updating the local cache structures such as the reference list.
     * The specified variable is assumed to exist in the dependency table by
     * the time of this call.
     *
     * Idempotent.
     *
     * @param varName the name of the locally referenced variable.
     */
    configureReference(varName: string){
        let reference = this.referenceList[this.rlMapping[varName]];
        let depVar = this.dependencies[varName];
        let accessStyle = this.functionAccess[varName];
        //Information access style, style 1 and style 2 are equivalent for local Algebraics,
        //except style 2 is slower but permits parameter as multiplicative clause
        reference[0] = (accessStyle!=undefined)?2:depVar.type;
        switch (reference[0]) {
            case 1:
                reference[1] = depVar.evaluate(this.arithmetics,[],[]);
                break;
            case 2:
                if(depVar.parameterized)
                    reference[1] = depVar.evaluate;
                else
                    reference[1] = (a:Arithmetics,c:Number[][],p: Number[])=>{//Special dealing with func$ type
                        return a.invisDot(depVar.evaluate(a,c,[]), (p.length!=0)?p[0]:1);
                    }
                break;
            case 3:
                reference[1] = contextID(depVar.name);
                reference[2] = 0;
                break;
        }
    }
}

export {Variable, Core, ResolutionError};