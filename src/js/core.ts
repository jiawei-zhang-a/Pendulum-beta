import {SymNode} from "./parser";

const alphabet: {[varLabel: string]: number} = {a:0, b:1, c:2, d:3};

class Core {

    environment: Environment;

    /**
     * Methods for resolving types of inputted statements (in string) to native representations.
     */

    public ResolutionError = class extends Error {
        constructor(message: string) {
            super(message)
        }
    };

    resolveDefinition(statement: SymNode) {
        // Check if an equation is given.
        if (statement.content != 'equal')
            throw new this.ResolutionError("Equation expected!");

        let leaves: Map<string, SymNode> = statement.getLeaves();
        // Explicit definition. Left hand side is the second child.
        let explicit: boolean = statement.children[1].type == '$' || statement.children[1].type == 'func$' &&
            !leaves.has(statement.children[0].content);
        if (explicit)
            this.readExplicitDefinition(statement.children[1].content, statement.children[0])
        else {
            // If a single variable name is undefined, use the current statement for its implicit definition.
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
                else if (variable.type == 'Algebraic') {
                    algebraicCount++;
                    algVarName = leafStr;
                }
            }
            if (undefinedCount == 1)
                this.readImplicitDefinition(impVarName, statement);
            else if (undefinedCount == 0 && algebraicCount == 1)
                this.readImplicitDefinition(algVarName, statement);
        }
    }

    /**
     * Interpret the statement tree as native data representations.
     * @param label Given name of variable whose value is defined by the statement tree.
     * @param statement Tree representation of the string definition of 'label'.
     */
    readExplicitDefinition(label: string, statement: SymNode) {
        let newVar:Variable;

        // For redefinition, erase the previous dependencies, retain the dependants.
        if(this.environment.variables[label] != undefined) {
            newVar = this.environment.variables[label];
            newVar.referenceList.length = 0;
            newVar.dependencies.length = 0;
            newVar.rlMapping = {};
            newVar.inverseRlMapping = {};
        } else {
            newVar = new Variable(label);
        }

        // First top-down traversal to generate variables and establish dependency.
        // let nodes = [... statement.children];
        // while (nodes.length != 0) {
        //     let node = nodes[0];
        //     // Consider only symbols representing functions or algebraics.
        //     if (node.type == '$') {
        //         if (this.environment.variables[node.content]!=undefined) {
        //             // Build dependency on existing variable in environment.
        //             let envVar = this.environment.variables.get(node.token.content);
        //             newVar.dependencies.push(envVar);
        //             envVar.dependants.push(newVar);
        //         } else {
        //             // Assume the new variable is an algebraic.
        //         }
        //     }
        //     // Remove this node.
        //     nodes.shift();
        // }

        /*
            First top-down traversal to generate variables and establish dependencies.
         */
        let leaves:Map<string, SymNode> = statement.getLeaves();

        for (let leaf of leaves.values()) {
            if (leaf.type == '#')
                continue;
            // Build reference list.
            // Name of this dependency.
            let depVarLabel = leaf.content;
            let reference:number[];
            let rlIndex;
            // Add a new dependency.
            if ((rlIndex = newVar.rlMapping[depVarLabel]) == undefined) {
                reference = [];
                newVar.rlMapping[depVarLabel] = newVar.referenceList.length;
                newVar.inverseRlMapping[newVar.referenceList.length] = depVarLabel;
                newVar.referenceList.push(reference);
            }
            else {
                reference = newVar.referenceList[rlIndex];
            }
            // Construct new variables.
            // Consider only symbols representing functions or algebraics.
            if (leaf.type == 'func$' || leaf.type == '$') {
                // Dependency.
                let depVar = this.environment.variables[depVarLabel];
                // Create new variable not present in the current environment.
                if (depVar == undefined) {
                    depVar = new Variable(depVarLabel);
                    this.environment.variables[depVarLabel] = depVar;
                }
                reference[0] = depVar.type;
                newVar.dependencies.push(depVar);
                depVar.dependants.push(newVar);
            }
            newVar.referenceList.push(reference);
        }
        //Set type of new var away from algebraic if it has dependency.
        newVar.type = (newVar.dependencies.length==0)? 3: 2;

        newVar.piscript = this.parseTree(statement, newVar);
    }

    readImplicitDefinition(label: string, expression: SymNode) {

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
                return node.content
                    +"("+ concatenated.substring(0, concatenated.length-1) +")";
        }
        return "";
    }
}

class Environment {
    variables: {[name: string]: Variable};
}


class ArithmeticError extends Error { };

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

interface Evaluable {
    eval(param: number[], context: number[][]): number;
}

class Variable {

    /**
     * String identifier of variable.
     */
    public name:string;

    /**
     * String ID of the type of variable matching the inner class names.
     * 'Algebraic'
     * 'Constant'
     * 'Function'
     * 'ImplicitFunctional'
     */
    public type: string;

    /**
     * Inner class implemented evaluation handle.
     */
    evalHandle: Evaluable;


    /**
     * References of variables that this variable depends for its definition.
     */
    dependencies:Variable[];
    /**
     * References of variables that depend on this variable.
     */
    dependants:Variable[];
    /**
     * Code for evaluating this variable.
     */
    piscript:string = '';

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

    /**
     * Default constructors with no intialization.
     */
    public constructor(name:string) {
        this.name = name;
        this.referenceList = [];
        this.dependants = [];
        this.dependencies = [];
    }

    /**
     * Species of variables whose different modes of evaluation are encapsulated by the following classes.
     */
    public Algebraic = class implements Evaluable {
        /**
         * Reference to outer class.
         */
        ref: Variable;

        constructor(ref: Variable) {
            this.ref = ref;
        }

        public eval(param: number[], context: number[][]): number {
            if (this.ref.name.length > 1)
                return context[alphabet[this.ref.name.substring(0, 1)]][+this.ref.name.substring(1, 2)]
        }
    };

    /**
     * Univariate solvable through an implicit equation.
     */
    public ImplicitFunctional = class implements Evaluable {
        /**
         * Reference to outer class.
         */
        ref: Variable;

        /**
         * Left and right hand sides of the implicit definition as originally given.
         */
        lhs: string;
        rhs: string

        /**
         * Reformed expression for equation whose one side is assumed to be 0.
         */
        eq: string;

        constructor(ref: Variable) {
            this.ref = ref;
        }

        /**
         * TODO:
         * @param param
         * @param context
         */
        public eval(param: number[], context: number[][]): number {
            return 0;
        }
    };

    evaluate(param: number[], context: number[][]): number{
        return this.evalHandle.eval(param, context);
    };
}

export {Variable};