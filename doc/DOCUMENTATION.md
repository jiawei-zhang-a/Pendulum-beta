
# Documentation
A brief log of the important design decisions and implementations made along the way.
## Project setup

### Node
``npm init``
Prompts the project setup procedures, and creates package.json.

Reference: https://docs.npmjs.com/cli/v7/commands/npm-init

### Typescript
Standard language of the project for modular development

Reference: https://robertcooper.me/post/get-started-with-typescript-in-2019

`npm install --save-dev typescript` local installation

### Compilation
To ensure simplicity of the development environment, I will experiment with using only the typescript transpiler in the development phase
and do away with Grunt. Create a tsconfig.json file with `tsc --init`. 

`tsc` for one-time transpiling

`tsc -p` for automated transpiling


### Source Mapping
Typescript provides the functionality for source mapping as an option in ts-config.json. A thorough introduction to the options for 
typescript source mapping provided here: https://www.carlrippon.com/emitting-typescript-source-maps/. Why do we want to use source maps?
That's because after transpilation and building, the code will become scrambled and unclear. In order to debug from this clutter,
a mapping from the generated files back to the original files must be created. With the help of source mapping, browsers like Chrome will
display the original code in the developer console and developers can directly set breakpoints or see error references to the original code.
More details on: https://trackjs.com/blog/debugging-with-sourcemaps/.

### Module
- In order to resolve a reference issue in the transpiled code of helloworld.ts, the commonjs npm module is added.

- The solution doesn't really work, the commonjs module is kept since why not.

- As noted through many trials, typescript faces immense trouble when directly producing browser compatible code. In particular, the output
of typescript transpilation is optimized for commonjs, a format that presumes the nodejs environment with keywords such as require built in.
The transpilation does not compile into the resultant files any source codes from relevant modules such as three.js, but simply presumes
the usefulness of 'require' magic. In order to resolve this problem with module loading, and potentially many future issues, the transpiled code 
provided by typescript need further transformations such as browserify to become browser compatible. After some digging, a good pipeline that 
streamlines this whole process of multiple transformations is to be found at: https://gist.github.com/michalochman/d64360541a484e16817c. 
The pipeline is based on gulpfile, which in my opinion is better than nothing.

#### Gulp
Again, in order to resolve the module building issue with typescript, this time gulpfile is used for the building task. Installation for Gulp is to be found
at https://gulpjs.com/docs/en/getting-started/quick-start. One also need to install all the modules required by https://gist.github.com/michalochman/d64360541a484e16817c
for the gulpbuild.js in the directory to run correctly.
- Multiple error persisted with the use of Gulp, it turned out that 'three/src/three.js' is using import and export statements that aren't in the 
  common js standard, but 'three/build/three.js' is. Gulp was not the key to the solution. After changing the import directory in helloworld.ts from
  'three/src/three.js' to just 'three', the issue was resolved without the help of Gulp.
  
#### Final working solution
- Import 'three' in the ts scripts, use `tsc` for transpilation from ts to commonjs, use
`browserify DIR/SOURCE -o DIR/OUT` to transform the commonjs code to browser compatible ones.
  
- Next I would like to try automate this process with something like grunt, and find out how to build source maps

### Gulp again
- Now that a working solution has been established, I would like to add in the function of automation, which after some research, advocates for the use 
  of Gulp over Grunt: https://www.keycdn.com/blog/gulp-vs-grunt. So Gulp again, but this time not to resolve an ongoing issue, but to help
  improve the development flow with its power in automating processes. This article comes handy in getting us started with Gulp https://www.typescriptlang.org/docs/handbook/gulp.html.
- To understand how files get passed around and processed in gulpbuild.js, one shall read https://gulpjs.com/docs/en/getting-started/working-with-files/.
  Gulp makes extensive use of Node streams. To understand how Node streams work on an interface level, which can be helpful in future developments in user
  collaboration functionalities, check https://nodesource.com/blog/understanding-streams-in-nodejs/ (super clear & interesting by the way).
- A gulpbuild.js needs to be added, which should contain all the streamlined methods provided by gulp modules for the file processing facilitated by Node streams. The current
  stream is tsc and then browserify the generated .js files.
  
