## Developer log
A record for what have been accomplished in each development session
### Yuelong Li
#### 06/21
Experimented with a hello-world program of three with typescript. Successfully 
transpiled with tsc command and generated source mapping, but encountered problems when running the result on 
the browser. It turned out that the code generated was in commonjs standard and incompatible
with browsers. The modules weren't imported properly. Tried resolving the issue by using gulp,
but the import issue persisted, and the code still isn't runnable on browsers.

#### 06/22
While the issue persisted with importing, the general solutions on the internet weren't helping.
All the aforementioned modules such as Gulp and babelify that weren't creating any working solutions
were rage-deleted. After some digging, I realized that the imported code from "three/src/Three.js" file were in the 
es2015 standard instead of commonjs. However, in the other directory "three/build/three.js", the code was either
UMD or commonjs compatible, and can be directly imported as part of the `'three'` module
in the typescript files. With this fix, running `tsc` followed by `browserify` yields correctly functioning
es2015 codes. With the simple solution established, Gulp has been re-added to streamline and automate the build process.

#### 06/25
Setup source mapping for gulp build automation, and setup watch process with watchify, adopting from working solutions for the 
build process offered on typescript official site.

#### 07/03, 07/04
Conceptualized the "brain" of Pendulum, the Core module. It interacts with other parts of the software such as UI and Graphics by 
directly issuing them commands and queuing updates that will get executed asynchronously. It also hosts and closely monitors a 
virtual environment of mathematical variables and processes called the Environment module, the inner states of which can get extracted 
Core to be reflected via user interfaces. Environment runs on its own clock cycles which Core has access to for intervention or adjustments.
This is an important step toward a clearly defined architecture of Pendulum.

#### 07/09
Further designed the architecture of the Core module. Specified important mechanisms that Core.Env will use to construct the variable
dependencies and evaluate statement trees such as reference lists, contexts, and local variables.

#### 07/10
Finished specifications of key parts of Core, including reference list, context, function context, and statement resolutions.

#### 07/11
Put the previously designed html index page into work. Lined up imports of mathquill with the current project configuration. 
Changed ui.js into ui.ts and resolved all issues arising from the change. Currently mathquill visualization and typing is 
fully functioning on the UI panel, along with the rest of the pendulum user interface.

#### 07/12
Determined the conditions upon which a system of equations arises in place of the singled-out definitions for variables, namely
when cycles occur on the dependency graph of the variables. Designed algorithms for solving implicit definitions and systems of equations 
for Core. The algorithm's central idea is based on gradient descent.