let operators:{[key:string]:Function} = {
    cos: Math.cos,
    dot: (a:number,b:number)=>{
        return a*b;
    },
    plus: (a:number, b:number)=>a+b
}
let context:number[] = Array(26);
context[24] = 12.25;

function construct(statementTree: SymNode){
    let opr:Function;
    let subRoutines:Function[] = [];
    let routine:Function;
    switch(statementTree.type){
        case 'operator':
            opr = operators[statementTree.symbol];
            for(let i = 0; i < statementTree.children.length; i++)
                subRoutines[i] = construct(statementTree.children[i]);
            if(subRoutines.length==1)
                routine = ()=>{
                    return opr(subRoutines[0]());
                }
            if(subRoutines.length==2)
                routine = ()=>{
                    return opr(subRoutines[0](), subRoutines[1]());
                }
            if(subRoutines.length==3)
                routine = ()=>{
                    return opr(subRoutines[0](), subRoutines[1](), subRoutines[2]());
                }
            break;
        case '#': routine = ()=>statementTree.symbol;
            break;
        case '$': routine = ()=>context[24];
            break;
    }
    return routine;
}

class SymNode{
    children:SymNode[] = [];
    symbol: string|number;
    type: string;
    toString(){
        let childStrings = "";
        if(this.type == "operator") {
            for(let i = 0; i<this.children.length; i++){
                childStrings+=this.children[i].toString();
                if(i!=this.children.length-1)
                    childStrings+=',';
            }
            return this.symbol+"{"+childStrings+"}";
        }
        else{
            return this.symbol;
        }
    }
    constructor(symbol: string|number, type = 'operator') {
        this.symbol=symbol;
        this.type = type;
    }
}

let root = new SymNode("dot");
let co = new SymNode("cos");
let num15 = new SymNode(15, '#');
let num25 = new SymNode(25, '#');
let plus = new SymNode("plus");
let x = new SymNode("x",'$');
root.children[0] = num15;
root.children[1] = plus;
plus.children[0] = co;
plus.children[1] = num25;
co.children[0] = x;
console.log(root);
console.log(root.toString());

let routine = construct(root)
let f = eval('()=>(Math.cos(context[24])+25)*15');
let g = Function('context', 'operators','return operators.dot(Math.cos(operators.plus(context[24],25)),15)');

context[24] = 12.25;
console.time('1000 runs');
for(let i = 0; i<1000; i++)
    context[24]=routine();
console.timeEnd('1000 runs');

context[24] = 12.25;
console.time('10000 runs');
for(let i = 0; i<10000; i++)
    context[24]=routine();
console.timeEnd('10000 runs');

context[24] = 12.25;
console.time('360000 runs Function');
for(let i = 0; i<3600000; i++)
    context[24]=g(context,operators);
console.timeEnd('360000 runs Function');

context[24] = 12.25;
console.time('360000 runs hard code');
for(let i = 0; i<3600000; i++)
    context[24]=(Math.cos(context[24])+25)*15;
console.timeEnd('360000 runs hard code');

// context[24] = 12.25;
// console.time('360000 runs functional');
// for(let i = 0; i<3600000; i++)
//     context[24]=routine();
// console.timeEnd('360000 runs functional');

context[24] = 12.25;
console.time('360000 runs construct');
for(let i = 0; i<3600000; i++)
    context[24]=routine();
console.timeEnd('360000 runs construct');


