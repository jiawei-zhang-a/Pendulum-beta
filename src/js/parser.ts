const addInvisibleDots = true;
const convertE = true;
const convertI = true;
//Parsing constants
const zerocode = '0'.charCodeAt(0);
const ninecode = '9'.charCodeAt(0);
const slashcode = '\\'.charCodeAt(0);
const dotcode = '.'.charCodeAt(0);
const isSymbol = (code = 0) => {
    return (code <= 63 && code >= 58) || (code <= 47 && code >= 33)
        || (code <= 126 && code >= 123) || (code <= 96 && code >= 91) || code === ' '.charCodeAt(0);
};
const acode = 'a'.charCodeAt(0);
const zcode = 'z'.charCodeAt(0);
const Acode = 'A'.charCodeAt(0);
const Zcode = 'Z'.charCodeAt(0);

/**
 * Check and returns the type of the given character
 * @param {string} c The character
 * @returns {string} type can be one of digit, symbol, letter or '.'
 */
function getCharType(c:string) {
    let code = c.charCodeAt(0);
    if(convertI&&c=='i'){
        return "symbol";
    }
    if(convertE&&c=='e'){
        return "symbol";
    }
    if (code <= ninecode && code >= zerocode)
        return "digit";
    else if (c === '.')
        return ".";
    else if (c===' ')
        return "space";
    else if ((code <= zcode && code >= acode) || (code <= Zcode && code >= Acode))
        return "letter";
    else
        return "symbol";
}