### Browserify
The browserify module on itself can also perform typescript transpilation with the help of a plugin called tsify (https://www.npmjs.com/package/tsify). This is the method for integration with Gulp that was
officially adopted by typescript. tsify reads from the tsconfig.json with a few exceptions, the behaviors of which are described in the link above. One 
important exception is that when the debug option for browserify() is set to true the source map for the entire process, including transpiling into javascript and bundling the modules, gets generated regardless
of what has been specified in the tsconfig.json. The generated file content can then converted into vinyl format using source, a gulp module placed in the pipeline.
  
### Source mapping with Gulp and Browserify
Gulp provides build in functionality for source mapping with the module gulp-sourcemaps. Aside from supporting source map generations for official plugins,
it also supports loading existing source maps from vinyl up streams. The specifications are here: https://www.npmjs.com/package/gulp-sourcemaps. On the page
https://www.typescriptlang.org/docs/handbook/gulp.html, the complete use case of typescript->javascript->browserify using gulp with sourcemap is also provided.

### Watching
Monitoring the changes made to the typescript programs in src directory and updating the corresponding transpiled programs in the dist directory can be extremely
helpful in the process of debugging. Since only the transpiled javascript program organized in the dist folder can be run and tested in a browser, building them in real
time streamlines the workflow. One gets to test changes made to the program without having to actively recompile by simply refreshing the browser, while the building
process becomes largely invisible to programmers.

## Licensing

A helpful reference resides here: https://www.synopsys.com/blogs/software-security/5-types-of-software-licenses-you-need-to-understand/. 
The goal of our ultimate licensing is to permit the use of external libraries such as three while maintaining proprietorship to our own designs.

## Graphics
- A module plugged into core
- Takes care of the rendering of functionals/functions given by core. Keeps track of the graphical objects called Graph
- Generates materials / visualization styles specified by users.
- Updates the function when it is changed, with the help of a listener
- Gives feedbacks to core based on the rendering process

### Three
The core API to be used for various visualizations is threejs, a library which makes stunning visualizations using WebGL. For 2D visualizations using
three, an example can be found here: https://observablehq.com/@grantcuster/using-three-js-for-2d-data-visualization. 

### Graph
The basic wrapper around each graphable object. It contains necessary information about the object that is being rendered, such as its material,
its vertices and geometry, and it also holds plotting algorithms that transform equations into its corresponding visual representations.

## Core (`Core`)
Core is the computation center that gives life to the Pendulum system. It
- Receives and compiles commands from the UI
- Demands updates on various modules
- Routes the behavior of the interactive components
- Hosts and manipulates the virtual environment (`Core.Environment`) of variables, functions, and commands.

Asynchronous updates with listening form the basis of interactions between modules.
### Environment (`Core.Environment`)
- A "virtual machine" that maintains all the variables and their relations,
- Also takes care of processes, a Pendulum analog of threads in regular programming languages.
  
### Information flow
- Core monitors the environment module, and issues commands that display the inner states of the environment module.
  
- Each statement tree is passed from UI module into the core, which keeps a mapping of the statement back to the UI component. The Core
  then parses the statement tree into an instruction type, a script, along with a list of scripts for the leaf nodes of the tree, and passes 
  them as parameters into Core.Environment.
  
- The Core.Environment generates a variable/process based on the statement, and returns it.

- The core then responds to the newly created (Core.Environment.)Variable with follow-up actions, in particular making attempts to its algebraic local variables,
  calling Graphics.makeGraph(function, style) to generate a graph, and assigning it back to the Variable.
#### TeX statement
TeX statements are directly taken from user inputs. They are intuitive mathematical expressions that specify the structural relationships between variables. 
Mathquill offers the great functionality that enables responsive rendering of laTeX, making it possible to hide the complicated TeX statements in the back 
scene for users unfamiliar with it. Advanced users will be able to type directly in laTeX to make things efficient. Further, the texts backing the rendered 
mathematical statements can be easily retrieved by Core and parsed into statement trees. Each TeX statement in the user inputs is parsed into a separated 
statement tree.

TeX:`f(x) = \int_a^b t\sin(t-x) dt`  
Rendered:  
![img.png](img.png)

#### Statement trees
A tree structure representation of the original statement, where each operator is assigned with two or three
children, each capable of providing a number out of recursion.
```javascript
// structure = [operator, structure1,... structure#]
let statementTree = [operator,[operator, argument1, argument2], [operator, argument1, argument2, argument3]];
```
- Since programmed recursion on tree structures is not fast enough, they will be compiled into js scripts.
- The leaf nodes of the statement trees are important because they have to supply specific numbers for the recursion of the
  trees to work. In the cases where they don't supply numbers directly, they must be single variables that either have a public or 
  local scope.
#### Pi Script
The statement tree is compiled by the Core, or the Environment into scripts, which is a javascript concatenated recursively together to be executed
inside contexts.
- Due to performance reasons, it's very cumbersome to write the ultimate code for computation
that gets executed millions of times per-second in switch statements and hashmap virtual memories. The
best solution is to avoid creating a higher level language, and simply supply a context for regular
javascript to operate. Javascript will get generated recursively based on the original statement trees to reflect 
the mathematical expressions they represent.
It will also be possible to write pi script directly into the user interface. The core will then weakly compile the pi script
to check for security threats and supply it with necessary details such as contexts, scopes, and variable references. Once resolving
the variable references, dependency trees will be built and traversed.

### Variable (`Core.Environment.Variable`)
This is a class that passively contains its reference to interactive-interfaces such as fields and graphs. It also contains references to its dependencies and 
dependents, these provide crucial information for the Core.Environment module to run the procedures that maintain the variables.
- The environment module helps recognize dependencies, and initiates dependency pulses each time a variable is defined/redefined.
- A variable may further contain algebraic local variables, the values of these local fields and must be synchronously locked when accessed by
  different threads, or their accessors must provide a context which uniquely stores their values.
  ```javascript
  //local algebraic var = [graphics1, graphics2]
  x=[12.5, 67.2]
  // x is a algebraic local variable, it doesn't and shouldn't have a clearly defined value. Instead, its value varies based on contexts.
  ```
### Local variable
The entire idea of the name "local" is that they are variables located inside variable definitions. They are the variables of variables. It is easy
to locate local variables inside statement trees --- they are the non-constant leaf nodes of a statement tree. There are currently two types of local variables,
the local function variables, and the local algebraic variables.

#### Local Algebraic Variable
Local algebraic variables are non-constant leaf nodes of a statement tree that don't reference to any public variable definitions
- Their values are not clearly defined
  by the statement trees, and thus the name algebraic --- what matters is its algebraic relations to the rest of the expression.
- The specific contexts such as vertex generation (graphing) or integration will supply them with numerical values.

#### Local function variable
Local function variables are local variables that reference to other publicly defined variables. This idea might sound a little confusing since these "local" variables are actually
representing public variables. However, the publicly defined variables actually do not always have their values immediately available. For example a public variable `a=x+6` is dependent
upon `x`, a value that needs to be supplied at run time. That is why these public variables are more like <b>functions</b> when they get referenced, i.e., their evaluation requires the supplication
of more independent variables. There are two ways that independent variables of functions are supplied --- either through contexts and parameter lists.

  - Non-parameterized function variable:  
  If a (local) function variable doesn't have its independent variables explicitly stated, like `b=\sin(15x)-c`, referred by a variable definition `d = b-x`, 
  its evaluation only relies on `context` to give the value of `x` and perhaps `c`. In this case it's non-parameterized. 
  
  - Parameterized function variable:  
  If a function variable have explicit statements about its independent variables, such as `f(x) = x^2+b`, it relies on both `context` 
  and `parameterList` to supply its evaluations. The `parameterList` contains the explicitly stated local variables, in this case `x`, and 
  the `context` contains values for other algebraic variables. In this case it is parameterized.

### Reference list (for local variables)
To avoid repeated reading from hashmaps, a reference list accessed by indices will be created when compiling statement trees into pi scripts. The scripts 
generated for leaf nodes in the statement tree will contain references to indices instead of the original variable names. Mapping between
the specific var names and the indices will be kept in `Variable` instances. The reference list has a nested array structure. Each top-level item
contained in the reference list is called a "reference". Each reference is a list (tuple).
```javascript
variable.referenceList = [reference1, reference2, //...
                         ];
```


The first entry of a reference always specifies the type of the local variable. Currently, there are three types (subject to expansion):
1. Constant --- a number acquired from a deterministic variable reference.  
    * Example input:  
  ![img_1.png](img_1.png)  
    * Inside variable:
   ```javascript
   variable.referenceList = [[1, 625]];
    ```
2. Function --- the value of the local var is non-deterministic after initialization, either because the reference requires input parameters that are non-deterministic,
   or because the referenced variable implicitly depends on non-deterministic variables like algebraic vars or other non-deterministic functions. The evaluate function of
   the corresponding `Variable` is stored in the second entry of the tuple.  
   * Example input:  
   ![img_2.png](img_2.png)  
   * Inside variable:
   ```javascript
   variable.referenceList = [[2, π.getChild('f').evaluate]];
   ```
   
3. Algebraic --- Algebraic local variables are the local variables that don't have any statements to define them. Their values need to be supplied by a `context` in
   the run-time. The exact location of a algebraic variable inside the context matrix is specified by the second and third entries of its reference.
   * Input:  
   ![img_5.png](img_5.png),  
   where c0 a constant term supplied by the program to populate a solution set, and x the graph variable that is to be supplied by the Graphics module. 
   
    * Inside variable:
   ```javascript
   //For algebraic typed references, the second entry specifies the letter,
   //the third entry specifies the subindex, with -1 corresponding to no index,
   variable.referenceList = [[3, 24, -1], 
                             [3,  3,  0]];
   variable.context = [[],//a
                       [],//b
                       [NaN,11.34], //c0, some number supplied by the caller
                       //...
                       [0.79], //x, some number supplied by the caller (graphics module)
                       [],//y
                       []];//z
   ```
    * Valid algebraics: $a_1$, $a_3$, $\{z_i\}_{[10]}$,  
    Non-valid algebraics: μ, $P _{ressure}$, $\text{System}$.
   
### Context
A `context` is a 2D array structure supplied by the different callers that wish to evaluate the variable.
Again, one avoids the map structure because it is really slow in javascript. For efficiency reason, the first dimension of the array needs to be small, and its second
entry will be dynamically allocated during run time. This naturally gives rise to the syntax that algebraic local variables can only be <b>single alphabetical letters</b>, with or
without positive sub-indices. Its sub-indices, which have to be non-negative, will specify its location along the second axis of the context mapping.

Each variable has a `evaluate(inputs,context)` function that wraps around the pi script. When calling the variable, a context with certain variables specified will be passed in, and the 
same context will be passed down recursively to all subsequent $.evaluation$ calls dispatched by the current instance:

```javascript
variable.context = [[],//a
[],//b
[], //c
//...
[1.21], //x, some number supplied by the caller (graphics module)
[],//y
[]];//z
```

![img_6.png](img_6.png)  

#### Function context
Sometimes a function takes a long time to compute, and its returned value for the same set of algebraic values may get reused. 
When this is the case, the core will attempt to employ dynamic programming to speed up computations. Using a function context
dynamic programming for non-parameterized functions can be achieved.
- funcContext has a slightly different structure:
    array: `[[],...,[[27, *, 2]],...]`
  The first entry of the third axis is the value that the variable has. THe second is its assigned clock cycle number.
  There is also an additional parameter passed as the public clock cycle supplied by the root caller of the evaluate function.
  Each time when an update occurs the clock number gets increased by 1. When the clock number of a function does not match the 
  supplied value, it means the function needs to be re-evaluated. Its pi-script will be conditionally executed, and its value
  will be in the first entry of the third axis of the function context, and its clock # will be updated. If the clock # of
  a function matches the cycle, its value will be directly retrieved from the first entry.
  
- Local variables of multiple statements may share the same definition. However, their values can be completely different
  in the same of context if the evaluation of the function relies on independent variables. That's why only non-parameterized
  functions are available for dynamic programming.
  
- Function namings that don't follow the algebraic variable naming will not be available for dynamic programming.

### Statement resolution
Statement resolution is the process that Core goes through to identify which variable a TeX statement is meaning to define. 
There are two types of statements resulting in different statement trees:
1. `a: 12 + b`. Here the variable label is specified by the user, and there are no equal signs.
2. `(b): b = 12.5^2 - x^2`. Here an equal sign is present in the statement. If the variable label is not specified by users, the machine
    should find a way to deduce that the statement is defining b.
   
The first case is trivial, generating a single expression in the root of the statement tree corresponding to the label that the user specified. 
The second is trickier. Its statement tree will look something like this: `[expression1, expression2]`. This gives Core the possibility to figure 
out on itself what the expression is trying to define, and assign the label automatically.
The interpretation currently follows these procedures:
* Check whether the left expression consists of a single variable. 
        If yes: Check if it shows up in the right expression.
            If yes: pass.
            If not: check if it shows up in the right-side expression.
                If yes: pass.
                If not: check if the single variable is x or y.
                    If yes: reserve this as a graphics statement. Label it with something like ($Graph)1.
                    If not: the expression on the right makes a definition for the variable.
    
* Do the same thing in the opposite direction.

* Now the definition we are seeing must be implicit. Check if either side of the equation contains undefined variables that doesn't show up 
    on the other and that there is only one such variable.
    * If yes, check if that variable shows up at only one spot in the side where it exists.
        * If yes: this is a separable variable, and the whole equation is a implicit definition of this variable. Isolate it on the left side of the expression.
        * If not: This is a non-separable implicit function.
    * If not, pass.
    
* Now the function is fully implicit and unspecific. User must specify the variable label unless both x and y show up in the expression. In this case the statement
    defaults to a graphing only variable, and the right side of the expression will be subtracted to the left side for implicit vertex mappings.
## UI
- User input panel for components like buttons, sliders, latex fields
- Place for user inputs and feedbacks 
