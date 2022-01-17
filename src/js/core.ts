import {SymNode} from "./parser";

const aAscii = 'a'.charCodeAt(0);
const alphabet = function(letter: string){
    let index = aAscii-letter.charCodeAt(0);
    if(index<0||index>=26)
        return -1;
    return index;
}

class Core {

    environment: Environment = new Environment();

    /**
     * Methods for resolving types of inputted statements (in string) to native representations.
     */

    public ResolutionError = class extends Error {
        constructor(message: string) {
            super(message)
        }
    };

    /**
     * Resolves the equation by assigning it the proper label
     * @param label the overriding string for label supplied by the user
     * @param statement
     * @return parseMessage the message constant that prompts the UI response
     */
    resolveEquation(label: string, statement: SymNode):number {
        console.log("label: "+label);
        console.log(statement);
        // Check if an equation is given.
        if (statement.content != 'equal')
            throw new this.ResolutionError("Equation expected!");
        try{//Check for expression completeness
            statement.getLeaves();
        }catch (e) {
            if(e instanceof ReferenceError){
                throw new this.ResolutionError("Incomplete expression");
            }else
                throw e;
        }
        // Explicit definition. Left hand side is the first child.
        let explicit: boolean = statement.children[0].type == '$' || statement.children[0].type == 'func$';
        let variable:Variable;
        if (explicit)
            variable = this.readExplicitDefinition(label, statement.children[1])
        else
            variable = this.readExplicitDefinition(label, statement);
        //Below are obsolete code for implicit label guessing
            /*// If a single variable name is undefined, use the current statement for its implicit definition.
            let undefinedCount = 0;
            let algebraicCount = 0;
            // Implicit variable.
            let impVarName: string;
            let algVarName: string;
            for (let leafStr in leaves) {
                let variable = this.environment.variables[leafStr]
                if (variable == undefined) {
                    undefinedCount++;
                    impVarName = leafStr;
                }
                // Also allow definition of an existing algebraic variable.
                else if (variable.type == 3) {
                    algebraicCount++;
                    algVarName = leafStr;
                }
            }
            if (undefinedCount == 1)
                this.readImplicitDefinition(impVarName, statement);
            else if (undefinedCount == 0 && algebraicCount == 1)
                this.readImplicitDefinition(algVarName, statement);*/
        variable.pulseDependents();
        variable.createEvalHandle();
        return 0;
    }

    /**
     * Interpret the statement tree as native data representations.
     * @param label Given name of variable whose value is defined by the statement tree.
     * @param statement Tree representation of the string definition of 'label'.
     */
    readExplicitDefinition(label: string, statement: SymNode): Variable {
        let newVar:Variable;

        // For redefinition, erase the previous dependencies, retain the dependants.
        if(this.environment.variables[label] != undefined) {
            newVar = this.environment.variables[label];
            newVar.referenceList.length = 0;
            newVar.removeDependencies();
            newVar.rlMapping = {};
            newVar.inverseRlMapping = {};
        } else {
            newVar = new Variable(label);
        }

        /*
            First top-down traversal to generate variables and establish dependencies.
         */
        let leaves: {[varName: string]: SymNode} = statement.getLeaves();

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
            // Initialize rl cache if needed.
            if ((rlIndex = newVar.rlMapping[depVarLabel]) == undefined) {
                reference = [];
                reference[0] = depVar.type;
                newVar.rlMapping[depVarLabel] = newVar.referenceList.length;
                newVar.inverseRlMapping[newVar.referenceList.length] = depVarLabel;
                newVar.referenceList.push(reference);
                depVar.configureReference(depVarLabel);
                console.log(newVar.rlMapping);
            }
        }
        //Set type of new var away from constant if it has dependency. As the
        //new variable is reasonably defined by this time, it shouldn't be algebraic
        newVar.type = (Object.keys(newVar.dependencies).length==0)? 2: 1;
        newVar.setPiScript("return "+this.parseTree(statement, newVar));
        console.log("piScript: "+newVar.piScript);
        return newVar;
    }

    readImplicitDefinition(label: string, expression: SymNode):Variable {
        return undefined;
    }

    parseTree(node: SymNode, variable: Variable):string {
        switch(node.type){
            case '$':
                let nodeLabel = node.content;
                return "get(rl["+variable.rlMapping[nodeLabel]+"])";
            case '#':
                return node.content;
            case 'constant':
                return 'Math.'+node.content;
            case 'operator':
            case 'function':
                let concatenated = "";
                for(let subTree of node.children){
                    concatenated+=this.parseTree(subTree, variable)+",";
                }
                if(node.type == 'operator'){
                    return this.convertAlias(node.content)
                        +"("+ concatenated.substring(0, concatenated.length-1) +")";
                }else{
                    return node.content+".evaluate(a, c"
                        +"["+ concatenated.substring(0, concatenated.length-1) +"]"+")";
                }
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
        if(operator == 'neg')
            return '-'
        return 'a.'+operator;
    }
}

class Environment {
    variables: {[name: string]: Variable} = {};
}


class ArithmeticError extends Error { }

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
    context: number[][];
    public constructor() {
        this.context = new Array(26).fill(Array(1));
    }
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
    referenceList:number[][];
    /**
     * A mapping from local variable names to the index of that
     * local variable inside the reference list
     */
    rlMapping: { [varLabel: string]: number };
    /**
     * A mapping from reference list indicies
     */
    inverseRlMapping: { [rlIndex: number]: string };
    protected evaluate: Function;
    protected compute: Function;

    /**
     * Default constructors with no intialization.
     */
    public constructor(name:string) {
        this.name = name;
        this.rlMapping = {};
        this.referenceList = [];
        this.inverseRlMapping = {};
        this.dependants = {};
        this.dependencies = {};
    }

    setPiScript(piScript:string){
        this.piScript = piScript;
        //a is the Arithmetics library, p contains the parameters,
        // and c is the context matrix
        this.evaluate = new Function('a', 'c', 'p', piScript);
    }

    /**
     * Instantiates a new evaluation handle for the variable. The type
     * of the evaluation handle varies depending on the number of local
     * algebraics
     */
    createEvalHandle(){

    }

    removeDependencies(){
        for(let key in this.dependencies){
            let object = this.dependencies[key];
            delete object.dependants[this.name];
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

    }
}

export {Variable, Core};