type MStruct = {[key:string]:MStruct | [string, string, number]};
// Item structure: [name, type, sub-clause count]
let macros:MStruct = {
    'i': ['i', 'constant', 0],
    'e': ['e', 'constant', 0],
    '{': ['{', 'openstruct', 0],
    '}': ['}', 'closestruct', 0],
    '(': ['(', 'openstruct', 0],
    ')': ['(', 'closestruct', 0],
    ',': [',', 'optstruct', 0],
    '$': ['$', 'closestruct', 0],
    '+': ['add', 'operator', 0],
    '-': ['sub', 'operator', 0],
    '*': ['mul', 'operator', 0],
    '/': ['div', 'operator', 0],
    '^': ['pow', 'operator', 0],
    '=': ['equal', 'operator', 0],
    '!': ['factorial', 'operator', 0],
    '\\': {
        ' ': ['space', 'structure', 0],
        'c': {'d': {'o': {'t': ['dot', 'operator', 0],
                }
            },
            'o': {
                's': ['cos', 'function', 1],
                't': ['cot', 'function', 1]
            },
        },
        'd': {
            'i': {
                'v': ['div', 'operator', 0]
            }
        },
        'f': {
            'r': {
                'a': {
                    'c': ['frac', 'function', 0]
                }
            }
        },
        /*
         *  Integration takes four subclauses, the first and second are the lower and upper bounds, the third is the integrand,
         *  and the last is the integration variable d$.
         */
        'i':{
            'n':{
                't': ['integrate', '$', 4]
            }
        },
        'l': {
            'n': ["ln", 'function', 0],
            'e': {
                'f': {
                    't': {
                        '(': ['(', 'openstruct', 0],
                        '|': ['|', 'openstruct', 1],
                        '{': ['{', 'openstruct', 0],
                        '[': ['[', 'openstruct', 0],
                    }
                }
            }
        },
        'm': {
            'a': {
                't': {
                    'h': {
                        'b': {
                            'f':{
                                '{':{
                                    'd':{
                                        '}':['diff', 'closestruct', 1], //especially used for defining differential operator d
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        'p': {
            'i': ['pi', 'constant', 0],
            'r': {
                'o': {
                    'd': ['prod', 'operator', 2]
                }
            }
        },
        'r': {
            'i': {
                'g': {
                    'h': {
                        't': {
                            ')': [')', 'closestruct', 0],
                            '|': ['|', 'closestruct', 0],
                            '}': ['}', 'closestruct', 0],
                            ']': [']', 'closestruct', 0],
                        }
                    }
                }
            }
        },
        's': {
            'i': {
                'n': ['sin', 'function', 1]
            },
            'u': {
                'm': ['sum', 'operator', 2]
            },
            'q': {
                'r': {
                    't': ['sqrt', 'function', 1]
                }
            }
        },
        't': {
            'a': {
                'n': ['tan', 'function', 1]
            },
            'i': {'m': {'e': {'s': ['cross', 'operator', 0]}}},
        },
        'v': {
            'e': {
                'c': ['vector', '$', 1]
            }
        },
    }
};

//T
class T{
    //type
    //Possible types include: function, operator, openstruct, closestruct, #, $
    t: string = 'none';
    //content
    c: string;
    //start
    //Indices for the token in the list
    s: number=0;
    //end
    //One plus the index of the last character of this token in the tex string
    e: number=0;
    //clauseCount
    cc = 0;
    //subClauses
    sc: T[][];
    //parentClause
    pc: T[];
    //For temporary storage of SymNodes in vector parsing
    //subNodes
    sn: SN[];
    //TeX
    X: string="";

    /**
     * readFrom
     * Parses the content of the tex string starting at specified positions to
     * get this token's contents
     * @param start the position at which this token starts
     * @param tex the entire tex string from the input
     * @param previousType type of the previous token
     * @return parseConstant indicating if there are any errors in the syntax during parsing,
     *                       0: parse successfully terminated, 1: unrecognized character
     */
    rf(tex:string, start: number, previousType:string):number{
        this.s = start;
        let state = 'init';
        let macro:MStruct|Array<number|string> = macros;
        let i = start;
        let terminating = false;
        let dotCount = 0;
        while(!terminating){
            this.e = i;
            let char = tex[i];
            if(char == undefined)
                return 0;
            let cType = getCharType(char);
            switch(state){//Enter into the main clause of the state machine depending on the state
                case 'init':
                    switch(cType){
                        case 'digit':
                            state = 'number';
                            this.t = '#';
                            this.c = char;
                            break;
                        case '.':
                            state = 'number';
                            this.t = '#';
                            this.c = char;
                            dotCount = 1;
                            break;
                        case 'letter':
                            state = 'variable';
                            this.t ='$';
                            this.c = char;
                            break;
                        case 'symbol':
                            if((macro = macros[char])==undefined)return 1;
                            state = 'macro';
                            this.t = 'incompleteMacro';
                            if(macro instanceof Array){
                                this.c = <string>macro[0];
                                this.t = <string>macro[1];
                                this.cc = <number> macro[2];
                            }
                            break;
                        case 'space':
                            this.t = 'structure';
                            this.c = 'space';
                            break;
                    }
                    break;

                case 'number':
                    switch (cType) {
                        case 'digit':
                            this.c += char;
                            break;
                        case '.':
                            if(dotCount==0){
                                this.c += char;
                                dotCount = 1;
                            }
                            else terminating = true;
                            break;
                        case 'letter': terminating = true;
                            break;
                        case 'symbol':
                        case 'space':
                            terminating = true;
                    }
                    break;
                case 'variable':
                    switch(cType){
                        case '.':
                        case 'digit':
                        case 'letter':
                            terminating = true;
                            break;
                        case 'symbol':
                        case 'space':
                            if(convertE&&this.c == 'e'){
                                this.t = "constant";
                                terminating = true;
                                break;
                            }
                            if(char == '_') state = 'var_';
                            else if(tex.substr(i, 6)=='\\left(')
                                return this.pl(tex, i, 1);
                            else terminating = true;
                    }
                    break;
                case 'var_':
                    switch (cType) {
                        case 'digit':
                        case 'letter':
                            this.c += char;
                            //queue for termination after one extra round (the next char will be ignored)
                            state = 'var_{}';
                            break;
                        case 'symbol':
                        case 'space':
                            if(char == '{') state = 'var_{';
                            else if(char != ' ') return 1;
                            break;
                        case 'dot': return 1;
                    }
                    break;
                case 'var_{':
                    if(char != '}') this.c += char;
                    else state = 'var_{}';
                    break;
                case 'var_{}':
                    if(tex.substr(i, 6)=='\\left(') return this.pl(tex, i, 1);
                    else terminating = true;
                    break;
                case 'macro':
                    if(macro instanceof Array) {
                        terminating = true;
                        this.cn(previousType);
                        return this.pl(tex, i, this.cc);
                    }else if((macro = macro[char])!=undefined){
                        if(macro instanceof Array) {
                            this.c = <string>macro[0];
                            this.t = <string>macro[1];
                            this.cc = <number>macro[2];
                        }
                    }else return 1;
                    break;
                case 'space':
                    switch(cType){
                        case 'space':
                            break;
                        default:
                            terminating = true;
                    }
                    break;
                case 'terminating':
                    terminating = true;
            }
            if(!terminating)
                this.X+=char;
            i++;
        }
        return 0;
    }

    /**
     * parseClauses
     * Serves to parse the subclauses of a token given that it is
     * an operator permitting subclauses
     *
     * @return parseConstant indicating if there are any errors in the syntax during parsing,
     *                       0: parse successfully terminated, 1: unrecognized character
     */
    pl(tex: string, start: number, clauseCount:number): number{
        if(clauseCount == 0){
            return;
        }else{
            this.sc = [];
        }
        let i = start;
        switch(this.c){
            case 'sum':
            case 'prod':
                if(tex.charAt(i)=='_') i = this.ps(tex, i+1, 0);
                else if(tex.charAt(i)=='^') i = this.ps(tex, i+1, 1);
                else return 1;
                if(tex.charAt(i)=='_') i = this.ps(tex, i+1, 0);
                else if(tex.charAt(i)=='^') i = this.ps(tex, i+1, 1);
                else return 1;
                break;
            case 'integrate':
                //Parse lower bound
                if(tex.charAt(i)=='_') i = this.ps(tex, i+1, 0);
                else if(tex.charAt(i)=='^') i = this.ps(tex, i+1, 1);
                else return 1;
                //Parse upper bound
                if(tex.charAt(i)=='_') i = this.ps(tex, i+1, 0);
                else if(tex.charAt(i)=='^') i = this.ps(tex, i+1, 1);
                else return 1;
                //Parse integrand
                let parser = new R();
                i = parser.l(tex, i, new T(), new S('diff', this));
                this.sc[3] = [parser.tl[parser.tl.length-1]];
                this.sc[2] = parser.tl;
                break;
            case 'diff':
                let token = new T();
                token.rf(tex, start, 'diff');
                if(token.t!='$')
                    return 1;
                this.sc[0]=[token];
                i = token.e;
                break;
            case 'cos':
            case 'sin':
            case 'cot':
            case 'tan':
                if(tex.charAt(i)=='^') i = this.ps(tex, i+1, 0);
                else {
                    this.sc.length = 0;
                    this.cc = 0;
                }
                break;
            case 'vector':
                i = this.ps(tex, i, 0);
                if(this.sc[0].length!=2||this.sc[0][0].t!='$'){
                    return 1;
                }
                this.cc = 0;
                this.c = '>'+this.sc[0][0].c;
                break;
        }
        if(this.t == '$'){
            if(tex.substr(i, 6)=='\\left('){
                let openStruct = new T();
                openStruct.t = 'openstruct';
                openStruct.c = '(';
                openStruct.s = start;
                openStruct.e = start+6
                i = start+6;
                let parser;
                do {
                    parser = new R();
                    i = parser.l(tex, i, openStruct, new S(',)', openStruct));
                    this.sc.push(parser.tl);
                }while(parser.tl[parser.tl.length-1].c!=')');
                this.cc = this.sc.length;
                this.t = 'func$';
            }
        }
        this.e = i;
    }

    /**
     * parseSubClauses
     * Parse for a particular sub-clause beginning with '{' and ending with '}'
     * @param tex the entire tex string
     * @param start the beginning of the sub-clause, '{' included
     * @param clauseIndex the sub-clause that the parsed segment of string belongs to
     */
    ps(tex: string, start: number, clauseIndex:number):number{
        let end;
        if(tex.charAt(start)=='{'){
            let parser = new R();
            let openStruct = new T();
            openStruct.t = 'openstruct';
            openStruct.c = '{';
            openStruct.s = start;
            openStruct.e = start+1;
            end = parser.l(tex, start+1, openStruct, new S('}', openStruct));
            this.sc[clauseIndex] = parser.tl;
        } else {
            let token = new T();
            token.rf(tex, start, 'openstruct');
            this.sc[clauseIndex]=[token];
            end = token.e;
        }
        return end;
    }

    /**
     * checkNegation
     * Called to check if '-' should be parsed to a
     * subtraction operator or a negation operator
     * @param previousType
     */
    cn(previousType: string){
        if(this.c=='sub'){
            if(previousType==undefined||previousType=='none'||previousType=='operator'||previousType=='openstruct'
            ||previousType=='optstruct'){
                this.c = 'neg';
            }
        }
    }
}

// T.prototype.toString = function(){
//     return this.type+':'+this.content;
// }

//SymNode
class SN {
    //children
    ch: SN[] = [];
    //content
    c: string;
    //subClauses
    sc: SN[] = [];
    //token
    s: T;
    //type '#' for number, '$' for variable, 'func$' for functional variable, 'operator' for operator.
    t: string;

    /**
     * getLeaves
     * Retrieves all leaf nodes underlying this statement tree.
     */
    gl(): SN[] {
        let leaves: SN[] = [];
        for(let clause of this.sc) {
            if(clause == undefined)
                throw new ReferenceError("incomplete expression");
            leaves.push(...clause.gl());
        }
        if(this.ch.length == 0) {
            leaves.push(this);
            return leaves;
        }
        for(let child of this.ch) {
            if(child == undefined)
                throw new ReferenceError("incomplete expression");
            leaves.push( ...child.gl());
        }
        return leaves;
    }
}

/**
 * formats
 * Inside the formats are instructions for the matching of various structures. In the parse stack,
 * a close close parenthesis shall be inserted on account of each open parenthesis, and all closing structures
 * that match the top of the parse stack will cause a pop instruction, otherwise they throw errors.
 */
let f:{[key:string]:string} = {
    '(':')',
    '{':'}',
    '$':'$',
    '[':']',
}

//Class for items in the parse stack, representing structure typed tokens
//Structure
class S{
    //identifier
    fi: string;
    //destination
    //The token that serves as the open structure corresponding to this (closing structure)
    //The start and end index insides destination can be particularly helpful when raising parsing errors
    na: T;
    constructor(identifier:string, destination: T) {
        this.fi = identifier;
        this.na = destination;
    }
}

//Parser
class R {
    //toStatementTree
    ts(latex:string){
        console.log(latex);
        try {
            this.l(latex+'$');
        } catch (e) {
            console.log(e);
        }
        console.log(this.tl);
        let statementTree = this.s(this.tl);
        this.e(statementTree);
        console.log('Statement Tree: ')
        console.log(statementTree);
        return statementTree;
    }

    /**
     * tokenList
     * The token list of this holds the result of linParse
     */
    tl:T[] = [];
    /**
     * parseStack
     * Parse stack helps keeps track of parenthesis, at its bottom, it also holds an exit string that signals
     * the termination of the current parsing level, and returns to the previous level by exiting the linParse function.
     */
    ps:S[] = [];

    /**
     *linParse
     * @param tex
     * @param start
     * @param previousToken
     * @param terminator The structure representation of the token that causes the current level of parsing to terminate.
     * '$' is the default terminator for the root level parsing.
     */
    l(tex: string, start:number = 0, previousToken = new T(),
      terminator:S = new S('$', previousToken)): number{
        this.tl.length=0;
        this.ps.push(terminator);
        let i = start;
        while (this.ps.length!=0&&i<tex.length){
            let token = new T();
            //Starts reading the tex string starting from index i,
            let parseConstant = token.rf(tex, i, previousToken.t);
            if(token.t == 'structure'&&token.c == "space"){
                i=token.e;
                continue;
            }
            switch(parseConstant){
                case 1:
                    console.log(previousToken);
                    throw new SyntaxError('Unrecognized syntax at '+token.s+' on character '+tex[token.e]);
                default:
                    break;
            }
            if(addInvisibleDots){
                if((['closestruct', '$', '#', 'constant', 'func$'].indexOf(previousToken.t)!=-1)&&
                    (['$', 'function', 'func$', '#', 'constant'].indexOf(token.t)!=-1||token.c=='('||
                        token.t=='operator'&&['sum'].indexOf(token.c)!=-1)){
                    let invisDot = new T();
                    invisDot.t = 'operator';
                    invisDot.s = invisDot.e = previousToken.e;
                    invisDot.c = 'invisdot';
                    this.tl.push(invisDot);
                }
            }
            this.tl.push(token);
            if(token.t == 'openstruct'){
                this.ps.push(new S(f[token.c], token));
            }
            if(token.t == 'closestruct'){
                //Use index of to track multiple symbols
                if(this.ps[this.ps.length-1].fi.indexOf(token.c)!=-1){
                    this.ps.pop();
                }
                else throw new SyntaxError('Mismatched closures between '+
                                this.ps[0].na.c+' and '+token.c);
            }
            //Optional structure, breaks this parse when matched to closure identifiers,
            //otherwise converted to structure
            if(token.t == 'optstruct'){
                if(this.ps[this.ps.length-1].fi.indexOf(token.c)!=-1){
                    this.ps.pop();
                    if(this.ps.length==0)//Modify type of trailing optstruct tokens in a token list
                        //to close structs, as this is the only way they are used
                        token.t = 'closestruct';
                }
            }
            previousToken = token;
            i = token.e;
        }
        return i;
    }

    /**
     * syParse
     * The core algorithm for parsing token list into statement trees, relies primarily
     * on shunting yard. Left/right associativity are differentiated for certain operators and functions.
     * @param tokenList the list of parsed tokens
     */
    s(tokenList: T[]): SN{
        let shuntingYard:T[] = [];
        let tray: SN[] = [];
        for(let token of tokenList){
            if(token.t == '$' ||token.t == '#' ||token.t == 'func$'||token.t == 'constant'){
                let node = new SN();
                node.t = token.t;
                node.c = token.c;
                node.s = token;
                tray.push(node);
            }else if(token.t == 'function' ||token.t == 'operator'){
                while(shuntingYard.length!=0&&shuntingYard[shuntingYard.length-1].t!='openstruct'
                    &&shuntingYard[shuntingYard.length-1].t!='vec'
                    &&this.a(shuntingYard[shuntingYard.length-1], token)) {
                    let operator = shuntingYard.pop();
                    this.c(operator, tray);
                }
                shuntingYard.push(token);
            } else if(token.t == 'openstruct')
                shuntingYard.push(token);
            else if(token.t == 'closestruct'){
                //This clause also needs to take care of the unmatched close struct in the token list or subclauses
                let operator;
                while(shuntingYard.length!= 0 && f[(operator=shuntingYard.pop()).c]!=token.c){
                    this.c(operator, tray);
                }
                //After parenthesis, check one element down the parse stack for function invocation
                if(operator!=undefined&&operator.t=='openstruct'&&
                    token.c==')'&&shuntingYard[shuntingYard.length-1]!=undefined
                    &&shuntingYard[shuntingYard.length-1].t=='function'){
                    this.c(shuntingYard.pop(), tray);
                }
                if(operator!=undefined&&operator.t=='vec'){
                    operator.sn.push(tray.pop());
                    let node = new SN();
                    node.ch = operator.sn;
                    node.s = operator;
                    node.c = '$Q';
                    switch (token.c){
                        case ')':
                            node.t = 'vector';
                            break;
                        case ']':
                            node.t = 'array';
                            break;
                        default:
                            throw new SyntaxError("Unimplemented vector clause: "+token.c);
                    }
                    tray.push(node);
                }
                if(token.c=='diff'){
                    let node  = new SN();
                    node.t = '$';
                    node.c = token.sc[0][0].c;
                    node.s = token.sc[0][0];
                    if(tray.length==0)
                        tray.push(node);
                }
            }else if(token.t == 'optstruct'&& token.c == ','){//Vector parsing
                let operator;
                //Pop till the closest container
                while(shuntingYard.length!= 0 && f[(operator=shuntingYard.pop()).c]==undefined) {
                    this.c(operator, tray);
                }
                if(operator!=undefined&&operator.t!='vec'){
                    operator.t = 'vec';//Identify the openstruct as a vector container
                    operator.sn = [];
                }
                operator.sn.push(tray.pop());//Store the clause
                shuntingYard.push(operator);
            }
        }
        console.log(tray);
        return tray[0];
    }

    /**
     * collapseOperator
     * Collapses the specified operator into the tray with
     * a newly instantiated SymNode enclosing it
     * @param operator
     * @param tray
     */
    c(operator: T, tray: SN[]){
        let node = new SN();
        node.t = operator.t;
        node.c = operator.c;
        node.s = operator;
        let operandCount = this.o[operator.c][2];
        for(let i = 0; i<operandCount; i++){
            node.ch[operandCount-i-1]=tray.pop();
        }
        tray.push(node);
    }
    /**
     * syParseSubClauses
     * Reuse syParse to generate statement trees for all subclauses recursively.
     * @param node
     */
    e(node: SN) {
        if (node==undefined)
            return;
        if (node.s.sc != undefined && node.s.sc.length != 0) {
            node.sc = new Array<SN>(node.s.sc.length);
            // Parse subclauses of this node recursively.
            for (let i = 0; i < node.s.sc.length; i++) {
                let tokens = node.s.sc[i];
                let subnode = this.s(tokens);
                node.sc[i] = subnode;
                this.e(subnode);
            }
        }
        // Parse subclauses of children nodes recursively.
        for (let child of node.ch)
            this.e(child);
    }

    /**
     * operatorChart
     * [left associativity, right associativity, parameter count],
     *
     * frac pops as soon as it meets other operators or functions with its high
     * left associativity.
     * It also has high right associativity so as to ensure that it always gets
     * in the stack ensuring that the fraction will get computed first prior to whatever
     * comes before it, except for when it encounters another fraction, which is already
     * an unlikely occurrence, in which case the first fraction is to be computed first before this.
     * @private
     */
    private o: {[key:string]:number[]}={
        'add': [1.5, 1, 2],
        'sub': [1.5, 1, 2],
        'mul': [3, 2, 2],
        'invisdot': [3, 2, 2],
        'dot': [3, 2, 2],
        'cross': [3, 2, 2],
        'div': [3, 2, 2],
        'frac': [8, 7, 2],
        'pow': [4, 5, 2],
        'equal': [0, 0, 2],
        'tan': [2.5, 6, 1],
        'cot': [2.5, 6, 1],
        'sin': [2.5, 6, 1],
        'cos': [2.5, 6, 1],
        'sum': [2.5, 6, 1],
        'prod': [2.5, 6, 1],
        'factorial': [6, 5, 1],
        'neg':[2.5, 6, 1],
        'ln': [5, 6, 1],
        'sqrt': [8, 7, 1],
    }
    /**
     * compareAssociativity
     * Returns true if opr1 has higher left associativity than opr2's
     * right associativity
     * @param opr1 left operator
     * @param opr2 right operator
     */
    a(opr1: T, opr2: T): boolean{
        return this.o[opr1.c][0]>=this.o[opr2.c][1];
    }
}

export {R, SN};