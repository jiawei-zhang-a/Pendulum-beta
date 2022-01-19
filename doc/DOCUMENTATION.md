# Documentation
A brief log of the important design decisions and implementations made along the way.
## Project setup

### Node
``npm init``r
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
The browserify module on itself can also perform typescript transpilation with the help of a plugin called tsify (https://www.npmjs.com/package/tsify). 
This is the method for integration with Gulp that was
officially adopted by typescript. tsify reads from the tsconfig.json with a few exceptions, the behaviors of which are described in the link above. One 
important exception is that when the debug option for browserify() is set to true the source map for the entire process, including 
transpiling into javascript and bundling the modules, gets generated regardless of what has been specified in the tsconfig.json. The generated 
file content can then converted into vinyl format using source, a gulp module placed in the pipeline.
  
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

![img_16.png](img_16.png)

### Three
The core API to be used for various visualizations is threejs, a library which makes stunning visualizations using WebGL. For 2D visualizations using
three, an example can be found here: https://observablehq.com/@grantcuster/using-three-js-for-2d-data-visualization. 

### Canvas


Canvas wraps around all canvas related objects, including THREE.scene, THREE.camera, the htmlDiv, and so on. It also holds the animation method for continuous rendering.
With the combination of Canvas and Graph, one can quickly add a graph to the canvas by calling Canvas.addGraph(graph). This gives one the ability to manipulate the canvas
imperatively, by calling methods that wrap around multiple function calls that achieve certain actions on the canvas. The Three objects inside Canvas are still publicly
exposed, so one still have the option to operate on them directly. Canvas also listens for window resize events, so that it can adjust the renderer size accordingly.

### Graph
The basic wrapper around each graphable object. It contains necessary information about the object that is being rendered, such as its material,
its vertices and geometry, and it also holds plotting algorithms that transform equations into its corresponding visual representations.
As an abstract class, we have its structure defined:
```typescript
/**
 * The abstract interface for a visualized graph
 */
abstract class Graph {
    name: string;
    material:THREE.Material;
    mesh: THREE.Mesh;
    //Vector providing camera position for rendering optimization
    cameraPosition: THREE.Vector3;
    protected constructor (name: string) {
        this.name = name;
    }
    /**
     * Returns the effective bounds of visualization for this graph
     */
    getBounds(): number[][] {
        return [[-5, 5], [-5, 5], [-5, 5]];
    }

    /**
     * Constructs geometries without populating them
     * @param param parameters specifying the geometry
     */
    abstract constructGeometry(param:{[key:string]:string}):void;

    /**
     * Populates the geometry of this graph
     */
    abstract populate(): void;

    setMaterial(material:THREE.Material){
        this.material = material;
    }

    /**
     * Called by canvas to update rendering orientations
     */
    abstract updateOrientation():void;

    abstract update():void;

    /**
     * Disposes the THREE mesh and geometries of this, releasing their memory
     */
    abstract dispose():void;
}
```
Among the methods, .constructGeometry is to be called to instantiate all Three visualization objects, and .populate is to be called for the mapping of the 
function/field/other mathematical object that the graph is intended to represent onto the visualization objects.

### Cartesian graph
Subclass extending Graph. This is a class specializing in the visualization and subsequent updating of cartesian functions f:(x, y) => z. The primary THREE object that it keeps is a 
`THREE.BufferedGeometry` object. With `THREE.BufferedGeometry`, one is able to, by specifying its buffered attributes, positions of the vertices, the 
composition order of vertices to make the facelets, and so on. 

The .populate method of this class utilizes a mapping (x, y) = M(u, v), M: (0, 1)^2 => R^2, to determine the x, y locations of the vertices to be generated. Then 
the generated x, y coordinates are placed into the function f, yielding z = f(x,y) = f(M(u,v)) for the z coordinates of the vertices. M should be a conformal mapping,
and its main purpose is to dynamic adjustment the positions of the vertices for rendering optimization, while maintaining an unvaried general appearance of the generated mesh that depends
primarily on f.
#### Transparency problem
- The facelets are rendered in the order they appear inside the vertices array.
- The earlier they appear, the earlier they get rendered into pixels.
- For facelets that are semi-transparent, they have less than 1 alpha values. For facelets with α<1, their rasterized pixels should blend with the colors of the facelets behind them, and if 
there were multiple facelets cascaded together, then each should pass on the colors of previous layer according to a formula like:
  C1 = αA + (1-α)C0, where C0 is the previous color, C1 the new color, and A is the color of this facelet.
  
    This makes the distance of the facelets rendered to the camera very important. If two
  facelets occupy the same pixel, the facelets that is further away from the camera should get rendered first, and the one closer should get 
  rendered on top of the previous pixel to have the rendered color properly blended. This distance is called the z-buffer.
  
- However, for optimization reasons, the renderer of webGL will not explicitly sort the z-buffer of each pixel before rendering them, so that there 
  is no guarantee of the order of rendering except for the order in which they come in the vertices array one specifies. If the facelets with a 
  smaller z-buffer happened to get rendered before the ones with a higher z-buffer, then its pixel color is computed without knowing the need what's behind. 
  Even when the facelets behind get rendered later, because the current pixel is showing the color of a facelet with a lower z-buffer, the renderer will have no choice but ignoring them.
  
- This creates the transparency issue, making certain facelets that were supposed to show through the transparent facelets in front of them not rendered, such that 
  when looking from the users' perspective, it appears as if the transparent faces have become opaque.
  
    ![img_18.png](img_18.png)  
    As can be seen from the screenshot above, parts of the surfaces in front no longer appear transparent.


- For CartesianGraph, the rendering order (the order in which the vertices appear in the vertices list), is determined by the vertex enumeration 
  following:  
  ![img_19.png](img_19.png)
  where ui and vj are equally spaced between [0, 1] following ui = i/|U|, vj = j/|V|, and M by default is
  ![img_21.png](img_21.png),   
  in which _l_ is the side length of the region of visualization.
  

-  Note that all vertices along the v direction gets generated first,
   before moving on to a new u index. When Camera is looking at the mesh from the ![img_23.png](img_23.png) position, this generation order makes sure that all elements behind
   are rendered before the elements in front, so there are no transparency issues. 
    ![img_22.png](img_22.png)
   
- However, if we look from the position of ![img_25.png](img_25.png), the rendering order is not gauranteed with the previous mapping. In this case,
we simply need to rotate the mapping 90 degrees. 
  ![img_26.png](img_26.png)
- In general, divide the space into four orientations:
![img_27.png](img_27.png),  
  and apply rotation matrix to the original map:
  ![img_28.png](img_28.png).
  
If we update this mapping M:(u,v)->(x,y) each time the camera enters into a new orientation and repopulate
the vertices, there will be no self-transparency issues with cartesian graphs, creating the illusion that the renderer
is explicitly sorting the facelets behind the hood, while enjoying maximal rendering responsiveness.

![img_30.png](img_30.png)

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
To avoid repeated reading from hashmaps, a reference list accessed by indices will be created _inside Variable_ when compiling statement trees into pi scripts. The scripts 
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
The only check that needs to be made is that the label itself doesn't show up in the expression, as we would want the user to explicitly specify that
they want to define a variable implicitly, so `a:12+b+a` will be invalid, but `a:a=12+b+a` is permitted.
The second is trickier. Its statement tree will look something like this: `[expression1, expression2]`. This gives Core the responsibility to figure 
out on itself what the expression is trying to define, and assign the label automatically.
The interpretation currently follows these procedures:
* Check whether the left expression consists of a single variable. 
        If yes: Check if it shows up in the right expression.
            If yes: pass.
            If not: check if it shows up in the right-side expression.
                If yes: pass.
                If not: check if the single variable is x, y, or z.
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
#### Label guessing
Most protocols around label guessing have been discussed above. This is a procedure carried out by the core prior to the direct definition resolution. 
If user puts nothing in the label field, which leaves the equation to look something like this: ``_: x^2+y^2``, Pendulum will make an attempt to guess
the label by invoking the label guessing module in core.
#### Graphable statement
It was originally intended for Pendulum to determine the graphability of a statement at the time of its initial resolution, by reading the number of undefined
algebraics it has, and react accordingly. But this will unnecessarily complicate matters as it will require the graphability of each statement to be redetermined
whenever something on its dependency have changed, thus changing its label and consequently its entire variable interpretation. Instead then, graphability will
be something inferred within the constructed variables, independent of how it is constructed. When the variables are instantiated, and each time a dependency pulse
is issued, an attempt to redetermine its graphability will be made. 
Graphable statement examples:
``y=x^2+c^2`` explicit y-cartesian; ``z^2=x^2-y^2``, implicit cartesian; ``f(x)=x-a``, where ``a = 3``, explicit (z)-cartesian; ``f(x)=x-a``, where ``a = 3-x``,
explicit (z)-cartesian; ``\vec{v} = 12\vec{r}-2(x,y,z)``, explicit vector field.

Non-graphable statement examples:
* ``z=x-a+y``, where ``a`` undefined, problem: 3 dimensional manifold in 4 space, not yet supported.
* ``z+a-x=x-5+c``, problem: 3 dimensional manifold implicitly defined in 4 space, not yet supported.

Up to this point we can discern a general rule for determining the graphability of equations. Based on the dimensionality of the visualization context, a
n-dimensional graphics context may permit up to n independent variables, or so-called "algebraic variables" in a single equation. If there is no equation
present, but just an expression, then the number of algebraics permitted in that particular expression may be at most n-1.
#### Anonymous statement 
Anonymous statements, also known as graphable statements, define anonymous variables that are labeled by numbers, such that the evaluation results of these variables
won't be taken into account by other variables. Anonymous appear on the user interface in the form of ``1: y=sin(x)``, and users are not able to specify a variable
to be anonymous by labeling it. Instead, by leaving the label field blank, the default label generated by the core may be anonymous based on the following
two conditions:
1. If a statement contains too many algebraics for the core to guess a default label.
2. If a statement contains x, y, or z as stand alone algebraics, which would otherwise be inferred as the default label.
### Implicit evaluation
Sometimes it occurs that the evaluation of fully specified variables are not immediate. This can either be due to them defined by an implicit expression, or the expression
that define them are embedded within a larger system of equations. This requires additional techniques, especially gradient descent, to be employed for their solving.

* Sometimes definition of a variable/function needs more than one statement. This can either occur for an ODE statement, a PDE statement, or a system of equation.
* When a system of equation shows up, they manifest in the statement resolution stage as circular dependencies. If several variables show mutual dependence in the dependency walk,
  the evaluation of these variables will end up requiring that their values be "given". See diagram:  
  ![img_7.png](img_7.png)  
  Here cycles are formed between _a_ and _c_, and _b_ and _c_. Now, regular evaluation techniques are no longer effective. The determination of the value of _a_ implies that of both
  _b_ and _c_. Upon this, the variables _a_, _b_, and _c_ will be placed into a single evaluation group inside the Environment. The technique to be deployed is gradient descent.
  The first thing to do when resolving the statement tree is to subtract the right expression by the left one. Then for the entire evaluation group, we have:  
  ![img_8.png](img_8.png)  
  The same technique can be applied when the statements are all implicit, including stand-alone definitions.

### Differential equation solver
![img_9.png](img_9.png)  
In case of differential equations, the identifier that the Core looks for is dy/dx, which gets translated into \diff{y,x} inside the statement tree. This grammar identifies
a differential term, which in this example consists of y varying in terms of x. The accepted notations are dy/dx when the variable y is non-parameterized, or \dot{y}, y' if
y is a parameterized function. When y is defined else where, then dy/dx denotes the differentiation of y, and is treated as a function, parameterized or non-parameterized. 
If y is never defined else where, or the variable in concern is explicitly labeled to be a definition, then \diff{y,x}, cues the Core to numerically solve the differential equation.

* When solving the diff eqns, the core relies on a cache structure built into variables. Default values for the initial values of the equation to the n-1th degree will be supplied, which
  the users can access or make adjustments to. The module then goes on to span the "entire" solution space using methods such as RK2 or RK4 along the positive and the negative directions.
  During this process, the stepped values at various points of the differential equation are stored into a sorted Cache, which is expected to have a log(n) access and storage time.
  
* The time complexity of such a computation is O(_mn_) for a *n*th order differential equation that has a total time step of _m_.

* Pendulum has implemented three types of solvers, using Euler’s method, RK2, and RK4 (Runge Kutta method) respectively. Euler’s method uses a single step during each time increment and
  its error increases by O(δ^2). RK2 uses 2 recursive steps in each time increment, performing a second order Taylor Approximation from each starting point, while RK4 uses 4 recursive 
  steps per time increment, and performs a 4th order Taylor Approximation. The error of the methods are O(δ^3) and O(δ^5) respectively.  
  ![img_11.png](img_11.png)  
  
* High order differentiated terms shall be written as for example \diff{y, [x,2]}, which states that y is differentiated in terms of x twice. When resolving the statement trees, differentiated
  terms of the highest order of **undefined variables** are prioritized as candidates for evaluation targets. In normal cases of ODE, it is recommended that the differentiated term of the hightest
  order gets placed at one side of the expression, and all the rest gets subtracted or moved to the other side. This is because during actual computation processes, only the highest term gets 
  evaluated based on the rest of the expression, while all the lower-order differentiation terms iterate their value out of the initial conditions.

* In an ODE or PDE, if the highest order differential term is mixed up with the rest of the equations, it is still identified as the evaluation target. Core will use iterated gradient descent to try
  to find the value of the differential term by solving unknowns. This will slow down the computation of the ODE/PDE, which is why unless the differential equation is 
  necessarily implicit, it is recommended that the highest order differential term gets specified explicitly.
  ![img_10.png](img_10.png)
## UI
Short for user interface, the section on the left of the software window for user inputs and providing feedbacks. The updates made by users on the user interface will be sent to the Core
through asynchronous hooks.
### Loading
Many dynamic functionalities of the UI need to be realized by javascript. The UI module serves as the centralized location
for the management of the entire user interface. After the initialization call back from jQuery, Pendulum will 
invoke the load() function of the UI. Note that UI is a "static" access module, reflecting that there is only one window,
namely the browser page that is under management. The load function call then invokes a sequence of loading of HTML components
of the UI, including:
* loadDragBar();
* loadTags();
* loadShelves();
* linkNameDefControls();
* loadDefSettingsBtn();
* ...

After this sequence is invoked, the UI will be completely up and running.
### Definition
![img_12.png](img_12.png)
The pair of statement field and its corresponding label field that allows users to define variables.  
#### Label Field
The label field to the left of the statement field accepts a single LaTeX letter (with subscripts). The letter is the label for the statement,
denoting the very variable that the user is trying to define using the entire math statement, which the Core will then try to extract. If the label
is not specified by the user, the Core will read the statement and try to read the user's intent. A suggestive label will be posted on the same field
with a light gray color.
#### Statement Field
The LaTeX field on the right is dedicated to user inputs of long mathematical expressions. Expressions entered here will be parsed into
statement trees to reflect the hierarchical structure inside computation, and then interpreted by Core into pi-scripts.


### Parser
A very important sub-module of UI that will serve the function of converting user inputs into statement trees. The reading of individual TeX commands relies
on a finite state machine combined with a macro dictionary. The conversion of the linear command list into the statement tree is then to be performed recursively.
This is the first and essential step for Pendulum to break down and fully comprehend the mathematical expressions typed in by users. For a more detailed break down
of the mechanisms behind parser, see the section on parsing.

### Progress bar

### Slider

### Multi-var slider
High dimensional slider for grouped operations on variables. Potentially going to be implemented inside canvas in some future time.

### Hint
The text underneath fields that reveal the variable's state in core.
### Pi-script fields
Fields for editing of pi-scripts.

### Group structure

## Parsing
Parsing of information rich mathematical expressions written in LaTeX into structured, machine-readable statement trees involves so much technicalities and details 
that the principles of parsing deserves a section on its own. In this section, we will introduce the steps through which the original TeX gets broken down and
converted, as well as the algorithms that run in them. We will also explain the various class structures utilized during the construction of statements.

### Linear Parsing
Linear parsing is the first step in making sense of the user-typed TeX. The raw TeX expressions looks something like this: `\frac{dy}{dx}-x^2e^{ix}=y-x`.
The linear parsing is expected to take a raw string of TeX, read it in character by character, and come up with a linear regrouping where each element in the list
corresponds to either a parsed symbol, a parsed operator, or a number, that honestly reflect the original expression in the order in which it came in. In accordance
to the example above, we would expect something like: `[frac, d{x}, d{y}, -, $x, ^, 2, invisTimes, e, ^, {, i, invisTimes, $x, }, =, $y, -, $x]` as the output.
This is called a **Token List** that the program keeps track of, which will contain the final output of linear parsing upon its completion.
Sometimes the parsed results that gets output may look a bit more complicated than the original expression, despite roughly maintaining the original orders.
In fact, to achieve this, a certain level of knowledge of what each operator represents is required, this is where the power of finite state machines come in.

#### Finite state machine
The scheme of a finite state machine, although often used as a paradigm representation of universal computations, actually turns out to be extremely useful when 
we try to comprehend code strings by reading them character by character. The key concept is that the program will keep track of, besides the current character 
being read, an additional variable called the **state**. This state helps the program "remember" what it has just read in,
and enables it to develop comprehensions of complex syntax. Each time a new character gets inputted, the program responds to the combination of the state and the 
character by taking actions such as adding an operator to the list or modifying the internal state.  
![img_13.png](img_13.png)
In practice, the state that the program manipulates is held in a macro dictionary. The macro dictionary has a tree structure consisting of maps, 
where the top level map contains entry points to various TeX symbols, especially `'\'`, which serves as the entry
point to a lot of TeX commands such as '\cos' or '\frac'. Initially, the state holds the entire macro dictionary. On recognition of a match with one of the top
entries of the macro dictionary, the state immediately changes to hold the subtree led by that symbol. By traversing down the tree, the program will eventually 
reach a leaf that contains the corresponding keyword for the command and returns it. Note that multiple commands can map to the same operator. For example, if 
`'\div'` was one of the commands encountered, it will end up returning the operator keyword `'divide'`. If the program encounters `'\frac'`, it will also return 
the operator keyword `divide`. 
#### The Token class
The parsed keywords will be enclosed in Token objects. The class contains fields:
```typescript
class Token{
    type: string;
    name: string;
    subClauses: string[][];
}
```
The type can either be a variable `$`, operator `operator`, constant `#`, or structure `structure`.
Sub-clauses will contain lists of symbols that are parsed subclauses of a large operator. 
One can imagine encountering something like `\sum_{n=1}^{20^5}`, for which `[[$n, =, 1],[20, ^, 5]]` will become the value of its field.

In this documentation, we refer to the Token objects based on their types, for
- number, we just write the number itself, e.g. `20`,
- variable, we write the name of the variable with a `$` in front, e.g. `$y`,
- operator, we simply write the name the operator corresponds to, e.g. `sin`,
- large operator, these are operators that contains sub-clauses, we refer to them along with their sub-clause contents:
  `sum[[$n, =, 1],[20, ^, 5]]`.
  
The **TeX lists** are lists of TeX objects.

#### Parse stack for large operators
With the case of certain large operators, such as `'\int'` and `'\sum'`, their parsing do not simply terminate after their keywords. The `'\int'` operator
asks for the lower bound and the upper bound of the integration in the form of `'_{expression1}^{expression2}'`, both of which can be full expressions in TeX 
requiring additional parsing. In these circumstances the parser will enter into the clauses of an operator, and additional TeX objects
are to be read into the parent operator, instead of the root level list.  

To achieve this, an additional variable, the **parse stack** is kept in the parser. Once a large operator requiring a particular format is encountered, such as `\sum` expecting `_{...}^{...}`, the formats are pushed into the stack as
`[_,{,},^,{,}]`, with the left open brackets `{` associated with the corresponding subclauses as the output location, and the right bracket `}` with the 
previous output location that the program shall revert to once exiting the sub-clause. The format characters are popped from the stack when encountered in the TeX string,
when the stack becomes empty, the parse location defaults to the root list. To avoid mismatches, all encountering of the left bracket symbol inside TeX will push a right 
bracket into the stack.

The additional use of parse stack is for checking syntax errors. Whenever tokens of the type _'openstruct'_ is encountered, that means some left-parenthesis-like operator in the expression have been met, 
and its corresponding representation is pushed into the parse stack. If the parser encounters tokens of the type _'closestruct'_, it likewise checks for the matching representation from the 
parse stack, and pops it if found --- if it does not manage to find any matching representation inside the parse stack, that corresponds to an unclosed parenthesis and a parse error is thrown at the location of the 
opening bracket, indicating an unmatched parenthesis. Likewise, if at the end of the TeX string, there are still items in the parse stack, the same parsing error will also be thrown. The last item left in 
the parse stack is a termination token, used specially when the linParse function is called recursively to terminate a tex string parsing before it has been exhausted. For the root level recursion, a $ symbol
is appended at its end that signals the termination of the entire TeX string.

#### The invisible multiplication
A special rule needs to be take note of, that is whenever two variables, or a variable and a named operator are placed back-to-back, an invisible
multiplication operator `invisDot` is inserted into the TeX list. The only difference between`invisDot` and `dot` is that it assumes a slightly higher 
associativity in certain situations.

### Node parsing
Node parsing is the process through which the output of the previous step, a TeX object list, gets interpreted and collapsed into a statement tree.
The container of the output here is a **SymNode**:
```javascript
class SymNode{
    children: SymNode[];
    symbol: string|number;
    type: ['$', '#', 'operator'];
}
```
which is capable of recursively nesting expressions. We abbreviate the SymNodes with their symbol in front and their children contained in brackets.
The statement tree holds the root SymNode. The statement tree is expected to 
contain the expression in the order that it is to be computed, that is, expressions with the highest associativity get computed first, and 
those with the lowest associativity gets computed last. So, it would not be surprising to see expressions with plus signs end up with `plus` as the
root node of its statement tree.

For example, a convoluted expression like `\sin y \int_{10}^{12} e^x dx = 15^{2\cos x}` will get parsed into
`[sin, $y, int[[10],[12]], (, e, ^, x, invisDot, d[[$x]], ), =, 15, ^, {, 2, invisDot, cos, $x}]`. After the recursive parsing, the expected output 
would be:
```
={
     *{
         sin{$y},
         int{
             10, 
             12, 
             ^{e, $x}, 
             d{$x}
         }
     }, 
     ^{
         15, 
         *{
            2, 
            cos{$x}
         }
     }
}
```

The way to achieve this kind of parsing is by resolving the associativity of each of the symbols, and reordering the variables, constants
and operators.
#### Shunting yard algorithm
An enhanced version of the shunting yard algorithm will be utilized for the task of recursive parsing. The key idea behind it is that
all operators would yield a number, so would all the numbers and variables. But depending on the associativity, an operator may act on 
variables to its vicinity, or wait until other operators within its vicinity to compute first, and, depending on whether that operator is to its 
left or to its right, if the operator is to its left, it shall be popped from the stack into the list, allowing it to be computed, or if
that operator is to its right, this operator shall be placed into the stack, awaiting the operator to its left to be executed first, which by itself
may need to wait for the operator further to its right to act on its vicinities. 
![img_31.png](img_31.png)
Because the shunting yard is based on a stack structure, it follows the order of last in, first out. Because in an expression operators with higher associativity takes precedence
in terms of evaluation, upon comparison between the first element of the remaining token list and the top of the shunting yard, if the top has higher associativity than the first
it will be popped and added to the RPN, or else first will be pushed into the shunting yard, making it the new top, effectively maintaining the order of the shunting yard
such that operators with higher associativity are always closer to the top of the stack. By this order, the program can effectively make the 
operation that comes later with higher associativity in the expression to be the one that gets executed first. Under this reordering mechanism, and on the premise that each operator will
act on numbers to its direct vicinity, or on operators with the next up associativity to its vicinity (that eventually yields numbers after their operation is done),
the shunting yard algorithm generates an RPN that has effectively the same evaluation order as that of the mathematical expression dictates. 

Once an operator is popped from the stack, it is to be met with the previous terms at its immediate vicinity in the RPN list. The operator is then 
to collapse with the number of operands that it expects and instantiates a new SymNode object in its place. That is to say, after the tokens are pushed into the RPN list,
they are not kept in their position as in a conventional RPN, but are collapsed in an order that the expression can correctly be executed. After this chained collapsing,
a properly defined mathematical expression should always yield a single SymNode as the root to all other SymNodes in the RPN list. The resultant statement tree is more 
posed for the reflection of the structure and evaluation order of the expression than for direct evaluation. One can say that the statement tree captures the algebraic
"structure" of the expression, which makes it utilizable for the Core.

##### Comparing Associativity

The key advantage of the shunting yard algorithm is that it is able to sort out the executing expression of an expression in linear time, despite the
expression itself taking on complex structures of nested parenthesis and operators with varying associativity. Due to the diverse set of token types, 
from functions, operators, to numbers and so on, the associativity is no longer a singular value for each of the parenthesis. In the classical shunting
yard, if an operator, for example +, is compared to the operator `*`, whether the + comes before `*`, as that in `a+b*c`, or if it comes after, as that 
in `a*b+c`, it is always determined to be so that associativity of + is less than *, ensuring that * is always popped into the RPN before +.

In the program, if we have:
``` typescript
let remainingTokenList = [+, number3, ...];
let shuntingYard = [*, ...];
let RPN = [number1, number2];
```
Then by assigning associativity 1 to + and associativity 2 and *, we have:
``` typescript
if(+.associativity<*.associativity){
    while(first.associativity<shuntingYard.tpo.associativity)
        RPN.last = shuntingYard.pop();
    shuntingYard.push(+);
}else{
    shuntingYard.push(*);
}
```
and this is expected to yield correct behavior for expressions that involve operators that takes two operands at both of its sides, and operands made
out of only numbers.

However, as a counter example to this, if in our expression we encounter a token list:
`[..., 2, *, sin, 5, *, x]`, suppose we have read things in such that 

``` typescript
let remainingTokenList = [sin, 5, *, x];
let shuntingYard = [*, ...];
let RPN = [..., 2];
```
Now observe that we would want to evaluate sin, namely sin(5*x) first before multiplying that with 2. By the prevoius
logic, that means sin has a higher associativity than *, and hence sin will be pushed into the shunting yard, making:

``` typescript
let remainingTokenList = [ 5, *, x];
let shuntingYard = [sin, *, ...];
let RPN = [..., 2];
```
. Moving on, we read in the number 5, and pass it directly to the RPN, so that we have:
``` typescript
let remainingTokenList = [ *, x];
let shuntingYard = [sin, *, ...];
let RPN = [..., 2, 5];
```
And here is the problem, if we still went on with the assumption that sin has a higher associativity than *, then 
we would pop sin into the RPN and add * into the shunting yard, making:
``` typescript
let remainingTokenList = [x];
let shuntingYard = [*, *, ...];
let RPN = [..., 2, 5, sin];
```
as a result, the RPN will end up as `[..., 2, 5, sin, x, *, *, ...]`, effectively creating the execution order
`(...(2*(sin(5)*x)))`, but this is not what we wanted to specify. We actually wanted the `*` that comes after `sin`
to compute before `sin`, and we want the `*` that comes before `sin` to compute after everything inside the `sin` has been
computed. In fact, in general, there may not even be a partial ordering for all the operators and functions. What we have to 
do then, is to examine the associativity of the operators/functions on a case by case basis, and taking extra care to
differentiate the left/right order that two operators under comparison comes in with. In the above example, if `*` is to the _left_ of
`sin`, that is, if `*` is top and `sin` is first, `sin` has precedence over `*`. Otherwise, if `*` is to the _right_ of `sin`,
`*` has precedence over `sin`, and hence a higher associativity. That is to say, that operators do not only display left or right associativity when
they are compared to itself, in case of `^` and `^` for example, but also when they are compared to other 
operators/functions. This asks that we encase all the complexity of comparing different operators in a singular function 
`compareAssociativity(operator1, operator2):boolean //return "has higher associativity than"`, and changing the central clause of shunting yard
into:
``` typescript
if(+.associativity<*.associativity){
    while(!compareAssociativity(operator1, operator2))
        RPN.last = shuntingYard.pop();
    shuntingYard.push(+);
}else{
    shuntingYard.push(*);
}
```
To organize the comparison inside `compareAssociativity` in a reasonable manner, we can avoid writing n*n conditional clauses, where
n is the number of different types of operators and functions. We may instead create two lists of associativity rankings, called the 
**left association rank**, and the **right association rank**, so that upon comparison, a corresponding rank for `operator1` is retrieved,
and a rank for `operator2` is also retrieved, and the function correspondingly returns the comparison between these two ranks; that is to
say, until exceptions are encountered, and can be easily dealt with conditional checks, this implementation should be generally applicable
to the purpose of correctly ordering expressions.

_The other difference is that compared to conventional shunting yard parsing, the operators that we deal with might take on more than two operands,
or they might be of the type "function" that permits only one operand as its parameters. But as long as the operators are dealing with values
that are to its direct vicinity, and that the associativity between operators are correctly configured, there will be no problems or additional troubles 
that we need to go through in parsing them._

#### Additional SymNode Standards
```javascript
class SymNode{
    children: SymNode[];
    symbol: string|number;
    type: ['$', '#', 'operator', 'func$'];
}
```
Certain cases of more complicated types of definitions are worth going over. 

In particular, statement ```f\left(...\right)``` gets parsed 
into a 'func$' token with subclauses, under the condition that it is a stand-alone variable immediately followed by parenthesis. Depending on
the number of parameters, SymNode f should have the corresponding number of children taking the respective root of the parameters.

The large operand summation 'sum' in statement ```\sum_{x=1}^{12}\cos\left(x\right)+...``` gets parsed into two subclauses,
one corresponding to the lower bound specification, one for the upper bound, each holding a linear token list. The lower clause and
the upper clause should be syParsed respectively and collapsed into separate trees. The roots of the upper clause tree
and the lower clause tree shall go into the children of the SymNode representing 'sum', along with the root of the statement
that it is operating on. 'sum', aside from its clumsy definition body, should be treated somewhat like 'function' typed token
'sin', where the right associativity holds up until addition/subtractions.