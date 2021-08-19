import {SymNode} from "./parser";

class Core {
    environment: Environment;

    /**
     * Interpret the statement tree as native data representations.
     * @param label
     * @param statementTree
     */
    readStatement(label: string, statement: SymNode) {
        let newVar = new Function(statement.token.content);

        // First top-down traversal to generate variables and establish dependency.
        let nodes = [... statement.children];
        while (nodes.length != 0) {
            let node = nodes[0];
            // Consider only symbols representing functions or algebraics.
            if (node.type == '$') {
                if (this.environment.variables.has(node.token.content)) {
                    // Build dependency on existing variable in environment.
                    let envVar = this.environment.variables.get(node.token.content);
                    newVar.dependencies.push(envVar);
                    envVar.dependants.push(newVar);
                } else {
                    // Assume the new variable is an algebraic.
                }
            }
            // Remove this node.
            nodes.shift();
        }


        // Identify the algebraics from the leaves.
        let leaves:Array<SymNode> = statement.getLeaves();
        for (let leaf of leaves) {
            if (leaf.type == 'func$' || leaf.type == '$') {
                let alg = new Variable();
                newVar.dependencies.push(alg);
                // newVar.referenceList.push([leaf.type]);
            }
        }        
    }

    parseTree(node: SymNode, variable: Variable):string {
        switch(node.type){
            case '$':
                return "get(rl[])";
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

abstract class Variable {

    /**
     * String identifier of variable.
     */
    public name:string;
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
    evalStr:string = '';

    /**
     * Contains references of structure [type, parameter1, parameter2, ...]
     */
    referenceList:[number[]];
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
    protected constructor(name:string) {
        this.name = name;
    }

    abstract eval(): number;
}

class Constant extends Variable {

    /**
     * Constant value of the constant.
     */
    readonly val: number;

    constructor(name:string, val:number) {
        super(name);
        this.name = name;
        this.val = val;
        this.evalStr = val.toString();
    }

    eval(): number{
        return this.val;
    }
}

class Algebraic extends Variable {

    constructor(name:string) {
        super(name);
    }

    // TODO: unimplemented.
    eval(): number {
        return 0;
    }
}

class Function extends Variable {

    constructor(name:string) {
        super(name)
    }

    // TODO: unimplemented.
    eval(): number {
        return 0;
    }
}

export {Variable};