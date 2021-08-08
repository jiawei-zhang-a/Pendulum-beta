import {SymNode} from "./parser";

'./Parser';

class Core{
    environment: Environment;
    readStatement(label: string, statementTree: SymNode){

    }
}

class Environment{
    variables: {[name: string]: Variable};

}

class Variable{
    dependencies:Variable[];
    dependents:Variable[];
    defined:boolean = false;
}

export {Variable};