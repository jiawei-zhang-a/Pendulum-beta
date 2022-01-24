import {SymNode} from "./parser";
import {Pendulum} from "./pendulum";
import {stat} from "fs";

const aAscii = 'a'.charCodeAt(0);
const contextID = function(letter: string){
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
        if(this.isEquation(statement)&&label.type=='$'||label.type=='$func'
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
        // Explicit definition. Left hand side is a singleton of a variable
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
                return 'Math.'+node.content;
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
        if(operator == 'invisdot' || operator == 'dot')
            return 'a.mul';
        if(operator == 'frac')
            return 'a.div';
        if(operator == 'neg')
            return '-';
        if(operator == 'ln')
            return 'Math.log';
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

class Arithmetics {
     
    static add(a:number, b:number): number {
        return a + b;
    }

    static sub(a:number, b:number): number {
        return a - b;
    }

    static mul(a:number, b:number): number {
        return a * b;
    }

    static div(a:number, b:number): number {
        return a / b;
    }

    static pow(a:number, b:number): number {
        return a ** b;
    }

    static sum(v:Array<number>): number {
        let summed = 0;
        for (let i = 0; i < v.length; i++)
            summed += v[i];
        return summed
    }

    static pairMult(v:Array<number>, w:Array<number>): Array<number> {
        let prod = new Array<number>(v.length);
        for (let i = 0; i < prod.length; i++)
            prod[i] = v[i] * w[i];
        return prod
    }

    static dot(v:Array<number>, w:Array<number>): number {
        return Arithmetics.sum(Arithmetics.pairMult(v, w));       
    }

    /**
     * Cross product for three-element vectors
     * @param u first vector
     * @param v second vector
     * @param holder passed in as a container for the computation result to avoid
     *  repeated instantiation of arrays, creates a new array of length 3 by default
     */
    static cross(u: number[], v: number[], holder: number[] = new Array(3)):number[]{
        if(u.length<3||v.length<3)
            throw new ArithmeticError("Vector dimensions less than three");
        let [a,b,c] = u;
        let [x,y,z] = v;
        holder[0] = b*z-c*y;
        holder[1] = c*x-a*z;
        holder[2] = a*y-b*x;
        return holder;
    }

    /**
     * Cross prodcut for two element vectors, returns the area as a number
     * @param u first vector
     * @param v second vector
     */
    static twoCross(u: number[], v: number[]) {
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
    evaluate: (a:Arithmetics, c:number[][], p:number[])=>number;
    context: number[][];
    public constructor(target: Variable) {
        this.target = target;
        this.evaluate = target.evaluate;
        this.context = new Array(26);
        for(let i = 0; i<26; i++){
            this.context[i] = [];
        }
    }

    /**
     *
     * @param param sparse array of ID-based parameters
     */
    abstract compute(...param: number[]): number;
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
    referenceList:(number|Function)[][];
    /**
     * A mapping from local variable names to the index of that
     * local variable inside the reference list
     */
    rlMapping: { [varLabel: string]: number };
    /**
     * A mapping from reference list indicies
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
     * Wraps around evaluate to create local field accessibility. Takes parameters
     * a: Arithmetics, c: context, p: parameters
     *
     * Initialized to default value access
     */
    evaluate: (a:Arithmetics, c:number[][], p:number[])=>number
        = (a:Arithmetics, c:number[][], p: number[])=>c[this.contextID][0];
    get = (rlID:number, context: number[][])=>{
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
    }

    setPiScript(piScript:string){
        this.piScript = piScript;
        //a is the Arithmetics library, p contains the parameters,
        // and c is the context matrix
        this.compute = new Function('a', 'c', 'p', 'pm', 'get', piScript);
        let compute = this.compute;
        let parameterMapping = this.parameterMapping;
        let get = this.get.bind(this);
        this.evaluate = function(Arithmetics: Object, context: number[][], parameters: number[]){
            return compute(Arithmetics, context, parameters, parameterMapping, get)
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
        pendulum.updateGraph(this.name, this.evalHandle.compute.bind(this.evalHandle));
    }
    /**
     * Instantiates a new evaluation handle for the variable. The type
     * of the evaluation handle varies depending on the number of local
     * algebraics.
     */
    createEvalHandle(){
        let Anonymous;
        switch (this.type){
            case 1:
                Anonymous = class extends Evaluable{
                    compute(...param: number[]): number {
                        return this.evaluate(Arithmetics, this.context, []);
                    }
                };
                break;
            case 2: //Parameterized functions are capable of
                //autonomously overriding the context
                if(this.parameterized)
                    Anonymous = class extends Evaluable{
                        compute(...param: number[]): number {
                            return this.evaluate(Arithmetics, this.context, param);
                        }
                    };
                else {
                    let xID = contextID('x');
                    let yID = contextID('y');
                    Anonymous = class extends Evaluable {
                        compute(...param: number[]): number {
                            this.context[xID][0] = param[0];
                            this.context[yID][0] = (param.length>1)?param[1]:0;
                            return this.evaluate(Arithmetics, this.context, []);
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
                reference[1] = depVar.evaluate(Arithmetics,[],[]);
                break;
            case 2:
                if(depVar.parameterized)
                    reference[1] = depVar.evaluate;
                else
                    reference[1] = (a:Object,c:number[][],p: number[])=>{//Special dealing with func$ type
                        return depVar.evaluate(a,c,[])*((p.length!=0)?p[0]:1);
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