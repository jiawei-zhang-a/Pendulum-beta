import {SymNode} from "./parser";

class Core {

    environment: Environment;

    /**
     * Interpret the statement tree as native data representations.
     * @param label
     * @param statementTree
     */
    readDefinition(label: string, statement: SymNode) {
        let newVar:Variable;

        // For redefinition, erase the previous dependencies.
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

        // First top-down traversal to generate variables and establish dependency.
        let leaves:Array<SymNode> = statement.getLeaves();
        for (let leaf of leaves) {
            let depVarLabel = leaf.content;
            let reference:number[];
            let rlIndex;
            if ((rlIndex = newVar.rlMapping[depVarLabel]) == undefined) {
                reference = [];
                newVar.rlMapping[depVarLabel] = newVar.referenceList.length;
                newVar.inverseRlMapping[newVar.referenceList.length] = depVarLabel;
                newVar.referenceList.push(reference);
            }
            else {
                reference = newVar.referenceList[rlIndex];
            }
            // Consider only symbols representing functions or algebraics.
            if (leaf.type == 'func$' || leaf.type == '$') {
                let depVar = this.environment.variables[depVarLabel];

                // Build dependency on existing variable in environment.
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

class Variable {

    /**
     * String identifier of variable.
     */
    public name:string;
    /**
     * Specifies the tentative type of this variable
     * 1: algebraic, 
     * 2: Function,
     * 3, constant
     */
    public type: number = 1;

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
    constructor(name:string) {
        this.name = name;
        this.referenceList = [];
        this.dependants = [];
        this.dependencies = [];
    }

    evaluation(context: number[][]): number{
        
        return 0;
    };
}

export {Variable};