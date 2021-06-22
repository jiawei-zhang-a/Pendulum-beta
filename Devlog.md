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
in the typescript files. With this fix, running `tsc` followed with `browserify` yields correctly functioning
es2015 codes. With the simple solution established, Gulp has been re-added to streamline and automate the build process.